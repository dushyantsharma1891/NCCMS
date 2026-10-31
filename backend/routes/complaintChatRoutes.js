const express = require('express');
const router = express.Router();
const { getMessages, postMessage } = require('../controllers/complaintChatController');
const { protect } = require('../middleware/auth');

router.get('/:complaintId', protect, getMessages);
router.post('/:complaintId', protect, postMessage);

module.exports = router;
