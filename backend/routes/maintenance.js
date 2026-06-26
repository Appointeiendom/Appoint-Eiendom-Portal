const express = require('express');
const router = express.Router();
const { protect, adminOnly, maintenanceOnly } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const User = require('../models/User');
const { sendWelcomeEmail } = require('../services/emailService');

// GET /api/maintenance — list all maintenance companies (admin + tenant)
router.get('/', protect, async (req, res) => {
  try {
    const Issue = require('../models/Issue');
    const workers = await User.find({ role: 'maintenance' }).select('-password').sort({ name: 1 });

    const ratings = await Issue.aggregate([
      { $match: { assignedTo: { $ne: null }, rating: { $ne: null } } },
      { $group: { _id: '$assignedTo', avgRating: { $avg: '$rating' }, ratingCount: { $sum: 1 } } },
    ]);
    const ratingMap = Object.fromEntries(ratings.map(r => [r._id.toString(), r]));

    const result = workers.map(w => {
      const r = ratingMap[w._id.toString()];
      return { ...w.toObject(), avgRating: r ? Math.round(r.avgRating * 10) / 10 : null, ratingCount: r?.ratingCount || 0 };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/maintenance/by-trade/:trade — filtered list for tenants
router.get('/by-trade/:trade', protect, async (req, res) => {
  try {
    const workers = await User.find({ role: 'maintenance', trade: req.params.trade, isActive: true })
      .select('-password -email')
      .sort({ name: 1 });
    res.json(workers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/maintenance/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const worker = await User.findOne({ _id: req.params.id, role: 'maintenance' }).select('-password');
    if (!worker) return res.status(404).json({ message: 'Maintenance worker not found' });
    res.json(worker);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/maintenance — admin creates a maintenance worker (with optional photo)
router.post('/', protect, adminOnly, upload.single('photo'), async (req, res) => {
  try {
    const { name, email, trade, bio, phone, password: customPassword } = req.body;
    if (!name || !email || !trade) {
      return res.status(400).json({ message: 'Name, email and trade are required' });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const rawPassword = customPassword && customPassword.length >= 6
      ? customPassword
      : Math.random().toString(36).slice(-8) + 'M1!';

    const photoUrl = req.file?.path || null;

    const worker = await User.create({
      name, email, password: rawPassword, role: 'maintenance',
      trade, bio, phone, photo: photoUrl, availability: [],
    });

    sendWelcomeEmail({ name, email, unit: `Trade: ${trade}` }, rawPassword).catch(console.error);

    res.status(201).json({
      _id: worker._id, name: worker.name, email: worker.email,
      role: worker.role, trade: worker.trade, bio: worker.bio,
      phone: worker.phone, photo: worker.photo, availability: worker.availability,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/maintenance/:id — admin updates worker info + photo
router.put('/:id', protect, adminOnly, upload.single('photo'), async (req, res) => {
  try {
    const worker = await User.findOne({ _id: req.params.id, role: 'maintenance' });
    if (!worker) return res.status(404).json({ message: 'Worker not found' });

    const { name, trade, bio, phone } = req.body;
    if (name) worker.name = name;
    if (trade) worker.trade = trade;
    if (bio !== undefined) worker.bio = bio;
    if (phone !== undefined) worker.phone = phone;
    if (req.file?.path) worker.photo = req.file.path;

    await worker.save();
    res.json({ _id: worker._id, name: worker.name, trade: worker.trade, bio: worker.bio, phone: worker.phone, photo: worker.photo, availability: worker.availability });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// GET /api/maintenance/:id/jobs — completed jobs for a maintenance worker
router.get('/:id/jobs', protect, async (req, res) => {
  try {
    const Issue = require('../models/Issue');
    const Message = require('../models/Message');
    // Find issues this worker has been part of (via messages)
    const threadIssueIds = await Message.distinct('issueId', { maintenanceId: req.params.id });
    const issues = await Issue.find({ _id: { $in: threadIssueIds } })
      .populate('tenantId', 'name unit')
      .sort({ updatedAt: -1 })
      .select('title category status unit createdAt updatedAt rating ratingComment');
    res.json(issues);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/maintenance/:id (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Maintenance worker deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
