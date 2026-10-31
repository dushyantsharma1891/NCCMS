const crypto = require('crypto');
const User = require('../models/User');
const { officerCoversComplaint, validateScope } = require('../utils/scope');
const Department = require('../models/Department');
const Complaint = require('../models/Complaint');
const ApprovalRequest = require('../models/ApprovalRequest');
const logActivity = require('../utils/auditLog');

// An Admin created with a department scope only ever sees that department's
// data; an Admin created with no department (system-wide) sees everything —
// same pattern used across complaints/officers/reports below.
const deptScope = (req) => (req.user.department ? { department: req.user.department } : {});

// @desc  Admin dashboard stats + charts — scoped to the Admin's department if set
// @route GET /api/admin/dashboard
const adminDashboard = async (req, res) => {
  try {
    const scope = deptScope(req);
    const [totalUsers, totalDepartments, totalComplaints, resolved, pending, officers, states, escalated, pendingApprovals] = await Promise.all([
      User.countDocuments({ role: 'citizen' }),
      req.user.department ? 1 : Department.countDocuments({ isActive: true }),
      Complaint.countDocuments(scope),
      Complaint.countDocuments({ ...scope, status: 'Resolved' }),
      Complaint.countDocuments({ ...scope, status: { $in: ['Pending', 'Accepted', 'Assigned', 'In Progress'] } }),
      User.countDocuments({ role: 'officer', ...(req.user.department ? { department: req.user.department } : {}) }),
      Complaint.distinct('state', scope),
      Complaint.countDocuments({ ...scope, needsAdminAttention: true }),
      ApprovalRequest.countDocuments({ status: 'Pending', requestedBy: req.user._id }),
    ]);

    const departmentWise = await Complaint.aggregate([
      { $match: scope },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'dept' } },
      { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
      { $project: { name: '$dept.name', count: 1 } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const monthly = await Complaint.aggregate([
      { $match: scope },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 },
    ]);

    const categoryWise = await Complaint.aggregate([
      { $match: scope },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const latest = await Complaint.find(scope)
      .populate('department', 'name')
      .populate('citizen', 'name')
      .sort('-createdAt')
      .limit(10);

    res.json({
      cards: { totalUsers, totalDepartments, totalComplaints, resolved, pending, officers, states: states.filter(Boolean).length, escalated, pendingApprovals },
      charts: { departmentWise, monthly, categoryWise },
      latest,
      scopedDepartment: req.user.department || null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Search citizens — Admin can VIEW only (never edit directly; corrections
//        go through POST /api/approvals/citizen-correction). Citizens aren't
//        department-specific, so this search is never scoped.
// @route GET /api/admin/citizens
const searchCitizens = async (req, res) => {
  const filter = { role: 'citizen' };
  const { search, createdFrom, createdTo } = req.query;
  if (search) {
    const regex = { $regex: search, $options: 'i' };
    filter.$or = [
      { name: regex }, { email: regex }, { phone: regex }, { aadhar: regex },
      { district: regex }, { state: regex }, { citizenId: regex },
    ];
  }
  if (createdFrom || createdTo) {
    filter.createdAt = {};
    if (createdFrom) filter.createdAt.$gte = new Date(createdFrom);
    if (createdTo) filter.createdAt.$lte = new Date(createdTo);
  }
  const citizens = await User.find(filter).select('-password').sort('-createdAt');
  res.json(citizens);
};

// @desc  Get officers, optionally filtered by department — used to populate the
//        "assign complaint to officer" dropdown, and the Officers management
//        page. A department-scoped Admin only ever sees their own department's
//        officers, regardless of what's requested.
// @route GET /api/admin/officers
const getOfficers = async (req, res) => {
  const filter = { role: 'officer' };
  // ?complaint=<id> -> only officers who can actually handle THAT complaint:
  // same department AND whose visibility scope covers its state/district.
  let scopeComplaint = null;
  if (req.query.complaint) {
    scopeComplaint = await Complaint.findById(req.query.complaint).select('department state district');
    if (!scopeComplaint) return res.status(404).json({ message: 'Complaint not found' });
  }
  if (req.user.department) filter.department = req.user.department;
  else if (scopeComplaint) filter.department = scopeComplaint.department;
  else if (req.query.department) filter.department = req.query.department;
  if (req.query.all !== 'true') {
    filter.approvalStatus = 'approved';
    filter.isActive = true;
  }
  let officers = await User.find(filter).select('-password').populate('department', 'name').sort('name');
  if (scopeComplaint) officers = officers.filter((o) => officerCoversComplaint(o, scopeComplaint));
  res.json(officers);
};

// @desc  Admin disables/enables an OFFICER account only (never a citizen —
//        citizen account status is a Super Admin power).
// @route PUT /api/admin/officers/:id/toggle
const toggleOfficer = async (req, res) => {
  const officer = await User.findOne({ _id: req.params.id, role: 'officer' });
  if (!officer) return res.status(404).json({ message: 'Officer not found' });
  officer.isActive = !officer.isActive;
  await officer.save();
  await logActivity({ actor: req.user, action: `${officer.isActive ? 'Enabled' : 'Disabled'} officer`, targetType: 'User', targetId: officer._id, targetLabel: officer.employeeId, req });
  res.json({ message: `Officer ${officer.isActive ? 'enabled' : 'disabled'}` });
};

// @desc  Admin updates operational officer info directly — contact details
//        AND their department visibility scope (state/district). Never role
//        or department transfer.
// @route PUT /api/admin/officers/:id
const updateOfficer = async (req, res) => {
  const officer = await User.findOne({ _id: req.params.id, role: 'officer' });
  if (!officer) return res.status(404).json({ message: 'Officer not found' });
  if (req.body.scopeState !== undefined || req.body.scopeDistrict !== undefined) {
    const v = validateScope(req.body.scopeState, req.body.scopeDistrict);
    if (v.error) return res.status(400).json({ message: v.error });
    req.body.scopeState = v.scopeState;
    req.body.scopeDistrict = v.scopeDistrict;
  }
  const fields = ['phone', 'state', 'district', 'scopeState', 'scopeDistrict'];
  const oldValue = {};
  fields.forEach((f) => {
    if (req.body[f] !== undefined) {
      oldValue[f] = officer[f];
      officer[f] = req.body[f];
    }
  });
  await officer.save();
  await logActivity({ actor: req.user, action: 'Updated officer operational info', targetType: 'User', targetId: officer._id, targetLabel: officer.employeeId, oldValue, newValue: req.body, req });
  res.json(officer);
};

// @desc  Admin resets an OFFICER's password directly — no Super Admin
//        approval required for this one action. The new password is only
//        ever returned once, and the officer must change it on next login.
//        Nobody, including Admin, can ever read an existing password.
// @route PUT /api/admin/officers/:id/reset-password
const resetOfficerPassword = async (req, res) => {
  const officer = await User.findOne({ _id: req.params.id, role: 'officer' });
  if (!officer) return res.status(404).json({ message: 'Officer not found' });
  const tempPassword = crypto.randomBytes(6).toString('hex');
  officer.password = tempPassword;
  officer.mustChangePassword = true;
  await officer.save();
  await logActivity({ actor: req.user, action: 'Reset officer password', targetType: 'User', targetId: officer._id, targetLabel: officer.employeeId, req });
  res.json({ message: 'Password reset. Share this temporary password with the officer securely — it will not be shown again.', tempPassword });
};

// @desc  Reports summary (admin) — scoped to their department if set
// @route GET /api/admin/reports
const getReports = async (req, res) => {
  const scope = deptScope(req);
  const byStatus = await Complaint.aggregate([{ $match: scope }, { $group: { _id: '$status', count: { $sum: 1 } } }]);
  const byPriority = await Complaint.aggregate([{ $match: scope }, { $group: { _id: '$priority', count: { $sum: 1 } } }]);
  const byState = await Complaint.aggregate([{ $match: scope }, { $group: { _id: '$state', count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
  res.json({ byStatus, byPriority, byState });
};

module.exports = { adminDashboard, searchCitizens, getOfficers, toggleOfficer, updateOfficer, resetOfficerPassword, getReports };
