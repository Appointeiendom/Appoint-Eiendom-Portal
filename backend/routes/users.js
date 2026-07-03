const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const { protect, adminOnly } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const User = require('../models/User');
const Building = require('../models/Building');
const { sendWelcomeEmail } = require('../services/emailService');

const memUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Resolves buildingId+apartmentId into unit/building strings
async function resolveBuilding(buildingId, apartmentId) {
  if (!buildingId || !apartmentId) return {};
  const b = await Building.findById(buildingId);
  if (!b) return {};
  const apt = b.apartments.id(apartmentId);
  if (!apt) return {};
  return { unit: b.name, building: apt.number, buildingId: b._id, apartmentId: apt._id };
}

// POST /api/users/bulk-import — parse CSV/Excel and create tenant accounts
router.post('/bulk-import', protect, adminOnly, memUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];

    // Read as raw array-of-arrays so we can find the real header row
    const allRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // Recognised header keywords (Norwegian + English)
    const NAME_KEYS   = ['name','navn','leietaker','full name','fullname'];
    const EMAIL_KEYS  = ['email','e-mail','e-post','epost','gmail'];
    const PHONE_KEYS  = ['phone','telefon','mob','mobil','mobnr','mobnr.','mobile','phone number'];
    const ADDRESS_KEYS= ['address','adresse'];
    const UNIT_KEYS   = ['unit','leil. nr.','leil.nr.','leilighet','enhet','apartment','apt','leil nr'];

    const normalize = s => String(s || '').toLowerCase().trim().replace(/\.$/, '');

    // Find the row index that contains recognisable column headers
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(allRows.length, 10); i++) {
      const cells = allRows[i].map(normalize);
      const hasEmail = cells.some(c => EMAIL_KEYS.includes(c));
      const hasName  = cells.some(c => NAME_KEYS.includes(c));
      if (hasEmail || hasName) { headerRowIdx = i; break; }
    }

    const headers = allRows[headerRowIdx].map(normalize);
    const dataRows = allRows.slice(headerRowIdx + 1);

    if (!dataRows.length) return res.status(400).json({ message: 'File is empty or unreadable' });

    const getCol = (row, ...keys) => {
      for (const k of keys) {
        const idx = headers.findIndex(h => h === k || h.startsWith(k));
        if (idx !== -1 && String(row[idx] || '').trim()) return String(row[idx]).trim();
      }
      return '';
    };

    const created = [], skipped = [], errors = [];

    for (const row of dataRows) {
      // Skip fully empty rows
      if (row.every(c => !String(c).trim())) continue;

      const name    = getCol(row, ...NAME_KEYS);
      const email   = getCol(row, ...EMAIL_KEYS);
      const phone   = getCol(row, ...PHONE_KEYS);
      const address = getCol(row, ...ADDRESS_KEYS);
      const unitNo  = getCol(row, ...UNIT_KEYS);
      const unit    = address;
      const buildingVal = unitNo;

      if (!name || !email) { errors.push({ row: name || email || row.filter(Boolean).join(', '), reason: 'Missing name or email' }); continue; }
      if (!unit) { errors.push({ row: email, reason: 'Missing address (Adresse column)' }); continue; }

      const exists = await User.findOne({ email: email.toLowerCase() });
      if (exists) { skipped.push(email); continue; }

      // Find or create building by name/address
      let building = await Building.findOne({ name: { $regex: `^${unit}$`, $options: 'i' } });
      if (!building) building = await Building.create({ name: unit, address: unit });

      // Find or create apartment within building
      let apt = buildingVal
        ? building.apartments.find(a => a.number === String(buildingVal))
        : null;
      if (buildingVal && !apt) {
        building.apartments.push({ number: String(buildingVal) });
        await building.save();
        apt = building.apartments[building.apartments.length - 1];
      }

      const rawPassword = Math.random().toString(36).slice(-8) + 'A1!';
      await User.create({
        name, email: email.toLowerCase(), password: rawPassword, role: 'tenant',
        unit: building.name,
        building: apt ? apt.number : '',
        buildingId: building._id,
        apartmentId: apt ? apt._id : null,
        phone,
      });
      sendWelcomeEmail({ name, email: email.toLowerCase(), unit: building.name, building: apt?.number, phone }, rawPassword).catch(() => {});
      created.push({ name, email: email.toLowerCase(), unit: building.name, aptNumber: apt?.number });
    }

    res.json({ created, skipped, errors });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/profile
router.get('/profile', protect, (req, res) => res.json(req.user));

