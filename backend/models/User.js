const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ['tenant', 'admin', 'maintenance'], required: true, default: 'tenant' },
    unit: { type: String, trim: true },
    building: { type: String, trim: true },
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    // Maintenance worker fields
    trade: { type: String, enum: ['Electrical', 'Plumbing', 'HVAC', 'General', 'Appliances'], default: null },
    bio: { type: String, trim: true },
    photo: { type: String },
    availability: [{ type: String }], // ISO date strings marked as available
    leaseStart: { type: Date, default: null },
    leaseEnd: { type: Date, default: null },
    buildingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Building', default: null },
    apartmentId: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
