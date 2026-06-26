const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const User = require('../models/User');
const { sendWelcomeEmail } = require('../services/emailService');

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
    const { name, email, unit, building, phone, password: customPassword, leaseStart, leaseEnd } = req.body;
    if (!name || !email || !unit) {
      return res.status(400).json({ message: 'Name, email and unit are required' });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    // Use custom password if provided, otherwise auto-generate
    const rawPassword = customPassword && customPassword.length >= 6
      ? customPassword
      : Math.random().toString(36).slice(-8) + 'A1!';

    const user = await User.create({
      name, email, password: rawPassword, role: 'tenant', unit, building, phone,
      leaseStart: leaseStart || null, leaseEnd: leaseEnd || null,
    });

    // Send welcome email in background (non-blocking)
    sendWelcomeEmail({ name, email, unit, building, phone }, rawPassword).catch(console.error);

    res.status(201).json({
      _id: user._id, name: user.name, email: user.email,
      role: user.role, unit: user.unit, building: user.building, phone: user.phone,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/users/:id (admin only — update tenant details)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, email, unit, building, phone } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (email && email !== user.email) {
      const exists = await User.findOne({ email });
      if (exists) return res.status(400).json({ message: 'Email already in use' });
      user.email = email;
    }
    if (name) user.name = name;
    if (unit !== undefined) user.unit = unit;
    if (building !== undefined) user.building = building;
    if (phone !== undefined) user.phone = phone;
    if (req.body.leaseStart !== undefined) user.leaseStart = req.body.leaseStart || null;
    if (req.body.leaseEnd !== undefined) user.leaseEnd = req.body.leaseEnd || null;
    await user.save();
    res.json({ _id: user._id, name: user.name, email: user.email, role: user.role, unit: user.unit, building: user.building, phone: user.phone, photo: user.photo, leaseStart: user.leaseStart, leaseEnd: user.leaseEnd });
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
    await user.save();
    res.json({ isActive: user.isActive });
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

// GET /api/users (admin only - list all tenants)
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({ role: 'tenant' }).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
