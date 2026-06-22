const Message = require('../models/Message');
const Issue = require('../models/Issue');

// GET /api/messages/:issueId  OR  /api/messages/:issueId/maintenance/:maintenanceId
const getMessages = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.issueId);
    if (!issue) return res.status(404).json({ message: 'Issue not found' });

    if (req.user.role === 'tenant' && issue.tenantId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const maintenanceId = req.params.maintenanceId || null;
    const filter = {
      issueId: req.params.issueId,
      maintenanceId: maintenanceId || null,
    };

    const messages = await Message.find(filter).sort({ createdAt: 1 });

    await Message.updateMany(
      { ...filter, senderRole: { $ne: req.user.role }, isRead: false },
      { isRead: true }
    );

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/messages  (REST fallback)
const sendMessage = async (req, res) => {
  try {
    const { issueId, message } = req.body;
    if (!issueId || !message?.trim()) {
      return res.status(400).json({ message: 'issueId and message are required' });
    }

    const issue = await Issue.findById(issueId);
    if (!issue) return res.status(404).json({ message: 'Issue not found' });

    if (req.user.role === 'tenant' && issue.tenantId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const msg = await Message.create({
      issueId,
      senderId: req.user._id,
      senderRole: req.user.role,
      senderName: req.user.name,
      message: message.trim(),
    });

    res.status(201).json(msg);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET unread count for a user
const getUnreadCount = async (req, res) => {
  try {
    const oppositeRole = req.user.role === 'tenant' ? 'admin' : 'tenant';
    const count = await Message.countDocuments({
      senderRole: oppositeRole,
      isRead: false,
      ...(req.user.role === 'tenant' ? {} : {}),
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getMessages, sendMessage, getUnreadCount };
