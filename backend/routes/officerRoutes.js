const express = require('express');
const router = express.Router();
const { officerDashboard } = require('../controllers/officerController');
const { protect, authorize } = require('../middleware/auth');

router.get('/dashboard', protect, authorize('officer'), officerDashboard);

module.exports = router;
