const express = require('express');
const router = express.Router();
const { createTicket, listTickets, getTicket, getByComplaint, replyTicket, assignTicket, setTicketStatus, bulkDeleteTickets } = require('../controllers/helplineController');
const { protect, authorize } = require('../middleware/auth');

router.post('/', protect, authorize('citizen'), createTicket);
router.get('/', protect, listTickets);
router.delete('/bulk', protect, authorize('super_admin'), bulkDeleteTickets);
router.get('/by-complaint/:complaintId', protect, authorize('citizen'), getByComplaint);
router.get('/:id', protect, getTicket);
router.post('/:id/reply', protect, replyTicket);
router.put('/:id/assign', protect, authorize('admin', 'super_admin'), assignTicket);
router.put('/:id/status', protect, authorize('officer', 'admin', 'super_admin'), setTicketStatus);

module.exports = router;
