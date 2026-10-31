const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Department = require('../models/Department');
const generateComplaintId = require('../utils/complaintId');
const logActivity = require('../utils/auditLog');
const { autoCloseAtFor, AUTO_CLOSE_HOURS } = require('../utils/autoClose');
const { officerCoversComplaint, describeScope } = require('../utils/scope');
const { isValidForwardTransition, buildCitizenTimeline, getAllowedNextStatuses } = require('../utils/statusFlow');

const TERMINAL_STATUSES = ['Resolved', 'Closed', 'Rejected'];
const ARCHIVE_AFTER_DAYS = 4; // disappears from active lists 3-5 days after going terminal

const notify = async (userId, title, message, type, complaintId) => {
  if (!userId) return;
  await Notification.create({ user: userId, title, message, type, complaint: complaintId });
};

// Complaints that are Resolved/Closed/Rejected quietly drop out of the active
// lists ~4 days after reaching that state (data is NOT deleted — it's still
// reachable by direct ID, public tracking, and by admins who pass
// includeArchived=true). Anything still in progress (Pending, Accepted,
// Assigned, In Progress) is never hidden, no matter how old.
const buildArchiveFilter = (includeArchived) => {
  if (includeArchived) return {};
  const cutoff = new Date(Date.now() - ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000);
  return {
    $or: [
      { status: { $nin: TERMINAL_STATUSES } },
      { terminalAt: null },
      { terminalAt: { $gt: cutoff } },
    ],
  };
};

// Officers only ever see history entries relevant to processing their own
// assigned complaint — internal admin/approval chatter is stripped out.
const officerVisibleHistory = (history) => history.filter((h) => !h.internalOnly);

// Anonymous complaints hide the citizen's identity from Officer and Admin —
// only the Super Admin (and the citizen themselves) can ever see who filed
// an anonymous complaint. This is enforced here on the response payload
// itself, not just hidden in the UI, so the data never leaves the server.
const redactAnonymous = (obj, viewerRole) => {
  if (obj.anonymous && viewerRole !== 'super_admin' && viewerRole !== 'citizen') {
    obj.citizen = null;
  }
  return obj;
};

// Admin accounts can be scoped to a single department (set by Super Admin)
// or left system-wide (no department). A scoped Admin only ever sees/manages
// complaints in their own department — the query param is ignored/overridden
// in that case so a scoped Admin can't simply request another department's data.
const applyAdminScope = (filter, user) => {
  if (user.role === 'admin' && user.department) {
    filter.department = user.department;
  }
  return filter;
};

// Officers can be scoped by Super Admin to a state or a (more specific)
// district within their department, restricting which complaints they can
// see/act on. No scope set = the whole department, unchanged from before.
const escapeRegex = (v) => String(v).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exactCI = (v) => new RegExp('^' + escapeRegex(v) + '$', 'i');

const applyOfficerScope = (filter, user) => {
  if (user.role === 'officer' && (user.scopeDistrict || user.scopeState)) {
    const where = {};
    if (user.scopeState) where.state = exactCI(user.scopeState);
    if (user.scopeDistrict) where.district = exactCI(user.scopeDistrict);
    // A complaint explicitly assigned to the officer always stays visible,
    // even if their scope was narrowed after the assignment.
    const scopeClause = { $or: [{ assignedOfficer: user._id }, where] };
    filter.$and = [...(filter.$and || []), scopeClause];
  }
  return filter;
};

