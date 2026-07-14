const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { upload, cloudinary } = require('../config/cloudinary');
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

// GET /api/documents/:id/file — redirect to signed Cloudinary URL for PDFs
router.get('/:id/file', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });

    if (!doc.fileType?.includes('pdf')) {
      return res.redirect(doc.fileUrl);
    }

    // Derive public_id: prefer stored cloudinaryId, otherwise parse from URL
    let publicId = doc.cloudinaryId;
    if (!publicId && doc.fileUrl) {
      const match = doc.fileUrl.match(/\/raw\/upload\/(?:v\d+\/)?(.+)$/);
      if (match) publicId = match[1];
    }

    console.log('[DOC FILE] publicId:', publicId);
    console.log('[DOC FILE] fileUrl:', doc.fileUrl);

    if (publicId) {
      // Generate a time-limited signed URL — browser accesses Cloudinary directly, no proxy
      const signedUrl = cloudinary.url(publicId, {
        resource_type: 'raw',
        type: 'upload',
        sign_url: true,
        secure: true,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      });
      console.log('[DOC FILE] signed URL generated, redirecting');
      return res.redirect(signedUrl);
    }

    console.log('[DOC FILE] no publicId, redirecting to stored URL');
    return res.redirect(doc.fileUrl);
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

    const doc = await Document.create({
      title,
      fileUrl: req.file.path,
      cloudinaryId: req.file.filename || null,
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
