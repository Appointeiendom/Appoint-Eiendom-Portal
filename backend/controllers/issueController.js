const Issue = require('../models/Issue');
const User = require('../models/User');
const { sendNewIssueEmail, sendStatusChangeEmail, sendTenantConfirmationEmail, sendTenantStatusEmail } = require('../services/emailService');

// GET /api/issues
const getIssues = async (req, res) => {
  try {
    const { status, priority, category, search, tenant } = req.query;
    const filter = {};

    // Tenants only see their own issues
    if (req.user.role === 'tenant') filter.tenantId = req.user._id;

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (tenant && req.user.role === 'admin') {
      const tenantUser = await User.findOne({ name: { $regex: tenant, $options: 'i' } });
      if (tenantUser) filter.tenantId = tenantUser._id;
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const issues = await Issue.find(filter)
      .populate('tenantId', 'name email unit building phone')
      .populate('resolvedBy', 'name')
      .sort({ createdAt: -1 });

    res.json(issues);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/issues
const createIssue = async (req, res) => {
  try {
    const { title, description, category, priority } = req.body;
    if (!title || !description || !category || !priority) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const images = req.files ? req.files.map((f) => f.path) : []; // f.path is the Cloudinary URL

    const issue = await Issue.create({
      tenantId: req.user._id,
      title,
      description,
      category,
      priority,
      unit: req.user.unit,
      building: req.user.building,
      images,
    });

    const populated = await issue.populate('tenantId', 'name email unit building');

    // Send email notification (non-blocking)
    sendNewIssueEmail(populated, req.user);
    sendTenantConfirmationEmail(populated, req.user);

    // Notify all admins via socket
    if (req.io) {
      req.io.emit('new_issue', populated);
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/issues/:id
const getIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate('tenantId', 'name email unit building phone')
      .populate('resolvedBy', 'name');

    if (!issue) return res.status(404).json({ message: 'Issue not found' });

    // Tenants can only view their own issues
    if (req.user.role === 'tenant' && issue.tenantId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(issue);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/issues/:id  (admin only)
const updateIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Issue not found' });

    const { status, internalNotes, priority, category } = req.body;
    const prevStatus = issue.status;

    if (status) issue.status = status;
    if (internalNotes !== undefined) issue.internalNotes = internalNotes;
    if (priority) issue.priority = priority;
    if (category) issue.category = category;

    if (status === 'resolved' && prevStatus !== 'resolved') {
      issue.resolvedAt = new Date();
      issue.resolvedBy = req.user._id;
    }

    await issue.save();
    const updated = await Issue.findById(issue._id)
      .populate('tenantId', 'name email unit building phone')
      .populate('resolvedBy', 'name');

    // Send email on status change
    if (status && status !== prevStatus) {
      sendStatusChangeEmail(updated, updated.tenantId, req.user);  // notify admin
      sendTenantStatusEmail(updated, updated.tenantId);             // notify tenant
      // Notify specific tenant via socket
      if (req.io) {
        req.io.to(`issue:${issue._id}`).emit('issue_updated', updated);
      }
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/issues/:id  (admin only)
const deleteIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Issue not found' });
    await issue.deleteOne();
    res.json({ message: 'Issue deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getIssues, createIssue, getIssue, updateIssue, deleteIssue };