// @desc  Citizen creates a complaint
// @route POST /api/complaints/create
const createComplaint = async (req, res) => {
  try {
    const { title, description, department, category, priority, state, district, location, officeBranch, anonymous } = req.body;

    if (!title || !description || !department || !category) {
      return res.status(400).json({ message: 'Title, description, department and category are required' });
    }

    const deptDoc = await Department.findById(department);
    if (!deptDoc) return res.status(400).json({ message: 'Invalid department' });
    if (deptDoc.hasMultipleOffices && !officeBranch?.trim()) {
      return res.status(400).json({ message: `${deptDoc.name} has multiple branches/offices — please specify which one this complaint concerns.` });
    }

    // Duplicate-submission guard: block an identical complaint (same citizen,
    // same title+department) created in the last 60 seconds — covers
    // double-clicks / duplicate form submits without blocking genuine re-reports.
    const recentDuplicate = await Complaint.findOne({
      citizen: req.user._id,
      title,
      department,
      createdAt: { $gte: new Date(Date.now() - 60 * 1000) },
    });
    if (recentDuplicate) {
      return res.status(200).json(recentDuplicate);
    }

    const images = (req.files || []).map((f) => `/uploads/${f.filename}`);
    const complaintId = await generateComplaintId();

    const complaint = await Complaint.create({
      complaintId,
      title,
      description,
      department,
      category,
      priority: priority || 'Medium',
      state,
      district,
      location,
      officeBranch,
      images,
      anonymous: anonymous === 'true' || anonymous === true,
      citizen: req.user._id,
      status: 'Pending',
      history: [{
        previousStatus: null,
        status: 'Pending',
        actionType: 'Submitted',
        remarks: 'Complaint submitted',
        updatedBy: req.user._id,
        updatedByRole: 'citizen',
      }],
    });

    await notify(req.user._id, 'Complaint Submitted', `Your complaint ${complaintId} has been submitted.`, 'Complaint Submitted', complaint._id);
    await logActivity({
      actor: req.user, action: 'Citizen submitted complaint', targetType: 'Complaint',
      targetId: complaint._id, targetLabel: complaintId, req,
    });

    res.status(201).json(complaint);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Get all complaints (super_admin: all, admin: all, officer: own department, citizen: own)
// @route GET /api/complaints/all
const getComplaints = async (req, res) => {
  try {
    const { status, department, category, state, search, priority, includeArchived, officer, district, from, to } = req.query;
    const filter = {};

    if (req.user.role === 'citizen') filter.citizen = req.user._id;
    if (req.user.role === 'officer') {
      filter.department = req.user.department;
      applyOfficerScope(filter, req.user);
      if (req.query.mine === 'true') filter.assignedOfficer = req.user._id;
    }

    if (status) filter.status = status;
    if (department && (req.user.role === 'admin' || req.user.role === 'super_admin')) filter.department = department;
    if (officer && (req.user.role === 'admin' || req.user.role === 'super_admin')) filter.assignedOfficer = officer;
    if (category) filter.category = category;
    if (state) filter.state = state;
    if (district) filter.district = district;
    if (priority) filter.priority = priority;
    if (req.query.escalated === 'true') filter.needsAdminAttention = true;
    if (req.query.anonymous === 'true' && (req.user.role === 'admin' || req.user.role === 'super_admin')) filter.anonymous = true;
    applyAdminScope(filter, req.user);
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    if (search) {
      filter.$or = [
        { complaintId: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
      ];
    }

    // Only admins/super admins are allowed to peek at archived (auto-hidden) complaints.
    const canSeeArchived = ['admin', 'super_admin'].includes(req.user.role) && includeArchived === 'true';
    const archiveFilter = buildArchiveFilter(canSeeArchived);
    const finalFilter = filter.$or
      ? { $and: [filter, archiveFilter] }
      : { ...filter, ...archiveFilter };

    const complaints = await Complaint.find(finalFilter)
      .populate('department', 'name type')
      .populate('citizen', 'name email phone')
      .populate('assignedOfficer', 'name employeeId')
      .sort('-createdAt');

    const result = complaints.map((c) => redactAnonymous(c.toObject(), req.user.role));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Get complaints for a specific department (officer/admin/super_admin)
// @route GET /api/complaints/department/:id
const getByDepartment = async (req, res) => {
  const filter = { department: req.params.id, ...buildArchiveFilter(false) };
  applyOfficerScope(filter, req.user);
  applyAdminScope(filter, req.user);
  const complaints = await Complaint.find(filter)
    .populate('citizen', 'name email phone')
    .sort('-createdAt');
  res.json(complaints.map((c) => redactAnonymous(c.toObject(), req.user.role)));
};

// @desc  Get complaints for a specific user (citizen)
// @route GET /api/complaints/user/:id
const getByUser = async (req, res) => {
  if (req.user.role === 'citizen' && String(req.user._id) !== req.params.id) {
    return res.status(403).json({ message: 'Not authorized to view these complaints' });
  }
  const complaints = await Complaint.find({ citizen: req.params.id, ...buildArchiveFilter(['admin', 'super_admin'].includes(req.user.role)) })
    .populate('department', 'name type')
    .sort('-createdAt');
  res.json(complaints);
};

// @desc  Get single complaint (always reachable directly regardless of archive state).
//        Response shape adapts by role: citizens get a clean lifecycle timeline
//        with internal-only history stripped; officers get a trimmed history;
//        admin/super_admin get the complete internal audit trail.
// @route GET /api/complaints/:id
const getComplaintById = async (req, res) => {
  const complaint = await Complaint.findOne({
    $or: [{ _id: req.params.id }, { complaintId: req.params.id }],
  })
    .populate('department', 'name type')
    .populate('citizen', 'name email phone')
    .populate('assignedOfficer', 'name employeeId')
    .populate('assignedBy', 'name')
    .populate('history.updatedBy', 'name role employeeId adminId')
    .populate('history.approvedBy', 'name role employeeId adminId');

  if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

  if (req.user.role === 'citizen' && String(complaint.citizen._id) !== String(req.user._id)) {
    return res.status(403).json({ message: 'Not authorized to view this complaint' });
  }
  if (req.user.role === 'officer') {
    if (String(complaint.department._id) !== String(req.user.department)) {
      return res.status(403).json({ message: 'Not authorized to view this complaint' });
    }
    const mine = complaint.assignedOfficer && String(complaint.assignedOfficer._id || complaint.assignedOfficer) === String(req.user._id);
    if (!mine && !officerCoversComplaint(req.user, complaint)) {
      return res.status(403).json({ message: `This complaint is outside your assigned scope (${describeScope(req.user)})` });
    }
  }
  if (req.user.role === 'admin' && req.user.department && String(complaint.department._id) !== String(req.user.department)) {
    return res.status(403).json({ message: 'This complaint is outside your department scope' });
  }

  const obj = redactAnonymous(complaint.toObject(), req.user.role);

  if (req.user.role === 'citizen') {
    obj.citizenTimeline = buildCitizenTimeline(complaint);
    // Citizens never see the raw internal history array at all.
    delete obj.history;
  } else if (req.user.role === 'officer') {
    obj.history = officerVisibleHistory(obj.history);
  }
  // admin & super_admin receive the full, untouched internal history.

  // Tell the UI exactly which statuses THIS user may move the complaint to
  // right now, so the dropdown always matches what the backend will accept.
  const assignedToMe = req.user.role === 'officer' && complaint.assignedOfficer && String(complaint.assignedOfficer._id) === String(req.user._id);
  if (req.user.role === 'admin' || req.user.role === 'super_admin' || assignedToMe) {
    obj.allowedNextStatuses = getAllowedNextStatuses(complaint.status, req.user.role)
      .filter((st) => st !== 'Assigned' || complaint.assignedOfficer);
  } else {
    obj.allowedNextStatuses = [];
  }

  obj.autoCloseAt = autoCloseAtFor(complaint);
  obj.autoCloseHours = AUTO_CLOSE_HOURS;

  res.json(obj);
};

// @desc  Citizen updates own complaint (only while Pending)
// @route PUT /api/complaints/update/:id
const updateComplaint = async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

  if (String(complaint.citizen) !== String(req.user._id)) {
    return res.status(403).json({ message: 'Not authorized to edit this complaint' });
  }
  if (complaint.status !== 'Pending') {
    return res.status(400).json({ message: 'Only pending complaints can be edited' });
  }

  const fields = ['title', 'description', 'category', 'priority', 'location'];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) complaint[f] = req.body[f];
  });

  await complaint.save();
  res.json(complaint);
};

// @desc  Super Admin full edit — corrects/rewrites fields on any complaint
//        directly. Admin can NO LONGER edit a complaint directly — every
//        proposed edit goes through POST /api/approvals/complaint-edit for
//        Super Admin sign-off (see approvalController). Every edit here is
//        logged; it never silently rewrites history.
// @route PUT /api/complaints/admin-edit/:id
const adminEditComplaint = async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

  const fields = ['title', 'description', 'category', 'priority', 'location', 'officeBranch', 'state', 'district', 'department'];
  const changed = {};
  fields.forEach((f) => {
    if (req.body[f] !== undefined && req.body[f] !== '' && String(req.body[f]) !== String(complaint[f])) {
      changed[f] = { from: complaint[f], to: req.body[f] };
      complaint[f] = req.body[f];
    }
  });

  complaint.history.push({
    previousStatus: complaint.status,
    status: complaint.status,
    actionType: 'Edit',
    remarks: `Complaint details edited by ${req.user.role}`,
    updatedBy: req.user._id,
    updatedByRole: req.user.role,
  });
  await complaint.save();

  await logActivity({
    actor: req.user, action: 'Edited complaint details', targetType: 'Complaint',
    targetId: complaint._id, targetLabel: complaint.complaintId, oldValue: changed, req,
  });

  const populated = await complaint.populate([
    { path: 'department', select: 'name type' },
    { path: 'citizen', select: 'name email phone' },
    { path: 'assignedOfficer', select: 'name employeeId' },
  ]);
  res.json(populated);
};

