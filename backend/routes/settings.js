const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const Settings = require('../models/Settings');
const { scheduleDigest } = require('../jobs/digestReminder');

router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const s = await Settings.getGlobal();
    res.json(s);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/', protect, adminOnly, async (req, res) => {
  try {
    const s = await Settings.getGlobal();
    if (req.body.welcomeEmailBody !== undefined) s.welcomeEmailBody = req.body.welcomeEmailBody;
    if (req.body.digestReminderTime !== undefined) {
      s.digestReminderTime = req.body.digestReminderTime;
      scheduleDigest(req.body.digestReminderTime);
    }
    await s.save();
    res.json(s);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
