const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const User = require('../models/User');

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
