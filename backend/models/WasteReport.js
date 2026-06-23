const mongoose = require('mongoose');

const wasteReportSchema = new mongoose.Schema({
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null if anonymous
  building: { type: String },
  location: { type: String, required: true }, // e.g. "Stairwell", "Parking", "Bin room"
  description: { type: String, required: true },
  images: [{ type: String }],
  anonymous: { type: Boolean, default: false },
  status: { type: String, enum: ['open', 'investigating', 'resolved'], default: 'open' },
  adminNote: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('WasteReport', wasteReportSchema);
