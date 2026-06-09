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
    priority: { type: String, enum: ['low', 'medium', 'high'], required: true },
    status: { type: String, enum: ['open', 'in-progress', 'resolved'], default: 'open' },
    unit: { type: String, required: true },
    building: { type: String },
    images: [{ type: String }], // file paths
    internalNotes: { type: String },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Issue', issueSchema);
