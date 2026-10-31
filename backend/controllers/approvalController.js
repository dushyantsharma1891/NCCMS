const ApprovalRequest = require('../models/ApprovalRequest');
const User = require('../models/User');
const Department = require('../models/Department');
const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const generateRequestId = require('../utils/requestId');
const generateEmployeeId = require('../utils/employeeId');
const { applyAccountDefaults } = require('../utils/accountDefaults');
const { validateScope } = require('../utils/scope');
const logActivity = require('../utils/auditLog');

const notifySuperAdmins = async (title, message) => {
  const superAdmins = await User.find({ role: 'super_admin' }).select('_id');
  await Promise.all(superAdmins.map((s) => Notification.create({ user: s._id, title, message, type: 'Complaint Updated' })));
};

// @desc  Admin requests creation of a new Officer account. The account is
//        created immediately but stays inactive/pending until a Super Admin
//        approves it — this is what "requires Super Admin approval" means.
// @route POST /api/approvals/officer
const requestCreateOfficer = async (req, res) => {
  try {
    const { department, state, district } = req.body;
    if (!department) return res.status(400).json({ message: 'Please choose a department for the officer' });
    const scopeCheck = validateScope(req.body.scopeState, req.body.scopeDistrict);
    if (scopeCheck.error) return res.status(400).json({ message: scopeCheck.error });

    const dept = await Department.findById(department);
    if (!dept) return res.status(400).json({ message: 'Invalid department' });

    const employeeId = await generateEmployeeId(dept.name);
    // Name / e-mail / password are optional — blanks get safe generated defaults.
    const { name, email, password, generated } = applyAccountDefaults(req.body, 'Officer', employeeId);

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'An account with this email already exists' });

    const officer = await User.create({
      name, email, password, department, employeeId, state, district,
      scopeState: scopeCheck.scopeState, scopeDistrict: scopeCheck.scopeDistrict,
      role: 'officer',
      isActive: false,
      approvalStatus: 'pending',
      createdBy: req.user._id,
      mustChangePassword: !!generated.password,
    });

    const requestId = await generateRequestId(ApprovalRequest, 'requestId', 'APR');
    const request = await ApprovalRequest.create({
      requestId,
      type: 'create_officer',
      requestedBy: req.user._id,
      requestedByRole: req.user.role,
      targetType: 'User',
      targetId: officer._id,
      oldValue: null,
      newValue: { name, email, employeeId, department: dept.name, state, district },
      reason: req.body.reason || 'New officer account requested',
    });

    await notifySuperAdmins(
      'New officer approval request',
      `${req.user.name} requested creation of officer ${employeeId} (${name}) in ${dept.name}.`
    );
    await logActivity({
      actor: req.user, action: 'Requested officer creation', targetType: 'User',
      targetId: officer._id, targetLabel: employeeId, newValue: { name, email, department: dept.name }, req,
    });

    res.status(201).json({
      request, officer: { _id: officer._id, name, email, employeeId, approvalStatus: 'pending' },
      generated, tempPassword: generated.password ? password : undefined,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Admin requests a citizen profile correction (Admin cannot edit citizen
//        profiles directly).
// @route POST /api/approvals/citizen-correction
const requestCitizenCorrection = async (req, res) => {
  try {
    const { citizenId, fields, reason } = req.body;
    if (!citizenId || !fields || !reason) {
      return res.status(400).json({ message: 'citizenId, fields and reason are required' });
    }
    const citizen = await User.findOne({ _id: citizenId, role: 'citizen' });
    if (!citizen) return res.status(404).json({ message: 'Citizen not found' });

    const oldValue = {};
    Object.keys(fields).forEach((k) => { oldValue[k] = citizen[k]; });

    const requestId = await generateRequestId(ApprovalRequest, 'requestId', 'APR');
    const request = await ApprovalRequest.create({
      requestId,
      type: 'citizen_profile_correction',
      requestedBy: req.user._id,
      requestedByRole: req.user.role,
      targetType: 'User',
      targetId: citizen._id,
      oldValue,
      newValue: fields,
      reason,
    });

    await notifySuperAdmins('Citizen profile correction requested', `${req.user.name} requested a profile correction for ${citizen.name}.`);
    await logActivity({
      actor: req.user, action: 'Requested citizen profile correction', targetType: 'User',
      targetId: citizen._id, targetLabel: citizen.name, oldValue, newValue: fields, reason, req,
    });

    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Admin proposes a change to ANY department field (name, logo, chief,
//        contact info, working hours, etc). Admin can never write a
//        department directly — every change, big or small, goes to the
//        Super Admin for approval, remark, and sign-off.
// @route POST /api/approvals/department
const requestDepartmentUpdate = async (req, res) => {
  try {
    const { departmentId, fields, reason } = req.body;
    if (!departmentId || !fields || Object.keys(fields).length === 0) {
      return res.status(400).json({ message: 'departmentId and at least one field are required' });
    }
    const dept = await Department.findById(departmentId);
    if (!dept) return res.status(404).json({ message: 'Department not found' });

    const oldValue = {};
    Object.keys(fields).forEach((k) => { oldValue[k] = dept[k]; });

    const requestId = await generateRequestId(ApprovalRequest, 'requestId', 'APR');
    const request = await ApprovalRequest.create({
      requestId,
      type: 'department_update',
      requestedBy: req.user._id,
      requestedByRole: req.user.role,
      targetType: 'Department',
      targetId: dept._id,
      oldValue,
      newValue: fields,
      reason: reason || 'Department information update requested',
    });

    await notifySuperAdmins('Department update requested', `${req.user.name} requested an update to ${dept.name}.`);
    await logActivity({
      actor: req.user, action: 'Requested department update', targetType: 'Department',
      targetId: dept._id, targetLabel: dept.name, oldValue, newValue: fields, reason, req,
    });

    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Admin proposes an edit to a complaint's details (title, description,
//        category, priority, location). Admin can never write a complaint
//        directly — every edit, however small, goes to the Super Admin.
// @route POST /api/approvals/complaint-edit
const requestComplaintEdit = async (req, res) => {
  try {
    const { complaintId, fields, reason } = req.body;
    if (!complaintId || !fields || Object.keys(fields).length === 0) {
      return res.status(400).json({ message: 'complaintId and at least one field are required' });
    }
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    if (req.user.department && String(complaint.department) !== String(req.user.department)) {
      return res.status(403).json({ message: 'This complaint is outside your department scope' });
    }

    const oldValue = {};
    Object.keys(fields).forEach((k) => { oldValue[k] = complaint[k]; });

    const requestId = await generateRequestId(ApprovalRequest, 'requestId', 'APR');
    const request = await ApprovalRequest.create({
      requestId,
      type: 'complaint_edit',
      requestedBy: req.user._id,
      requestedByRole: req.user.role,
      targetType: 'Complaint',
      targetId: complaint._id,
      oldValue,
      newValue: fields,
      reason: reason || 'Complaint edit requested',
    });

    await notifySuperAdmins('Complaint edit requested', `${req.user.name} requested an edit to ${complaint.complaintId}.`);
    await logActivity({
      actor: req.user, action: 'Requested complaint edit', targetType: 'Complaint',
      targetId: complaint._id, targetLabel: complaint.complaintId, oldValue, newValue: fields, reason, req,
    });

    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Shared helper for the three delete-request endpoints below — Admin cannot
// delete citizens, officers, or complaints directly, only request it.
const createDeleteRequest = async ({ req, res, type, Model, roleFilter, targetType, labelField }) => {
  try {
    const { targetId, reason } = req.body;
    if (!targetId || !reason) return res.status(400).json({ message: 'targetId and reason are required' });

    const query = roleFilter ? { _id: targetId, role: roleFilter } : { _id: targetId };
    const target = await Model.findOne(query);
    if (!target) return res.status(404).json({ message: 'Record not found' });

    const requestId = await generateRequestId(ApprovalRequest, 'requestId', 'APR');
    const request = await ApprovalRequest.create({
      requestId,
      type,
      requestedBy: req.user._id,
      requestedByRole: req.user.role,
      targetType,
      targetId: target._id,
      oldValue: { label: target[labelField] || target.complaintId || target.name },
      newValue: null,
      reason,
    });

    await notifySuperAdmins(`Deletion requested — ${type.replace('delete_', '')}`, `${req.user.name} requested deleting ${target[labelField] || target.complaintId || target.name}. Reason: ${reason}`);
    await logActivity({
      actor: req.user, action: `Requested deletion of ${type.replace('delete_', '')}`, targetType,
      targetId: target._id, targetLabel: target[labelField] || target.complaintId || target.name, reason, req,
    });

    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Admin requests permanent deletion of a citizen account
// @route POST /api/approvals/delete-citizen
const requestDeleteCitizen = (req, res) => createDeleteRequest({
  req, res, type: 'delete_citizen', Model: User, roleFilter: 'citizen', targetType: 'User', labelField: 'name',
});

// @desc  Admin requests permanent deletion of an officer account
// @route POST /api/approvals/delete-officer
const requestDeleteOfficer = (req, res) => createDeleteRequest({
  req, res, type: 'delete_officer', Model: User, roleFilter: 'officer', targetType: 'User', labelField: 'name',
});

// @desc  Admin requests permanent deletion of a complaint
// @route POST /api/approvals/delete-complaint
const requestDeleteComplaint = (req, res) => createDeleteRequest({
  req, res, type: 'delete_complaint', Model: Complaint, roleFilter: null, targetType: 'Complaint', labelField: 'title',
});

// @desc  List approval requests (Super Admin sees all; Admin sees own)
// @route GET /api/approvals
const listApprovals = async (req, res) => {
  const filter = {};
  if (req.user.role === 'admin') filter.requestedBy = req.user._id;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;

  const requests = await ApprovalRequest.find(filter)
    .populate('requestedBy', 'name role adminId')
    .populate('reviewedBy', 'name role')
    .sort('-createdAt');
  res.json(requests);
};

// @desc  Super Admin approves a request — applies the change to the underlying record.
// @route PUT /api/approvals/:id/approve
const approveRequest = async (req, res) => {
  try {
    const { remark } = req.body;
    const request = await ApprovalRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'Pending') return res.status(400).json({ message: `Already ${request.status.toLowerCase()}` });

    if (request.type === 'create_officer') {
      const officer = await User.findById(request.targetId);
      if (officer) {
        officer.isActive = true;
        officer.approvalStatus = 'approved';
        await officer.save();
        await Notification.create({
          user: officer._id, title: 'Account approved', message: 'Your officer account has been approved and activated.', type: 'Complaint Updated',
        });
      }
    } else if (request.type === 'citizen_profile_correction') {
      const citizen = await User.findById(request.targetId);
      if (citizen) {
        Object.entries(request.newValue || {}).forEach(([k, v]) => { citizen[k] = v; });
        await citizen.save();
        await Notification.create({
          user: citizen._id, title: 'Profile updated', message: 'Your profile correction request was approved.', type: 'Complaint Updated',
        });
      }
    } else if (request.type === 'department_update') {
      const dept = await Department.findById(request.targetId);
      if (dept) {
        Object.entries(request.newValue || {}).forEach(([k, v]) => { dept[k] = v; });
        await dept.save();
      }
    } else if (request.type === 'delete_citizen' || request.type === 'delete_officer') {
      await User.findByIdAndDelete(request.targetId);
    } else if (request.type === 'delete_complaint') {
      await Complaint.findByIdAndDelete(request.targetId);
    } else if (request.type === 'complaint_edit') {
      const complaint = await Complaint.findById(request.targetId);
      if (complaint) {
        Object.entries(request.newValue || {}).forEach(([k, v]) => { complaint[k] = v; });
        complaint.history.push({
          previousStatus: complaint.status,
          status: complaint.status,
          actionType: 'Edit',
          remarks: `Admin-proposed edit approved by Super Admin. ${remark || ''}`.trim(),
          reason: request.reason,
          requestId: request.requestId,
          approvedBy: req.user._id,
          updatedBy: req.user._id,
          updatedByRole: req.user.role,
        });
        await complaint.save();
      }
    }

    request.status = 'Approved';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    request.reviewRemark = remark || '';
    await request.save();

    await logActivity({
      actor: req.user, action: `Approved ${request.type} request`, targetType: request.targetType,
      targetId: request.targetId, targetLabel: request.requestId, reason: remark, req,
    });

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Super Admin rejects a request — underlying record is left untouched
//        (an officer created pending stays inactive; nothing is applied or deleted).
// @route PUT /api/approvals/:id/reject
const rejectRequest = async (req, res) => {
  try {
    const { remark } = req.body;
    const request = await ApprovalRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'Pending') return res.status(400).json({ message: `Already ${request.status.toLowerCase()}` });

    if (request.type === 'create_officer') {
      const officer = await User.findById(request.targetId);
      if (officer) {
        officer.approvalStatus = 'rejected';
        officer.isActive = false;
        await officer.save();
      }
    }

    request.status = 'Rejected';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    request.reviewRemark = remark || '';
    await request.save();

    await logActivity({
      actor: req.user, action: `Rejected ${request.type} request`, targetType: request.targetType,
      targetId: request.targetId, targetLabel: request.requestId, reason: remark, req,
    });

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
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
};
