const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const Document = require('../models/Document');
const User = require('../models/User');
const { sendDocumentSMS } = require('../services/smsService');

// GET /api/documents — admin sees all, tenant sees global + their own
router.get('/', protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'tenant') {
      query = { $or: [{ tenantId: null }, { tenantId: req.user._id }] };
    }
    const docs = await Document.find(query)
      .populate('tenantId', 'name')
      .sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/documents — admin uploads a document
router.post('/', protect, adminOnly, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const { title, tenantId } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });
    const doc = await Document.create({
      title,
      fileUrl: req.file.path,
      fileType: req.file.mimetype,
      uploadedBy: req.user._id,
      tenantId: tenantId || null,
    });

    // SMS notification
    if (tenantId) {
      const tenant = await User.findById(tenantId).select('phone name');
      if (tenant) sendDocumentSMS(tenant, title).catch(console.error);
    } else {
      // Notify all tenants
      const tenants = await User.find({ role: 'tenant' }).select('phone');
      for (const t of tenants) sendDocumentSMS(t, title).catch(console.error);
    }

    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/documents/:id — admin only
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
