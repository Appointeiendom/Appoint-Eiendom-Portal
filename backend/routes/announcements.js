const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const Announcement = require('../models/Announcement');
const User = require('../models/User');
const { sendAnnouncementEmail } = require('../services/emailService');
const { sendAnnouncementSMS } = require('../services/smsService');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/announcements — filtered by tenant's building if applicable
router.get('/', protect, async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'tenant' && req.user.unit) {
      // Show announcements targeted to their building address or all (null)
      filter = { $or: [{ building: null }, { building: { $regex: new RegExp(`^${escapeRegex(req.user.unit.trim())}$`, 'i') } }] };
    }
    const announcements = await Announcement.find(filter).sort({ createdAt: -1 }).limit(50);
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/announcements/buildings — list of unique tenant buildings for targeting
router.get('/buildings', protect, adminOnly, async (req, res) => {
  try {
    const raw = await User.distinct('unit', { role: 'tenant', unit: { $nin: [null, ''] } });
    // Deduplicate case-insensitively, keep the first-seen casing
    const seen = new Map();
    for (const u of raw) { const key = u.trim().toLowerCase(); if (!seen.has(key)) seen.set(key, u.trim()); }
    res.json([...seen.values()].sort());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/announcements — admin only
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { title, body, building } = req.body;
    if (!title || !body) return res.status(400).json({ message: 'Title and body are required' });

    const tenantFilter = { role: 'tenant' };
    if (building) tenantFilter.unit = { $regex: new RegExp(`^${escapeRegex(building.trim())}$`, 'i') };

    const tenants = await User.find(tenantFilter).select('email name phone');
    const announcement = await Announcement.create({
      title, body,
      sentBy: req.user._id,
      sentToCount: tenants.length,
      building: building || null,
    });

    sendAnnouncementEmail(tenants, title, body).catch(console.error);
    sendAnnouncementSMS(tenants, title).catch(console.error);

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
