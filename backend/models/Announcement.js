const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  body: { type: String, required: true, trim: true },
  sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sentToCount: { type: Number, default: 0 },
  building: { type: String, default: null }, // null = all tenants
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);
