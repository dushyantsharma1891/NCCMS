const express = require('express');
const router = express.Router();
const { createReport, listReports, reviewReport, REASON_TYPES } = require('../controllers/falseReportController');
const { protect, authorize } = require('../middleware/auth');

router.get('/reasons', protect, (req, res) => res.json(REASON_TYPES));
router.post('/', protect, authorize('officer'), createReport);
router.get('/', protect, authorize('officer', 'admin', 'super_admin'), listReports);
router.put('/:id/review', protect, authorize('admin', 'super_admin'), reviewReport);

module.exports = router;
