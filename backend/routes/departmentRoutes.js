const express = require('express');
const router = express.Router();
const {
  getDepartments,
  getDepartmentById,
  setComplaintHead,
  getCategories,
  createDepartment,
  updateDepartment,
  deactivateDepartment,
  deleteDepartment,
  createCategory,
  deleteCategory,
} = require('../controllers/departmentController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, getDepartments);
router.get('/categories', getCategories);
router.post('/categories', protect, authorize('super_admin'), createCategory);
router.delete('/categories/:id', protect, authorize('super_admin'), deleteCategory);

router.post('/', protect, authorize('super_admin'), createDepartment);
router.get('/:id', getDepartmentById);
// Give one officer the "Complaint Head" rank (Admin: own department; Super Admin: any).
router.put('/:id/complaint-head', protect, authorize('admin', 'super_admin'), setComplaintHead);
// Admin has NO direct write route — every department change, however small,
// must go through POST /api/approvals/department for Super Admin sign-off.
router.put('/:id', protect, authorize('super_admin'), updateDepartment);
router.put('/:id/deactivate', protect, authorize('super_admin'), deactivateDepartment);
router.delete('/:id', protect, authorize('super_admin'), deleteDepartment);

module.exports = router;
