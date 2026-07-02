const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const DirectMessage = require('../models/DirectMessage');
const User = require('../models/User');

// GET /api/direct — tenant/maintenance: their thread; admin: list of all threads
router.get('/', protect, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      // Return latest message per thread + unread count
      const threads = await DirectMessage.aggregate([
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: '$threadUserId',
            lastMessage: { $first: '$$ROOT' },
            unreadCount: {
              $sum: { $cond: [{ $and: [{ $eq: ['$senderRole', { $literal: 'tenant' } ] }, { $eq: ['$isRead', false] }] }, 1, 0] },
            },
          },
        },
        {
          $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user',
            pipeline: [{ $project: { name: 1, email: 1, role: 1, unit: 1, building: 1, photo: 1 } }] },
        },
        { $unwind: '$user' },
        { $sort: { 'lastMessage.createdAt': -1 } },
      ]);

      // Fix unreadCount — count messages NOT sent by admin
      const fixedThreads = await Promise.all(threads.map(async (th) => {
        const unreadCount = await DirectMessage.countDocuments({
          threadUserId: th._id, senderRole: { $ne: 'admin' }, isRead: false,
        });
        return { ...th, unreadCount };
      }));

      return res.json(fixedThreads);
    }

    // tenant / maintenance: get own thread
    const messages = await DirectMessage.find({ threadUserId: req.user._id }).sort({ createdAt: 1 });
    // mark admin messages as read
    await DirectMessage.updateMany({ threadUserId: req.user._id, senderRole: 'admin', isRead: false }, { isRead: true });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/direct/unread — unread count for current user
router.get('/unread', protect, async (req, res) => {
  try {
    let count;
    if (req.user.role === 'admin') {
      count = await DirectMessage.countDocuments({ senderRole: { $ne: 'admin' }, isRead: false });
    } else {
      count = await DirectMessage.countDocuments({ threadUserId: req.user._id, senderRole: 'admin', isRead: false });
    }
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/direct/:userId — admin only: get thread with a specific user
router.get('/:userId', protect, adminOnly, async (req, res) => {
  try {
    const messages = await DirectMessage.find({ threadUserId: req.params.userId }).sort({ createdAt: 1 });
    // mark non-admin messages in this thread as read
    await DirectMessage.updateMany({ threadUserId: req.params.userId, senderRole: { $ne: 'admin' }, isRead: false }, { isRead: true });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/direct — send a direct message
router.post('/', protect, async (req, res) => {
  try {
    const { message, toUserId } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: 'Message is required' });

    let threadUserId;
    if (req.user.role === 'admin') {
      if (!toUserId) return res.status(400).json({ message: 'toUserId required for admin' });
      threadUserId = toUserId;
    } else {
      threadUserId = req.user._id;
    }

    const msg = await DirectMessage.create({
      threadUserId,
      senderId: req.user._id,
      senderRole: req.user.role,
      senderName: req.user.name,
      message: message.trim(),
    });

    // Emit via socket if io is attached
    const io = req.io;
    if (io) {
      const payload = {
        _id: msg._id, threadUserId, senderId: req.user._id,
        senderRole: req.user.role, senderName: req.user.name,
        message: msg.message, isRead: false, createdAt: msg.createdAt,
      };
      io.to(`direct:${threadUserId}`).emit('direct_message', payload);
      // notify admin room too
      io.to('admin_direct').emit('direct_message', payload);
    }

    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
