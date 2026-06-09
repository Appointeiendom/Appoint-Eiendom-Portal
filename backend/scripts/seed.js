/**
 * Seed script — creates an admin user if one doesn't exist.
 * Run: node scripts/seed.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const existing = await User.findOne({ role: 'admin' });
  if (existing) {
    console.log(`Admin already exists: ${existing.email}`);
  } else {
    const admin = await User.create({
      name: 'Sameer Admin',
      email: 'sameer@superstay.no',
      password: 'admin123',
      role: 'admin',
      unit: 'Admin Office',
    });
    console.log(`Admin created: ${admin.email} / password: admin123`);
  }

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