// @desc  Officer/Admin/Super Admin updates status & remarks. Strictly
//        enforces the forward-only lifecycle on the backend — an officer (or
//        anyone) attempting a backward move is rejected outright and pointed
//        to the Status Change Request flow instead.
// @route PUT /api/complaints/status/:id
const updateStatus = async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const validStatuses = ['Pending', 'Accepted', 'Assigned', 'In Progress', 'Resolved', 'Closed', 'Rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    if (req.user.role === 'officer') {
      if (String(complaint.department) !== String(req.user.department)) {
        return res.status(403).json({ message: 'Not authorized to update this complaint' });
      }
      if (!complaint.assignedOfficer || String(complaint.assignedOfficer) !== String(req.user._id)) {
        return res.status(403).json({
          message: 'This complaint has not been assigned to you by the admin yet. You can only act on complaints assigned to you.',
        });
      }
    }

    // Backend transition validation, role-aware — never trust the frontend
    // to have blocked an invalid move. Officers: forward-only, no
    // Reject/Close. Admin: forward-only PLUS Reject/Close from any active
    // status (their real operational authority). Super Admin: unrestricted —
    // any status from any status, since they hold ultimate authority and
    // every move is still fully audited below.
    const allowed = getAllowedNextStatuses(complaint.status, req.user.role);
    if (status === 'Assigned' && !complaint.assignedOfficer) {
      return res.status(400).json({ message: 'Assign an officer to this complaint first — the status becomes "Assigned" automatically.' });
    }
    if (!allowed.includes(status)) {
      if (req.user.role === 'officer') {
        return res.status(400).json({
          message: `Cannot move a complaint from "${complaint.status}" to "${status}" directly. If this needs to go backward, submit a Status Change Request for Admin approval instead.`,
          requiresStatusChangeRequest: true,
        });
      }
      return res.status(400).json({ message: `Invalid status transition from "${complaint.status}" to "${status}" for your role.` });
    }

    // Super Admin bypassing the normal forward-only path is logged distinctly
    // so the audit trail always makes clear this wasn't a routine update.
    const isOverride = req.user.role === 'super_admin' && !isValidForwardTransition(complaint.status, status);

    const previousStatus = complaint.status;
    complaint.status = status;
    if (remarks) complaint.remarks = remarks;

    // Track when the complaint entered a terminal state — this drives auto-archival.
    if (status === 'Resolved') complaint.resolvedAt = new Date();
    if (TERMINAL_STATUSES.includes(status)) {
      complaint.terminalAt = new Date();
    } else {
      complaint.terminalAt = null;
    }

    const resolutionImages = (req.files || []).map((f) => `/uploads/${f.filename}`);
    if (resolutionImages.length) {
      complaint.resolutionImages.push(...resolutionImages);
    }

    complaint.history.push({
      previousStatus,
      status,
      actionType: isOverride ? 'Other' : 'StatusChange',
      remarks: isOverride ? `[Super Admin override] ${remarks || ''}`.trim() : remarks,
      updatedBy: req.user._id,
      updatedByRole: req.user.role,
    });
    await complaint.save();

    const typeMap = {
      Assigned: 'Complaint Assigned',
      Resolved: 'Complaint Resolved',
      Rejected: 'Complaint Rejected',
    };
    await notify(
      complaint.citizen,
      `Complaint ${complaint.complaintId} updated`,
      `Status changed to ${status}. ${remarks || ''}`.trim(),
      typeMap[status] || 'Complaint Updated',
      complaint._id
    );
    await logActivity({
      actor: req.user, action: `Changed complaint status to ${status}`, targetType: 'Complaint',
      targetId: complaint._id, targetLabel: complaint.complaintId,
      oldValue: previousStatus, newValue: status, reason: remarks, req,
    });

    res.json(complaint);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Permanently delete a complaint (Super Admin only — Admin cannot
//        delete complaints directly, only request it via the Approval Center).
// @route DELETE /api/complaints/delete/:id
const deleteComplaint = async (req, res) => {
  const complaint = await Complaint.findByIdAndDelete(req.params.id);
  if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
  await logActivity({
    actor: req.user, action: 'Deleted complaint', targetType: 'Complaint',
    targetId: complaint._id, targetLabel: complaint.complaintId, req,
  });
  res.json({ message: 'Complaint permanently deleted' });
};

// @desc  Admin/Super Admin assigns (or reassigns) a complaint to a specific
//        department officer. This is the ONLY way a complaint becomes
//        actionable by an officer — officers cannot self-assign.
// @route PUT /api/complaints/assign/:id
const assignOfficer = async (req, res) => {
  try {
    const { officerId } = req.body;
    if (!officerId) return res.status(400).json({ message: 'officerId is required' });

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    if (req.user.role === 'admin' && req.user.department && String(complaint.department) !== String(req.user.department)) {
      return res.status(403).json({ message: 'This complaint is outside your department scope' });
    }

    const officer = await User.findOne({ _id: officerId, role: 'officer' });
    if (!officer) return res.status(400).json({ message: 'Invalid officer' });
    if (officer.approvalStatus !== 'approved' || !officer.isActive) {
      return res.status(400).json({ message: 'This officer account is not yet approved/active' });
    }
    if (String(officer.department) !== String(complaint.department)) {
      return res.status(400).json({ message: "Officer does not belong to this complaint's department" });
    }
    if (!officerCoversComplaint(officer, complaint)) {
      return res.status(400).json({
        message: `${officer.name}'s scope (${describeScope(officer)}) does not cover this complaint's location (${[complaint.district, complaint.state].filter(Boolean).join(', ') || 'not specified'}).`,
      });
    }

    const isReassignment = !!complaint.assignedOfficer;
    const previousOfficer = complaint.assignedOfficer;

    complaint.assignedOfficer = officer._id;
    complaint.assignedBy = req.user._id;
    complaint.assignedAt = new Date();
    complaint.needsAdminAttention = false;
    const previousStatus = complaint.status;
    if (complaint.status === 'Pending' || complaint.status === 'Accepted') {
      complaint.status = 'Assigned';
    }
    complaint.history.push({
      previousStatus,
      status: complaint.status,
      actionType: isReassignment ? 'Reassignment' : 'Assignment',
      remarks: `${isReassignment ? 'Reassigned' : 'Assigned'} to officer ${officer.name} by ${req.user.role}`,
      updatedBy: req.user._id,
      updatedByRole: req.user.role,
    });
    await complaint.save();

    await notify(
      officer._id,
      'New Complaint Assigned',
      `Complaint ${complaint.complaintId} has been assigned to you by the admin.`,
      'Complaint Assigned',
      complaint._id
    );
    await notify(
      complaint.citizen,
      `Complaint ${complaint.complaintId} assigned`,
      `Your complaint has been assigned to an officer and is now being handled.`,
      'Complaint Assigned',
      complaint._id
    );
    await logActivity({
      actor: req.user, action: isReassignment ? 'Reassigned complaint' : 'Assigned complaint', targetType: 'Complaint',
      targetId: complaint._id, targetLabel: complaint.complaintId,
      oldValue: previousOfficer, newValue: officer._id, req,
    });

    res.json(complaint);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Officer escalates an assigned complaint back to admin attention —
//        one of the "real" powers officers get without needing delete/reject
//        rights (e.g. citizen is unresponsive, case needs reassignment, etc).
// @route PUT /api/complaints/escalate/:id
const escalateToAdmin = async (req, res) => {
  try {
    const { note } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    if (!complaint.assignedOfficer || String(complaint.assignedOfficer) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only escalate complaints assigned to you.' });
    }

    complaint.needsAdminAttention = true;
    complaint.escalationNote = note || 'Officer requested admin review';
    complaint.escalatedAt = new Date();
    complaint.history.push({
      previousStatus: complaint.status,
      status: complaint.status,
      actionType: 'Escalation',
      remarks: `Escalated to admin: ${complaint.escalationNote}`,
      updatedBy: req.user._id,
      updatedByRole: req.user.role,
    });
    await complaint.save();

    const admins = await User.find({ role: { $in: ['admin', 'super_admin'] } }).select('_id');
    await Promise.all(
      admins.map((a) =>
        notify(a._id, `Complaint ${complaint.complaintId} escalated`, complaint.escalationNote, 'Complaint Updated', complaint._id)
      )
    );
    await logActivity({
      actor: req.user, action: 'Escalated complaint to admin', targetType: 'Complaint',
      targetId: complaint._id, targetLabel: complaint.complaintId, reason: complaint.escalationNote, req,
    });

    res.json(complaint);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Public complaint tracking — no login required. Returns limited info
//        and only the clean citizen-facing timeline, never internal history.
// @route GET /api/complaints/track/:complaintId
const trackComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findOne({ complaintId: req.params.complaintId.trim().toUpperCase() })
      .populate('department', 'name type')
      .populate('citizen', 'name');

    if (!complaint) return res.status(404).json({ message: 'No complaint found with this ID. Please check and try again.' });

    res.json({
      complaintId: complaint.complaintId,
      title: complaint.title,
      description: complaint.description,
      department: complaint.department,
      category: complaint.category,
      priority: complaint.priority,
      status: complaint.status,
      state: complaint.state,
      district: complaint.district,
      createdAt: complaint.createdAt,
      updatedAt: complaint.updatedAt,
      citizen: complaint.anonymous ? null : complaint.citizen?.name,
      citizenTimeline: buildCitizenTimeline(complaint),
      // Extra tracking info — nothing internal: just whether someone has
      // picked it up and when an already-resolved complaint will auto-close.
      assigned: !!complaint.assignedOfficer,
      resolvedAt: complaint.resolvedAt || null,
      autoCloseAt: autoCloseAtFor(complaint),
      autoCloseHours: AUTO_CLOSE_HOURS,
      autoClosed: !!complaint.autoClosed,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
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
};
