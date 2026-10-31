const express = require('express');
const router = express.Router();
const {
  adminDashboard, searchCitizens, getOfficers, toggleOfficer, updateOfficer,
  resetOfficerPassword, getReports,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.get('/dashboard', protect, authorize('admin'), adminDashboard);
router.get('/citizens', protect, authorize('admin', 'super_admin'), searchCitizens);
router.get('/officers', protect, authorize('admin', 'super_admin'), getOfficers);
router.put('/officers/:id/toggle', protect, authorize('admin'), toggleOfficer);
router.put('/officers/:id', protect, authorize('admin'), updateOfficer);
router.put('/officers/:id/reset-password', protect, authorize('admin'), resetOfficerPassword);
router.get('/reports', protect, authorize('admin', 'super_admin'), getReports);

module.exports = router;
