const FalseComplaintReport = require('../models/FalseComplaintReport');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Notification = require('../models/Notification');
const generateRequestId = require('../utils/requestId');
const logActivity = require('../utils/auditLog');

const TERMINAL = ['Closed', 'Rejected'];
const REASON_TYPES = FalseComplaintReport.schema.path('reasonType').enumValues;

const notify = (user, title, message, complaint) =>
  Notification.create({ user, title, message, type: 'Complaint Updated', complaint });

// @desc  Officer reports a complaint assigned to them as fake / false, with
//        feedback. Optionally closes it right away. Goes to the admins.
// @route POST /api/false-reports
const createReport = async (req, res) => {
  try {
    const { complaintId, reasonType, reason, closeComplaint } = req.body;
    if (!REASON_TYPES.includes(reasonType)) return res.status(400).json({ message: 'Please choose why you are reporting this complaint' });
    if (!reason || String(reason).trim().length < 10) {
      return res.status(400).json({ message: 'Please explain your feedback in at least 10 characters so the admin can review it' });
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    if (!complaint.assignedOfficer || String(complaint.assignedOfficer) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only report complaints that are assigned to you' });
    }
    if (TERMINAL.includes(complaint.status)) {
      return res.status(400).json({ message: `This complaint is already ${complaint.status.toLowerCase()}` });
    }
    const open = await FalseComplaintReport.findOne({ complaint: complaint._id, status: 'Pending' });
    if (open) return res.status(409).json({ message: 'This complaint has already been reported and is waiting for admin review' });

    const reportId = await generateRequestId(FalseComplaintReport, 'reportId', 'FCR');
    const report = await FalseComplaintReport.create({
      reportId, complaint: complaint._id, citizen: complaint.citizen, department: complaint.department,
      reportedBy: req.user._id, reasonType, reason: String(reason).trim(), closedByOfficer: !!closeComplaint,
    });

    const previousStatus = complaint.status;
    complaint.flaggedFalse = true;
    complaint.history.push({
      previousStatus, status: previousStatus, actionType: 'FalseReport', internalOnly: true,
      remarks: `Officer reported this complaint as false/fake (${reasonType})`, reason: report.reason,
      updatedBy: req.user._id, updatedByRole: 'officer',
    });
    if (closeComplaint) {
      complaint.statusBeforeFalseClose = previousStatus;
      complaint.closedAsFalse = true;
      complaint.status = 'Closed';
      complaint.terminalAt = new Date();
      complaint.history.push({
        previousStatus, status: 'Closed', actionType: 'StatusChange',
        remarks: 'Closed by the officer after review', updatedBy: req.user._id, updatedByRole: 'officer',
      });
    }
    await complaint.save();

    // Tell the admins who look after this department, and every Super Admin.
    const staff = await User.find({ role: { $in: ['admin', 'super_admin'] }, isActive: true }).select('_id role department');
    const targets = staff.filter((u) => u.role === 'super_admin' || !u.department || String(u.department) === String(complaint.department));
    await Promise.all(targets.map((u) => notify(u._id, `False complaint reported — ${complaint.complaintId}`,
      `${req.user.name} reported ${complaint.complaintId} as "${reasonType}"${closeComplaint ? ' and closed it' : ''}. Please review.`, complaint._id)));

    if (closeComplaint) {
      // Neutral wording — the citizen is not accused until an admin confirms.
      await notify(complaint.citizen, `Complaint ${complaint.complaintId} closed`,
        'Your complaint was reviewed by the handling officer and closed. It has been passed to an administrator for a final check.', complaint._id);
    }

    await logActivity({ actor: req.user, action: `Officer reported a false/fake complaint${closeComplaint ? ' and closed it' : ''}`, targetType: 'Complaint', targetId: complaint._id, targetLabel: complaint.complaintId, newValue: { reasonType }, reason: report.reason, req });
    res.status(201).json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  List reports. Admin: their department (all if unscoped). Super Admin:
//        all. Officer: only the ones they filed.
// @route GET /api/false-reports
const listReports = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'officer') filter.reportedBy = req.user._id;
    if (req.user.role === 'admin' && req.user.department) filter.department = req.user.department;
    if (req.query.status && ['Pending', 'Confirmed', 'Dismissed'].includes(req.query.status)) filter.status = req.query.status;

    const reports = await FalseComplaintReport.find(filter)
      .populate('complaint', 'complaintId title description status category state district closedAsFalse')
      .populate('citizen', 'name email citizenId phone isActive falseComplaintStrikes')
      .populate('reportedBy', 'name employeeId')
      .populate('reviewedBy', 'name')
      .populate('department', 'name')
      .sort('-createdAt');
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Admin / Super Admin decides on a report.
//        decision 'dismiss'  -> report was wrong; a complaint the officer had
//                               closed is restored to where it was.
//        decision 'confirm'  -> it really was false; optionally warn the
//                               citizen or deactivate their account.
// @route PUT /api/false-reports/:id/review
const reviewReport = async (req, res) => {
  try {
    const { decision, action = 'none', note } = req.body;
    if (!['confirm', 'dismiss'].includes(decision)) return res.status(400).json({ message: 'decision must be confirm or dismiss' });
    if (decision === 'confirm' && !['none', 'warn', 'deactivate'].includes(action)) return res.status(400).json({ message: 'Invalid action' });

    const report = await FalseComplaintReport.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    if (report.status !== 'Pending') return res.status(400).json({ message: 'This report has already been reviewed' });
    if (req.user.role === 'admin' && req.user.department && String(report.department) !== String(req.user.department)) {
      return res.status(403).json({ message: 'This report is outside your department scope' });
    }

    const complaint = await Complaint.findById(report.complaint);
    const citizen = await User.findById(report.citizen);

    report.reviewedBy = req.user._id;
    report.reviewedAt = new Date();
    report.adminNote = note || '';

    if (decision === 'dismiss') {
      report.status = 'Dismissed';
      if (complaint) {
        complaint.flaggedFalse = false;
        if (complaint.closedAsFalse) {
          const restoreTo = complaint.statusBeforeFalseClose || 'In Progress';
          complaint.history.push({
            previousStatus: complaint.status, status: restoreTo, actionType: 'FalseReview', internalOnly: true,
            remarks: 'Admin dismissed the false-complaint report — complaint reopened', reason: note || '',
            updatedBy: req.user._id, updatedByRole: req.user.role,
          });
          complaint.status = restoreTo;
          complaint.terminalAt = null;
          complaint.closedAsFalse = false;
          complaint.statusBeforeFalseClose = null;
          if (complaint.assignedOfficer) {
            await notify(complaint.assignedOfficer, `Complaint ${complaint.complaintId} reopened`, 'An admin reviewed your false-complaint report and found the complaint genuine, so it has been reopened.', complaint._id);
          }
          await notify(complaint.citizen, `Complaint ${complaint.complaintId} reopened`, `Your complaint has been reopened and is back to "${restoreTo}". Sorry for the confusion.`, complaint._id);
        }
        await complaint.save();
      }
    } else {
      report.status = 'Confirmed';
      if (citizen) {
        citizen.falseComplaintStrikes = (citizen.falseComplaintStrikes || 0) + 1;
        if (action === 'deactivate') { citizen.isActive = false; report.action = 'Deactivated'; }
        else if (action === 'warn') report.action = 'Warned';
        await citizen.save();
        if (action === 'warn') {
          await notify(citizen._id, 'Warning: false complaint', `A complaint you filed (${complaint?.complaintId || ''}) was found to be false or misleading. Repeated misuse can lead to your account being deactivated.${note ? ` Admin note: ${note}` : ''}`, complaint?._id);
        }
      }
      if (complaint) {
        complaint.flaggedFalse = true;
        if (!TERMINAL.includes(complaint.status)) {
          complaint.history.push({
            previousStatus: complaint.status, status: 'Rejected', actionType: 'FalseReview', updatedBy: req.user._id, updatedByRole: req.user.role,
            remarks: 'Rejected after admin confirmed it as a false complaint',
          });
          complaint.status = 'Rejected';
          complaint.terminalAt = new Date();
        } else {
          complaint.history.push({
            previousStatus: complaint.status, status: complaint.status, actionType: 'FalseReview', internalOnly: true,
            remarks: 'Admin confirmed this complaint as false', reason: note || '', updatedBy: req.user._id, updatedByRole: req.user.role,
          });
        }
        await complaint.save();
      }
    }
    await report.save();

    await notify(report.reportedBy, `Your false-complaint report was ${report.status.toLowerCase()}`, `${complaint?.complaintId || 'Complaint'}: ${report.status}${report.action !== 'None' ? ` — citizen ${report.action.toLowerCase()}` : ''}${note ? `. Admin note: ${note}` : ''}`, complaint?._id);
    await logActivity({ actor: req.user, action: `${req.user.role === 'super_admin' ? 'Super Admin' : 'Admin'} ${decision === 'confirm' ? `confirmed false complaint${report.action !== 'None' ? ` and ${report.action.toLowerCase()} citizen` : ''}` : 'dismissed false-complaint report'}`, targetType: 'Complaint', targetId: complaint?._id, targetLabel: complaint?.complaintId, reason: note, req });
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createReport, listReports, reviewReport, REASON_TYPES };
