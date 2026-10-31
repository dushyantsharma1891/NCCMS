const express = require('express');
const router = express.Router();
const {
  createComplaint,
  getComplaints,
  getByDepartment,
  getByUser,
  getComplaintById,
  updateComplaint,
  adminEditComplaint,
  updateStatus,
  deleteComplaint,
  assignOfficer,
  escalateToAdmin,
  trackComplaint,
} = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public — no auth required, used by the "Track Complaint" page
router.get('/track/:complaintId', trackComplaint);

router.post('/create', protect, authorize('citizen'), upload.array('images', 5), createComplaint);
router.get('/all', protect, getComplaints);
router.get('/department/:id', protect, authorize('officer', 'admin', 'super_admin'), getByDepartment);
router.get('/user/:id', protect, getByUser);
router.get('/:id', protect, getComplaintById);
router.put('/update/:id', protect, authorize('citizen'), updateComplaint);
router.put('/admin-edit/:id', protect, authorize('super_admin'), adminEditComplaint);
router.put('/status/:id', protect, authorize('officer', 'admin', 'super_admin'), upload.array('resolutionImages', 5), updateStatus);
router.put('/assign/:id', protect, authorize('admin', 'super_admin'), assignOfficer);
router.put('/escalate/:id', protect, authorize('officer'), escalateToAdmin);
router.delete('/delete/:id', protect, authorize('super_admin'), deleteComplaint);

module.exports = router;
