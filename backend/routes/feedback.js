const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const Feedback = require('../models/Feedback');

// POST /api/feedback — tenant submits feedback
router.post('/', protect, async (req, res) => {
  try {
    const { rating, message, category } = req.body;
    if (!rating || !message) return res.status(400).json({ message: 'Rating and message are required' });
    const feedback = await Feedback.create({
      tenantId: req.user._id,
      rating,
      message,
      category: category || 'general',
    });
    const populated = await Feedback.findById(feedback._id).populate('tenantId', 'name unit building');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/feedback — admin gets all feedback
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const feedback = await Feedback.find()
      .populate('tenantId', 'name unit building')
      .sort({ createdAt: -1 });
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/feedback/:id/read — mark as read
router.put('/:id/read', protect, adminOnly, async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true })
      .populate('tenantId', 'name unit building');
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/feedback/:id — admin deletes feedback
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Feedback.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
