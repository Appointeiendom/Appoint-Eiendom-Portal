const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const WasteReport = require('../models/WasteReport');

// GET /api/waste — admin sees all, tenant sees their own
router.get('/', protect, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { reportedBy: req.user._id };
    const reports = await WasteReport.find(filter)
      .populate('reportedBy', 'name unit building')
      .sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/waste — tenant submits a report
router.post('/', protect, (req, res, next) => {
  const ct = req.headers['content-type'] || '';
  if (ct.includes('multipart/form-data')) {
    upload.array('images', 3)(req, res, next);
  } else {
    next();
  }
}, async (req, res) => {
  try {
    const { location, description, anonymous } = req.body;
    if (!location || !description) return res.status(400).json({ message: 'Location and description are required' });
    const images = req.files ? req.files.map(f => f.path) : [];
    const report = await WasteReport.create({
      reportedBy: anonymous === 'true' || anonymous === true ? null : req.user._id,
      building: req.user.building,
      location,
      description,
      images,
      anonymous: anonymous === 'true' || anonymous === true,
    });
    res.status(201).json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/waste/:id — admin updates status/note
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const report = await WasteReport.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    if (status) report.status = status;
    if (adminNote !== undefined) report.adminNote = adminNote;
    await report.save();
    const updated = await WasteReport.findById(report._id).populate('reportedBy', 'name unit building');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/waste/:id — admin only
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await WasteReport.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
