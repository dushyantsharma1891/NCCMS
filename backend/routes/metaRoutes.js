const express = require('express');
const router = express.Router();
const statesDistricts = require('../data/statesDistricts');
const Complaint = require('../models/Complaint');
const Department = require('../models/Department');
const User = require('../models/User');

// @desc  Get all states with their districts (for dependent dropdowns)
// @route GET /api/meta/states-districts
router.get('/states-districts', (req, res) => {
  res.json(statesDistricts);
});

// @desc  Public, no-auth impact numbers shown on the homepage
// @route GET /api/meta/public-stats
router.get('/public-stats', async (req, res) => {
  try {
    const [totalComplaints, resolved, departments, citizens] = await Promise.all([
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: 'Resolved' }),
      Department.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'citizen' }),
    ]);
    res.json({ totalComplaints, resolved, departments, citizens });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
