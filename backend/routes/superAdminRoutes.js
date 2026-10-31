const express = require('express');
const router = express.Router();
const {
  dashboard,
  createAdmin, updateAdmin, deleteAdmin,
  createOfficer, deleteOfficer,
  createCitizen, deleteCitizen,
  editUser, toggleUser, resetPassword, forcePasswordChange,
  listUsers, globalSearch, userActivity, systemActivity,
} = require('../controllers/superAdminController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('super_admin'));

router.get('/dashboard', dashboard);

// Three separate, fully-featured sections — create/search/update/delete —
// one each for Admins, Officers, and Citizens. All list through the same
// generic listUsers endpoint with a role filter; create/delete are
// role-specific since each has different required fields and ID formats.
router.post('/admins', createAdmin);
router.put('/admins/:id', updateAdmin);
router.delete('/admins/:id', deleteAdmin);

router.post('/officers', createOfficer);
router.delete('/officers/:id', deleteOfficer);

router.post('/citizens', createCitizen);
router.delete('/citizens/:id', deleteCitizen);

router.get('/users', listUsers);
router.put('/users/:id', editUser);
router.put('/users/:id/toggle', toggleUser);
router.put('/users/:id/reset-password', resetPassword);
router.put('/users/:id/force-change', forcePasswordChange);
router.get('/users/:id/activity', userActivity);

router.get('/search', globalSearch);
router.get('/activity', systemActivity);

module.exports = router;
