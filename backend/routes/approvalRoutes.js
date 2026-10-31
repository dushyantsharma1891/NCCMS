const express = require('express');
const router = express.Router();
const {
  requestCreateOfficer,
  requestCitizenCorrection,
  requestDepartmentUpdate,
  requestComplaintEdit,
  requestDeleteCitizen,
  requestDeleteOfficer,
  requestDeleteComplaint,
  listApprovals,
  approveRequest,
  rejectRequest,
} = require('../controllers/approvalController');
const { protect, authorize } = require('../middleware/auth');

router.post('/officer', protect, authorize('admin'), requestCreateOfficer);
router.post('/citizen-correction', protect, authorize('admin'), requestCitizenCorrection);
router.post('/department', protect, authorize('admin'), requestDepartmentUpdate);
router.post('/complaint-edit', protect, authorize('admin'), requestComplaintEdit);
router.post('/delete-citizen', protect, authorize('admin'), requestDeleteCitizen);
router.post('/delete-officer', protect, authorize('admin'), requestDeleteOfficer);
router.post('/delete-complaint', protect, authorize('admin'), requestDeleteComplaint);
router.get('/', protect, authorize('admin', 'super_admin'), listApprovals);
router.put('/:id/approve', protect, authorize('super_admin'), approveRequest);
router.put('/:id/reject', protect, authorize('super_admin'), rejectRequest);

module.exports = router;
