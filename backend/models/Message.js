const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    issueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: { type: String, enum: ['tenant', 'admin', 'maintenance'], required: true },
    senderName: { type: String, required: true },
    message: { type: String, required: true, trim: true },
    isRead: { type: Boolean, default: false },
    // If set, this message belongs to a maintenance thread (not the admin-tenant thread)
    maintenanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    messageType: { type: String, enum: ['text', 'quote'], default: 'text' },
    quoteAmount: { type: Number, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);
