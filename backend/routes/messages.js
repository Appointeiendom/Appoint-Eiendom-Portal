const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getMessages, sendMessage, getUnreadCount, getMaintenanceThreads } = require('../controllers/messageController');

router.get('/unread', protect, getUnreadCount);
router.get('/maintenance/threads', protect, getMaintenanceThreads);
// Maintenance thread: GET /api/messages/:issueId/maintenance/:maintenanceId
router.get('/:issueId/maintenance/:maintenanceId', protect, getMessages);
router.get('/:issueId', protect, getMessages);
router.post('/', protect, sendMessage);

module.exports = router;
