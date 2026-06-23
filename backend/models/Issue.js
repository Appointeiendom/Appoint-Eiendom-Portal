const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['Electrical', 'Plumbing', 'HVAC', 'General', 'Appliances'],
      required: true,
    },
    status: { type: String, enum: ['open', 'in-progress', 'resolved'], default: 'open' },
    unit: { type: String, required: true },
    building: { type: String },
    images: [{ type: String }], // file paths
    internalNotes: { type: String },
    resolvedAt: { type: Date, default: null, index: { expireAfterSeconds: 60 * 60 * 24 * 7 } }, // auto-delete 7 days after resolved
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    responsibility: { type: String, enum: ['landlord', 'tenant'], default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Issue', issueSchema);
