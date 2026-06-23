const mongoose = require('mongoose');

const DEFAULT_WELCOME_BODY = `Your tenant account has been created. You can now log in and report maintenance issues directly through the portal.

Please change your password after your first login.`;

const settingsSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'global' },
  welcomeEmailBody: { type: String, default: DEFAULT_WELCOME_BODY },
}, { timestamps: true });

settingsSchema.statics.getGlobal = async function () {
  let doc = await this.findOne({ key: 'global' });
  if (!doc) doc = await this.create({ key: 'global' });
  return doc;
};

module.exports = mongoose.model('Settings', settingsSchema);
module.exports.DEFAULT_WELCOME_BODY = DEFAULT_WELCOME_BODY;
