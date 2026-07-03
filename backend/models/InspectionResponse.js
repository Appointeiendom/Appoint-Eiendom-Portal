const mongoose = require('mongoose');

const detectorSchema = new mongoose.Schema({
  present: Boolean,
  notPresentReason: String,
  beeped: Boolean,
  beepedAfterBattery: Boolean,
  needsInspection: { type: Boolean, default: false },
  photo: String,
}, { _id: false });

const inspectionResponseSchema = new mongoose.Schema({
  inspectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inspection', required: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Snapshot of tenant info at time of submission — persists after tenant deletion
  tenantSnapshot: {
    name: String,
    unit: String,
    building: String,
    email: String,
  },
  fireExtinguisher: {
    present: Boolean,
    notPresentReason: String,
    gaugeGreen: Boolean,
    gaugeReason: String,
    pinIntact: Boolean,
    pinReason: String,
    photo: String,
  },
  smokeDetector: detectorSchema,
  stoveSensor: detectorSchema,
  completedAt: Date,
}, { timestamps: true });

inspectionResponseSchema.index({ inspectionId: 1, tenantId: 1 }, { unique: true });

module.exports = mongoose.model('InspectionResponse', inspectionResponseSchema);
