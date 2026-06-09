const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getStats,
  getByPriority,
  getByStatus,
  getByCategory,
} = require('../controllers/dashboardController');

router.get('/stats', protect, getStats);
router.get('/issues-by-priority', protect, getByPriority);
router.get('/issues-by-status', protect, getByStatus);
router.get('/issues-by-category', protect, getByCategory);

module.exports = router;
