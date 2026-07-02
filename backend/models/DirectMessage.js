const mongoose = require('mongoose');

const directMessageSchema = new mongoose.Schema(
  {
    threadUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole:   { type: String, enum: ['tenant', 'admin', 'maintenance'], required: true },
    senderName:   { type: String, required: true },
    message:      { type: String, required: true, trim: true },
    isRead:       { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DirectMessage', directMessageSchema);
