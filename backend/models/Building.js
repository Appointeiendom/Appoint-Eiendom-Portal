const mongoose = require('mongoose');

const apartmentSchema = new mongoose.Schema({
  number: { type: String, required: true, trim: true }, // e.g. "1A", "201"
  floor: { type: String, trim: true },
  type: { type: String, trim: true }, // e.g. "2-bed"
}, { _id: true });

const buildingSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, // e.g. "Storgata 12"
  address: { type: String, trim: true },
  apartments: [apartmentSchema],
}, { timestamps: true });

module.exports = mongoose.model('Building', buildingSchema);
