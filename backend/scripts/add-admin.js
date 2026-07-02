require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const existing = await User.findOne({ email: 'guru@lmc.as' });
  if (existing) {
    console.log('User already exists:', existing.email);
    await mongoose.disconnect();
    return process.exit(0);
  }

  const password = 'Admin@2025';
  const admin = await User.create({
    name: 'Guru',
    email: 'guru@lmc.as',
    password,
    role: 'admin',
    isActive: true,
  });

  console.log(`Admin created: ${admin.email} / password: ${password}`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch(err => { console.error(err); process.exit(1); });
