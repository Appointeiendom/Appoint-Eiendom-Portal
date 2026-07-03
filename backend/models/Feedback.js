const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  message: { type: String, required: true, maxlength: 1000 },
  category: { type: String, enum: ['general', 'bug', 'feature', 'design', 'other'], default: 'general' },
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
