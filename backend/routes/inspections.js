const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { protect, adminOnly } = require('../middleware/auth');
const { cloudinary } = require('../config/cloudinary');
const Inspection = require('../models/Inspection');
const InspectionResponse = require('../models/InspectionResponse');
const User = require('../models/User');
const Building = require('../models/Building');
const { sendInspectionReminderEmail, sendInspectionRedoEmail, sendInspectionAssignedEmail } = require('../services/emailService');

const storage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'tenant-portal/inspections', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'], resource_type: 'image' },
});
const photoUpload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } }).fields([
  { name: 'fireExtPhoto', maxCount: 1 },
  { name: 'smokeDetPhoto', maxCount: 1 },
  { name: 'stoveSensorPhoto', maxCount: 1 },
]);

// POST /api/inspections — admin creates a new inspection (closes any active one first)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { dueDate } = req.body;
    if (!dueDate) return res.status(400).json({ message: 'Due date is required' });
    await Inspection.updateMany({ status: 'active' }, { status: 'closed' });
    const inspection = await Inspection.create({ createdBy: req.user._id, dueDate });

    // Notify all active tenants
    const tenants = await User.find({ role: 'tenant', movedOutAt: null }).select('name email');
    for (const tenant of tenants) {
      sendInspectionAssignedEmail(tenant, inspection).catch(e =>
        console.error('[INSPECTION EMAIL]', tenant.email, e.message)
      );
    }
    console.log(`[INSPECTION] notified ${tenants.length} tenants`);

    res.status(201).json(inspection);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/inspections — admin: list all
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const inspections = await Inspection.find().sort({ createdAt: -1 }).limit(20);
    res.json(inspections);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/inspections/active — check active inspection + whether current user has responded
