const express = require('express');
const router = express.Router();
const { createRequest, listRequests, decideRequest } = require('../controllers/statusChangeController');
const { protect, authorize } = require('../middleware/auth');

router.post('/', protect, authorize('officer'), createRequest);
router.get('/', protect, authorize('officer', 'admin', 'super_admin'), listRequests);
router.put('/:id/decide', protect, authorize('admin', 'super_admin'), decideRequest);

module.exports = router;
