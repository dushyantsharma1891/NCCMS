const StatusChangeRequest = require('../models/StatusChangeRequest');
const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const User = require('../models/User');
const generateRequestId = require('../utils/requestId');
const logActivity = require('../utils/auditLog');
const { isBackwardTransition, LIFECYCLE } = require('../utils/statusFlow');

const notify = async (userId, title, message, type, complaintId) => {
  if (!userId) return;
  await Notification.create({ user: userId, title, message, type, complaint: complaintId });
};

// @desc  Officer requests moving a complaint BACKWARD in the lifecycle
//        (e.g. Resolved -> In Progress). This is the ONLY legitimate way to
//        do a backward move — it always needs Admin approval.
// @route POST /api/status-requests
const createRequest = async (req, res) => {
  try {
    const { complaintId, requestedStatus, reason } = req.body;
    if (!complaintId || !requestedStatus || !reason) {
      return res.status(400).json({ message: 'complaintId, requestedStatus and reason are required' });
    }
    if (!LIFECYCLE.includes(requestedStatus)) {
      return res.status(400).json({ message: 'Invalid requested status' });
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    if (String(complaint.assignedOfficer) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only request status changes on complaints assigned to you.' });
    }
    if (!isBackwardTransition(complaint.status, requestedStatus)) {
      return res.status(400).json({ message: 'A Status Change Request is only needed for backward moves. Use the normal status update for forward moves.' });
    }

    // Prevent duplicate pending requests for the same complaint.
    const existingPending = await StatusChangeRequest.findOne({ complaint: complaintId, status: 'Pending' });
    if (existingPending) {
      return res.status(400).json({ message: 'There is already a pending status change request for this complaint.' });
    }

    const requestId = await generateRequestId(StatusChangeRequest, 'requestId', 'SCR');
    const request = await StatusChangeRequest.create({
      requestId,
      complaint: complaintId,
      requestedBy: req.user._id,
      requestedByRole: req.user.role,
      currentStatus: complaint.status,
      requestedStatus,
      reason,
    });

    complaint.history.push({
      previousStatus: complaint.status,
      status: complaint.status,
      actionType: 'StatusBackRequest',
      remarks: `Officer requested status change to "${requestedStatus}"`,
      reason,
      requestId,
      updatedBy: req.user._id,
      updatedByRole: req.user.role,
      internalOnly: true,
    });
    await complaint.save();

    const admins = await User.find({ role: { $in: ['admin', 'super_admin'] } }).select('_id');
    await Promise.all(admins.map((a) => notify(
      a._id, `Status change requested — ${complaint.complaintId}`,
      `Officer requested moving the complaint back to "${requestedStatus}". Reason: ${reason}`,
      'Complaint Updated', complaint._id
    )));
    await logActivity({
      actor: req.user, action: 'Requested status rollback', targetType: 'Complaint',
      targetId: complaint._id, targetLabel: complaint.complaintId,
      oldValue: complaint.status, newValue: requestedStatus, reason, req,
    });

    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  List status change requests (Admin/Super Admin see all; Officer sees own)
// @route GET /api/status-requests
const listRequests = async (req, res) => {
  const filter = {};
  if (req.user.role === 'officer') filter.requestedBy = req.user._id;
  if (req.query.status) filter.status = req.query.status;

  const requests = await StatusChangeRequest.find(filter)
    .populate('requestedBy', 'name employeeId role')
    .populate('reviewedBy', 'name adminId role')
    .populate('complaint', 'complaintId title status department')
    .sort('-createdAt');
  res.json(requests);
};

// @desc  Admin/Super Admin approves or rejects a status change request. The
//        officer who requested it can never approve their own request.
// @route PUT /api/status-requests/:id/decide
const decideRequest = async (req, res) => {
  try {
    const { decision, remark } = req.body; // 'Approved' | 'Rejected'
    if (!['Approved', 'Rejected'].includes(decision)) {
      return res.status(400).json({ message: 'decision must be Approved or Rejected' });
    }

    const request = await StatusChangeRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'Pending') {
      return res.status(400).json({ message: `Request has already been ${request.status.toLowerCase()}` });
    }
    if (String(request.requestedBy) === String(req.user._id)) {
      return res.status(403).json({ message: 'You cannot approve/reject your own request.' });
    }

    request.status = decision;
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    request.reviewRemark = remark || '';
    await request.save();

    const complaint = await Complaint.findById(request.complaint);
    if (complaint) {
      if (decision === 'Approved') {
        // Controlled backend transition — bypasses the normal forward-only
        // check because it is explicitly authorized by an Admin approval.
        const previousStatus = complaint.status;
        complaint.status = request.requestedStatus;
        complaint.terminalAt = ['Resolved', 'Closed', 'Rejected'].includes(request.requestedStatus) ? new Date() : null;
        complaint.history.push({
          previousStatus,
          status: request.requestedStatus,
          actionType: 'StatusBackApproved',
          remarks: `Admin approved status rollback. ${remark || ''}`.trim(),
          reason: request.reason,
          requestId: request.requestId,
          approvedBy: req.user._id,
          updatedBy: req.user._id,
          updatedByRole: req.user.role,
        });
        await complaint.save();

        await notify(
          request.requestedBy, `Status change approved — ${complaint.complaintId}`,
          `Your request to move the complaint to "${request.requestedStatus}" was approved.`,
          'Complaint Updated', complaint._id
        );
      } else {
        complaint.history.push({
          previousStatus: complaint.status,
          status: complaint.status,
          actionType: 'StatusBackRejected',
          remarks: `Admin rejected status rollback request. ${remark || ''}`.trim(),
          reason: request.reason,
          requestId: request.requestId,
          approvedBy: req.user._id,
          updatedBy: req.user._id,
          updatedByRole: req.user.role,
          internalOnly: true,
        });
        await complaint.save();

        await notify(
          request.requestedBy, `Status change rejected — ${complaint.complaintId}`,
          `Your request to move the complaint to "${request.requestedStatus}" was rejected. ${remark || ''}`,
          'Complaint Updated', complaint._id
        );
      }
    }

    await logActivity({
      actor: req.user, action: `${decision} status rollback request`, targetType: 'StatusChangeRequest',
      targetId: request._id, targetLabel: request.requestId, reason: remark, req,
    });

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createRequest, listRequests, decideRequest };
