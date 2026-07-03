const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const Building = require('../models/Building');
const User = require('../models/User');

// GET /api/buildings — list all buildings
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const buildings = await Building.find().sort({ name: 1 });
    res.json(buildings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/buildings — create building
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, address } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const building = await Building.create({ name, address });
    res.status(201).json(building);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/buildings/:id — update name/address
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, address } = req.body;
    const building = await Building.findById(req.params.id);
    if (!building) return res.status(404).json({ message: 'Building not found' });
    if (name) building.name = name;
    if (address !== undefined) building.address = address;
    await building.save();
    res.json(building);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/buildings/:id — only if no tenants assigned
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const occupied = await User.exists({ role: 'tenant', buildingId: req.params.id });
    if (occupied) return res.status(400).json({ message: 'Cannot delete building with tenants assigned' });
    await Building.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/buildings/:id/apartments — list apartments with occupancy status
// ?excludeTenant=id to treat that tenant's apt as available (for edit modal)
router.get('/:id/apartments', protect, adminOnly, async (req, res) => {
  try {
    const building = await Building.findById(req.params.id);
    if (!building) return res.status(404).json({ message: 'Building not found' });

    // Find all tenants in this building
    const tenants = await User.find({ role: 'tenant', isActive: true, buildingId: req.params.id })
      .select('name apartmentId');

    const occupancyMap = {};
    for (const t of tenants) {
      if (t.apartmentId && (!req.query.excludeTenant || t._id.toString() !== req.query.excludeTenant)) {
        occupancyMap[t.apartmentId.toString()] = t.name;
      }
    }

    const result = building.apartments.map(apt => ({
      _id: apt._id,
      number: apt.number,
      floor: apt.floor,
      type: apt.type,
      isOccupied: !!occupancyMap[apt._id.toString()],
      occupantName: occupancyMap[apt._id.toString()] || null,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/buildings/:id/apartments — add apartment
router.post('/:id/apartments', protect, adminOnly, async (req, res) => {
  try {
    const { number, floor, type } = req.body;
    if (!number) return res.status(400).json({ message: 'Apartment number is required' });
    const building = await Building.findById(req.params.id);
    if (!building) return res.status(404).json({ message: 'Building not found' });
    // Prevent duplicate numbers
    if (building.apartments.some(a => a.number.toLowerCase() === number.trim().toLowerCase())) {
      return res.status(400).json({ message: 'Apartment number already exists' });
    }
    building.apartments.push({ number: number.trim(), floor, type });
    await building.save();
    res.json(building);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/buildings/:id/apartments/:aptId — rename unit (works whether occupied or vacant)
router.put('/:id/apartments/:aptId', protect, adminOnly, async (req, res) => {
  try {
    const { number, floor, type } = req.body;
    if (!number || !number.trim()) return res.status(400).json({ message: 'Unit number is required' });
    const building = await Building.findById(req.params.id);
    if (!building) return res.status(404).json({ message: 'Building not found' });
    const apt = building.apartments.id(req.params.aptId);
    if (!apt) return res.status(404).json({ message: 'Unit not found' });
    // Check for duplicate number (excluding self)
    const duplicate = building.apartments.find(a => a._id.toString() !== req.params.aptId && a.number.toLowerCase() === number.trim().toLowerCase());
    if (duplicate) return res.status(400).json({ message: 'Unit number already exists in this building' });
    const oldNumber = apt.number;
    apt.number = number.trim();
    if (floor !== undefined) apt.floor = floor;
    if (type !== undefined) apt.type = type;
    await building.save();
    // Sync tenant records that reference this apartment
    if (oldNumber !== apt.number) {
      await User.updateMany({ buildingId: req.params.id, apartmentId: req.params.aptId }, { building: apt.number });
    }
    res.json(building);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/buildings/:id/apartments/:aptId — remove if vacant
router.delete('/:id/apartments/:aptId', protect, adminOnly, async (req, res) => {
  try {
    const occupied = await User.exists({ role: 'tenant', buildingId: req.params.id, apartmentId: req.params.aptId });
    if (occupied) return res.status(400).json({ message: 'Cannot remove occupied apartment' });
    const building = await Building.findById(req.params.id);
    if (!building) return res.status(404).json({ message: 'Building not found' });
    building.apartments = building.apartments.filter(a => a._id.toString() !== req.params.aptId);
    await building.save();
    res.json(building);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
