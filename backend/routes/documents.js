const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const Document = require('../models/Document');
const User = require('../models/User');
const { sendDocumentSMS } = require('../services/smsService');
const { sendDocumentEmail } = require('../services/emailService');

// GET /api/documents — admin sees all, tenant sees global + their own
router.get('/', protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'tenant') {
      query = { $or: [{ tenantId: null }, { tenantId: req.user._id }] };
    }
    const docs = await Document.find(query)
      .populate('tenantId', 'name unit building')
      .sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/documents/:id/file — serve PDF from MongoDB or redirect image to Cloudinary
router.get('/:id/file', async (req, res) => {
  try {
    // Include fileData (excluded by default) only for this route
    const doc = await Document.findById(req.params.id).select('+fileData');
    if (!doc) return res.status(404).json({ message: 'Not found' });

    if (!doc.fileType?.includes('pdf')) {
      return res.redirect(doc.fileUrl);
    }

    if (doc.fileData) {
      // New PDFs: stored as binary in MongoDB — serve directly
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.title)}.pdf"`);
      return res.send(doc.fileData);
    }

    // Legacy PDFs stored in Cloudinary — try redirecting to stored URL
    if (doc.fileUrl) {
      return res.redirect(doc.fileUrl);
    }

    res.status(404).json({ message: 'File data not found' });
  } catch (err) {
    console.error('[DOC FILE] error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/documents — admin uploads a document
router.post('/', protect, adminOnly, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const { title, tenantId } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const isPdf = req.file.mimetype === 'application/pdf';
    const doc = await Document.create({
      title,
      // PDFs: stored in MongoDB as buffer; images: Cloudinary URL
      fileUrl: isPdf ? null : req.file.path,
      cloudinaryId: isPdf ? null : (req.file.filename || null),
      fileData: isPdf ? req.file.buffer : undefined,
      fileType: req.file.mimetype,
      uploadedBy: req.user._id,
      tenantId: tenantId || null,
    });

    const populated = await Document.findById(doc._id).populate('tenantId', 'name unit building');

    // SMS + email notification
    if (tenantId) {
      const tenant = await User.findById(tenantId).select('phone email name');
      console.log('[DOC] specific tenant:', tenant?.email);
      if (tenant) {
        sendDocumentSMS(tenant, title).catch(e => console.error('[DOC SMS]', e.message));
        sendDocumentEmail(tenant, title, doc.fileUrl).catch(e => console.error('[DOC EMAIL]', e.message));
      }
    } else {
      const tenants = await User.find({ role: 'tenant', movedOutAt: null }).select('phone email name');
      console.log('[DOC] sending to', tenants.length, 'tenants:', tenants.map(t => t.email));
      for (const t of tenants) {
        sendDocumentSMS(t, title).catch(e => console.error('[DOC SMS]', e.message));
        sendDocumentEmail(t, title, doc.fileUrl).catch(e => console.error('[DOC EMAIL]', e.message));
      }
    }

    res.status(201).json(populated);
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