// PUT /api/users/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, phone, unit, building } = req.body;
    const user = await User.findById(req.user._id);
    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (unit) user.unit = unit;
    if (building !== undefined) user.building = building;
    await user.save();
    res.json({ _id: user._id, name: user.name, email: user.email, role: user.role, unit: user.unit, building: user.building, phone: user.phone });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/users  — admin creates a tenant account
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, email, phone, password: customPassword, leaseStart, leaseEnd, buildingId, apartmentId } = req.body;
    let { unit, building } = req.body;

    if (!name || !email) return res.status(400).json({ message: 'Name and email are required' });

    // If using building system, resolve unit/building from building doc
    if (buildingId && apartmentId) {
      const resolved = await resolveBuilding(buildingId, apartmentId);
      if (!resolved.unit) return res.status(400).json({ message: 'Invalid building or apartment' });
      unit = resolved.unit;
      building = resolved.building;
    }

    if (!unit) return res.status(400).json({ message: 'Unit/building is required' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const rawPassword = customPassword && customPassword.length >= 6
      ? customPassword
      : Math.random().toString(36).slice(-8) + 'A1!';

    const user = await User.create({
      name, email, password: rawPassword, role: 'tenant', unit, building, phone,
      leaseStart: leaseStart || null, leaseEnd: leaseEnd || null,
      buildingId: buildingId || null, apartmentId: apartmentId || null,
    });

    sendWelcomeEmail({ name, email, unit, building, phone }, rawPassword).catch(console.error);

    res.status(201).json({
      _id: user._id, name: user.name, email: user.email, role: user.role,
      unit: user.unit, building: user.building, phone: user.phone,
      buildingId: user.buildingId, apartmentId: user.apartmentId,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/users/:id (admin only — update tenant details)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, email, phone, buildingId, apartmentId } = req.body;
    let { unit, building } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (email && email !== user.email) {
      const exists = await User.findOne({ email });
      if (exists) return res.status(400).json({ message: 'Email already in use' });
      user.email = email;
    }
    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (req.body.leaseStart !== undefined) user.leaseStart = req.body.leaseStart || null;
    if (req.body.leaseEnd !== undefined) user.leaseEnd = req.body.leaseEnd || null;

    // If using building system, resolve unit/building
    if (buildingId && apartmentId) {
      const resolved = await resolveBuilding(buildingId, apartmentId);
      if (resolved.unit) {
        user.unit = resolved.unit;
        user.building = resolved.building;
        user.buildingId = resolved.buildingId;
        user.apartmentId = resolved.apartmentId;
      }
    } else {
      if (unit !== undefined) user.unit = unit;
      if (building !== undefined) user.building = building;
    }

    await user.save();
    res.json({ _id: user._id, name: user.name, email: user.email, role: user.role, unit: user.unit, building: user.building, phone: user.phone, photo: user.photo, leaseStart: user.leaseStart, leaseEnd: user.leaseEnd, buildingId: user.buildingId, apartmentId: user.apartmentId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/users/:id/toggle-active (admin only — expire or reactivate tenant)
router.put('/:id/toggle-active', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.isActive = !user.isActive;
    if (user.isActive) user.movedOutAt = null; // clear move-out when reactivating
    await user.save();
    res.json({ isActive: user.isActive });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/users/:id/moveout — mark tenant as moved out (keeps record, frees the unit)
router.put('/:id/moveout', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.isActive = false;
    user.movedOutAt = new Date();
    await user.save();
    res.json({ message: 'Tenant marked as moved out', movedOutAt: user.movedOutAt });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/users/:id/reset-password (admin only)
router.put('/:id/reset-password', protect, adminOnly, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.password = password; // pre-save hook will hash it
    await user.save();

    // Email tenant their new password
    const { sendWelcomeEmail } = require('../services/emailService');
    sendWelcomeEmail(
      { name: user.name, email: user.email, unit: user.unit },
      password
    ).catch(console.error);

    res.json({ message: 'Password updated and emailed to tenant' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/users/:id/photo (admin only — upload tenant profile photo)
router.put('/:id/photo', protect, adminOnly, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No photo uploaded' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.photo = req.file.path;
    await user.save();
    res.json({ photo: user.photo });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/users/:id/photo (admin only)
router.delete('/:id/photo', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.photo = null;
    await user.save();
    res.json({ message: 'Photo removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/users/:id (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/users/:id (admin only)
router.get('/:id', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/users (admin only - list tenants)
// ?status=moved_out  → former tenants only
// default           → active tenants only
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const filter = req.query.status === 'moved_out'
      ? { role: 'tenant', isActive: false, movedOutAt: { $ne: null } }
      : { role: 'tenant', isActive: true };
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