router.get('/active', protect, async (req, res) => {
  try {
    const inspection = await Inspection.findOne({ status: 'active' });
    if (!inspection) return res.json(null);
    let responded = false;
    if (req.user.role === 'tenant') {
      const existing = await InspectionResponse.findOne({ inspectionId: inspection._id, tenantId: req.user._id });
      responded = !!existing;
    }
    res.json({ inspection, responded });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/inspections/:id/respond — tenant submits response with optional photos
router.post('/:id/respond', protect, photoUpload, async (req, res) => {
  try {
    const inspection = await Inspection.findById(req.params.id);
    if (!inspection || inspection.status !== 'active') {
      return res.status(404).json({ message: 'Inspection not found or already closed' });
    }

    const fireExt = JSON.parse(req.body.fireExtinguisher || '{}');
    const smokeDet = JSON.parse(req.body.smokeDetector || '{}');
    const stoveSensor = JSON.parse(req.body.stoveSensor || '{}');

    if (req.files?.fireExtPhoto?.[0]) fireExt.photo = req.files.fireExtPhoto[0].path;
    if (req.files?.smokeDetPhoto?.[0]) smokeDet.photo = req.files.smokeDetPhoto[0].path;
    if (req.files?.stoveSensorPhoto?.[0]) stoveSensor.photo = req.files.stoveSensorPhoto[0].path;

    const response = await InspectionResponse.findOneAndUpdate(
      { inspectionId: inspection._id, tenantId: req.user._id },
      {
        fireExtinguisher: fireExt,
        smokeDetector: smokeDet,
        stoveSensor: stoveSensor,
        completedAt: new Date(),
        tenantSnapshot: {
          name: req.user.name,
          unit: req.user.unit,
          building: req.user.building,
          email: req.user.email,
        },
      },
      { upsert: true, new: true }
    );

    res.json(response);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/inspections/:id/responses — admin: all tenant responses for an inspection
router.get('/:id/responses', protect, adminOnly, async (req, res) => {
  try {
    const inspection = await Inspection.findById(req.params.id);
    if (!inspection) return res.status(404).json({ message: 'Not found' });

    const tenants = await User.find({ role: 'tenant', isActive: true }).select('name email unit building').sort({ name: 1 });
    const responses = await InspectionResponse.find({ inspectionId: inspection._id });
    const responseMap = Object.fromEntries(responses.map(r => [r.tenantId.toString(), r]));

    // Build set of occupied apartments (building name + apt number)
    const occupiedKeys = new Set(tenants.map(t => `${t.unit}__${t.building}`));

    // Fetch all buildings and include vacant apartments
    const buildings = await Building.find();
    const vacantRows = [];
    for (const b of buildings) {
      for (const apt of b.apartments) {
        const key = `${b.name}__${apt.number}`;
        if (!occupiedKeys.has(key)) {
          vacantRows.push({
            tenant: {
              _id: `vacant__${b.name}__${apt.number}`,
              name: 'Vacant',
              unit: b.name,
              building: apt.number,
              isVacant: true,
            },
            response: null,
          });
        }
      }
    }

    const allRows = [
      ...tenants.map(t => ({ tenant: t, response: responseMap[t._id.toString()] || null })),
      ...vacantRows,
    ];

    res.json({ inspection, tenants: allRows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/inspections/:id — admin deletes inspection + all responses
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await InspectionResponse.deleteMany({ inspectionId: req.params.id });
    await Inspection.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/inspections/:id/responses/:tenantId/redo — admin resets response and emails tenant
router.post('/:id/responses/:tenantId/redo', protect, adminOnly, async (req, res) => {
  try {
    const inspection = await Inspection.findById(req.params.id);
    if (!inspection) return res.status(404).json({ message: 'Not found' });
    const tenant = await User.findById(req.params.tenantId).select('name email');
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
    await InspectionResponse.findOneAndDelete({ inspectionId: req.params.id, tenantId: req.params.tenantId });
    await sendInspectionRedoEmail(tenant, inspection, req.body.reason || '');
    res.json({ message: 'Response reset and tenant notified' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/inspections/:id/responses/:tenantId — admin deletes one tenant's response
router.delete('/:id/responses/:tenantId', protect, adminOnly, async (req, res) => {
  try {
    await InspectionResponse.findOneAndDelete({ inspectionId: req.params.id, tenantId: req.params.tenantId });
    res.json({ message: 'Response deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/inspections/:id/remind — send reminder emails to tenants who haven't responded
router.post('/:id/remind', protect, adminOnly, async (req, res) => {
  try {
    const inspection = await Inspection.findById(req.params.id);
    if (!inspection) return res.status(404).json({ message: 'Not found' });

    const { tenantIds } = req.body; // optional array — if empty, remind all pending
    const tenants = await User.find({ role: 'tenant', isActive: true, ...(tenantIds?.length ? { _id: { $in: tenantIds } } : {}) }).select('name email');
    const responses = await InspectionResponse.find({ inspectionId: inspection._id }).select('tenantId');
    const respondedIds = new Set(responses.map(r => r.tenantId.toString()));

    const pending = tenants.filter(t => !respondedIds.has(t._id.toString()));
    if (!pending.length) return res.json({ sent: 0, message: 'No pending tenants to remind' });

    let sent = 0;
    for (const tenant of pending) {
      try { await sendInspectionReminderEmail(tenant, inspection); sent++; } catch {}
    }
    res.json({ sent, total: pending.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/inspections/:id/archive — get closed inspection with all responses (for archive view)
router.get('/:id/archive', protect, adminOnly, async (req, res) => {
  try {
    const inspection = await Inspection.findById(req.params.id);
    if (!inspection) return res.status(404).json({ message: 'Not found' });

    const responses = await InspectionResponse.find({ inspectionId: inspection._id })
      .populate('tenantId', 'name unit building email');

    const rows = responses.map(r => ({
      response: r,
      tenant: {
        _id: r.tenantId?._id || r.tenantId,
        name: r.tenantSnapshot?.name || r.tenantId?.name || 'Deleted tenant',
        unit: r.tenantSnapshot?.unit || r.tenantId?.unit || '',
        building: r.tenantSnapshot?.building || r.tenantId?.building || '',
        email: r.tenantSnapshot?.email || r.tenantId?.email || '',
      },
    }));

    res.json({ inspection, rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/inspections/:id/close — admin closes inspection
router.put('/:id/close', protect, adminOnly, async (req, res) => {
  try {
    const inspection = await Inspection.findByIdAndUpdate(req.params.id, { status: 'closed' }, { new: true });
    res.json(inspection);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
