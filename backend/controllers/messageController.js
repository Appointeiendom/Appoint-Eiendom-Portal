const Message = require('../models/Message');
const Issue = require('../models/Issue');
const mongoose = require('mongoose');

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
    let filter = { isRead: false };
    if (req.user.role === 'tenant') {
      const userIssueIds = await Issue.distinct('_id', { tenantId: req.user._id });
      filter.issueId = { $in: userIssueIds };
      filter.senderRole = 'admin';
    } else if (req.user.role === 'admin') {
      filter.senderRole = 'tenant';
    }
    const count = await Message.countDocuments(filter);
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/messages/maintenance/threads
// maintenance worker: returns all their threads across all issues
// admin: requires ?issueId=xxx, returns all maintenance threads for that issue
const getMaintenanceThreads = async (req, res) => {
  try {
    const { issueId: filterIssueId } = req.query;
    const isAdmin = req.user.role === 'admin';

    if (isAdmin && !filterIssueId) return res.json([]);

    const matchFilter = isAdmin
      ? { issueId: mongoose.Types.ObjectId.createFromHexString(filterIssueId), maintenanceId: { $ne: null } }
      : { maintenanceId: req.user._id };

    const threads = await Message.aggregate([
      { $match: matchFilter },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: { issueId: '$issueId', maintenanceId: '$maintenanceId' },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [{ $and: [{ $eq: ['$senderRole', 'tenant'] }, { $eq: ['$isRead', false] }] }, 1, 0],
            },
          },
        },
      },
      {
        $lookup: {
          from: 'issues',
          localField: '_id.issueId',
          foreignField: '_id',
          as: 'issue',
        },
      },
      { $unwind: '$issue' },
      {
        $lookup: {
          from: 'users',
          localField: 'issue.tenantId',
          foreignField: '_id',
          as: 'issue.tenantId',
          pipeline: [{ $project: { name: 1, email: 1, unit: 1, building: 1 } }],
        },
      },
      { $unwind: { path: '$issue.tenantId', preserveNullAndEmptyArrays: true } },
      { $sort: { 'lastMessage.createdAt': -1 } },
    ]);

    res.json(threads.map(t => ({
      issue: t.issue,
      maintenanceId: t._id.maintenanceId,
      lastMessage: t.lastMessage,
      unreadCount: t.unreadCount,
    })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getMessages, sendMessage, getUnreadCount, getMaintenanceThreads };
