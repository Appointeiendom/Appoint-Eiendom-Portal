const Issue = require('../models/Issue');

// GET /api/dashboard/stats
const getStats = async (req, res) => {
  try {
    const filter = req.user.role === 'tenant' ? { tenantId: req.user._id } : {};

    const [total, open, inProgress, resolved] = await Promise.all([
      Issue.countDocuments(filter),
      Issue.countDocuments({ ...filter, status: 'open' }),
      Issue.countDocuments({ ...filter, status: 'in-progress' }),
      Issue.countDocuments({ ...filter, status: 'resolved' }),
    ]);

    // Issues this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const thisMonth = await Issue.countDocuments({ ...filter, createdAt: { $gte: startOfMonth } });

    res.json({ total, open, inProgress, resolved, thisMonth });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/dashboard/issues-by-priority
const getByPriority = async (req, res) => {
  try {
    const match = req.user.role === 'tenant' ? { tenantId: req.user._id } : {};
    const data = await Issue.aggregate([
      { $match: match },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/dashboard/issues-by-status
const getByStatus = async (req, res) => {
  try {
    const match = req.user.role === 'tenant' ? { tenantId: req.user._id } : {};
    const data = await Issue.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/dashboard/issues-by-category
const getByCategory = async (req, res) => {
  try {
    const data = await Issue.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getStats, getByPriority, getByStatus, getByCategory };
