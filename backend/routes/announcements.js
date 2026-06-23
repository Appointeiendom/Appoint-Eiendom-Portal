const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const Announcement = require('../models/Announcement');
const User = require('../models/User');
const { sendAnnouncementEmail } = require('../services/emailService');

// GET /api/announcements — all users can read
router.get('/', protect, async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 }).limit(20);
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/announcements — admin only, emails all tenants
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { title, body } = req.body;
    if (!title || !body) return res.status(400).json({ message: 'Title and body are required' });

    const tenants = await User.find({ role: 'tenant' }).select('email name');
    const announcement = await Announcement.create({ title, body, sentBy: req.user._id, sentToCount: tenants.length });

    // Email all tenants in background
    sendAnnouncementEmail(tenants, title, body).catch(console.error);

    res.status(201).json(announcement);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/announcements/:id — admin only
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
