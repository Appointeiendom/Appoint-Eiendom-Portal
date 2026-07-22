const mongoose = require('mongoose');

const inspectionSchema = new mongoose.Schema({
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['active', 'closed'], default: 'active' },
}, { timestamps: true });

module.exports = mongoose.model('Inspection', inspectionSchema);
