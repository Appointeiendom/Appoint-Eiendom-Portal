const Issue = require('../models/Issue');
const User = require('../models/User');
const { sendNewIssueEmail, sendStatusChangeEmail, sendTenantConfirmationEmail, sendTenantStatusEmail, sendResponsibilityEmail } = require('../services/emailService');
const { sendIssueStatusSMS } = require('../services/smsService');

// GET /api/issues
const getIssues = async (req, res) => {
  try {
    const { status, category, search, tenant } = req.query;
    const filter = {};

    if (req.user.role === 'tenant') filter.tenantId = req.user._id;
    if (req.user.role === 'maintenance') filter.assignedTo = req.user._id;

    if (status) filter.status = status;
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
      .populate('assignedTo', 'name trade')
      .sort({ createdAt: -1 });

    res.json(issues);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/issues
const createIssue = async (req, res) => {
  try {
    const { title, description, category } = req.body;
    if (!title || !description || !category) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const images = req.files ? req.files.map((f) => f.path) : [];

    const issue = await Issue.create({
      tenantId: req.user._id,
      title,
      description,
      category,
      unit: req.user.unit,
      building: req.user.building,
      images,
    });

    const populated = await issue.populate('tenantId', 'name email unit building');

    sendNewIssueEmail(populated, req.user);
    sendTenantConfirmationEmail(populated, req.user);

    if (req.io) req.io.emit('new_issue', populated);

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
      .populate('resolvedBy', 'name')
      .populate('assignedTo', 'name trade photo');

    if (!issue) return res.status(404).json({ message: 'Issue not found' });

    if (req.user.role === 'tenant' && issue.tenantId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (req.user.role === 'maintenance' && issue.assignedTo?._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(issue);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/issues/:id — admin or assigned maintenance worker
const updateIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Issue not found' });

    // Tenant can only update status on their own issue
    if (req.user.role === 'tenant') {
      if (issue.tenantId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    // Maintenance can only update status on their assigned issue
    if (req.user.role === 'maintenance') {
      if (issue.assignedTo?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not assigned to this issue' });
      }
    }

    const { status, internalNotes, category, assignedTo } = req.body;
    const prevStatus = issue.status;

    if (status) issue.status = status;
    if (internalNotes !== undefined) issue.internalNotes = internalNotes;
    if (category && req.user.role === 'admin') issue.category = category;
    if (assignedTo !== undefined && (req.user.role === 'admin' || req.user.role === 'tenant')) {
      issue.assignedTo = assignedTo || null;
    }

    if (status === 'resolved' && prevStatus !== 'resolved') {
      issue.resolvedAt = new Date();
      issue.resolvedBy = req.user._id;
    }

    await issue.save();
    const updated = await Issue.findById(issue._id)
      .populate('tenantId', 'name email unit building phone')
      .populate('resolvedBy', 'name')
      .populate('assignedTo', 'name trade photo');

    if (status && status !== prevStatus) {
      sendStatusChangeEmail(updated, updated.tenantId, req.user);
      sendTenantStatusEmail(updated, updated.tenantId);
      sendIssueStatusSMS(updated.tenantId, updated).catch(console.error);
      if (req.io) req.io.to(`issue:${issue._id}`).emit('issue_updated', updated);
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

// PUT /api/issues/:id/responsibility (admin only)
const setResponsibility = async (req, res) => {
  try {
    const { responsibility } = req.body;
    if (!['landlord', 'tenant'].includes(responsibility)) {
      return res.status(400).json({ message: 'responsibility must be "landlord" or "tenant"' });
    }

    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Issue not found' });

    issue.responsibility = responsibility;
    await issue.save();

    const updated = await Issue.findById(issue._id)
      .populate('tenantId', 'name email unit building phone')
      .populate('resolvedBy', 'name')
      .populate('assignedTo', 'name trade photo');

    if (responsibility === 'tenant') {
      sendResponsibilityEmail(updated, updated.tenantId).catch(console.error);
      if (req.io) req.io.to(`issue:${issue._id}`).emit('issue_updated', updated);
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/issues/:id/rate — tenant rates the maintenance worker after resolution
const rateIssue = async (req, res) => {
  try {
    const { rating, ratingComment } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be 1–5' });

    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Issue not found' });
    if (issue.tenantId.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Access denied' });
    if (issue.status !== 'resolved') return res.status(400).json({ message: 'Can only rate resolved issues' });
    if (!issue.assignedTo) return res.status(400).json({ message: 'No maintenance worker assigned' });

    issue.rating = rating;
    issue.ratingComment = ratingComment || '';
    await issue.save();

    const updated = await Issue.findById(issue._id)
      .populate('tenantId', 'name email unit building phone')
      .populate('resolvedBy', 'name')
      .populate('assignedTo', 'name trade photo');

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getIssues, createIssue, getIssue, updateIssue, deleteIssue, setResponsibility, rateIssue };
