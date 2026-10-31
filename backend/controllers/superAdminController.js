const crypto = require('crypto');
const User = require('../models/User');
const { applyAccountDefaults } = require('../utils/accountDefaults');
const { validateScope } = require('../utils/scope');
const Department = require('../models/Department');
const Complaint = require('../models/Complaint');
const ApprovalRequest = require('../models/ApprovalRequest');
const ActivityLog = require('../models/ActivityLog');
const HelplineTicket = require('../models/HelplineTicket');
const generateAdminId = require('../utils/adminId');
const generateEmployeeId = require('../utils/employeeId');
const logActivity = require('../utils/auditLog');

const generateCitizenId = async () => {
  const count = await User.countDocuments({ role: 'citizen' });
  return `CIT-${String(count + 1).padStart(6, '0')}`;
};

// @desc  Super Admin dashboard — system-wide cards + charts
// @route GET /api/super-admin/dashboard
const dashboard = async (req, res) => {
  try {
    const [
      totalCitizens, totalOfficers, totalAdmins, totalDepartments, totalComplaints,
      pendingApprovals, pendingComplaints, resolvedComplaints, escalatedComplaints,
      rejectedComplaints, closedComplaints, anonymousComplaints,
    ] = await Promise.all([
      User.countDocuments({ role: 'citizen' }),
      User.countDocuments({ role: 'officer' }),
      User.countDocuments({ role: 'admin' }),
      Department.countDocuments({ isActive: true }),
      Complaint.countDocuments(),
      ApprovalRequest.countDocuments({ status: 'Pending' }),
      Complaint.countDocuments({ status: { $in: ['Pending', 'Assigned', 'Accepted', 'In Progress'] } }),
      Complaint.countDocuments({ status: 'Resolved' }),
      Complaint.countDocuments({ needsAdminAttention: true }),
      Complaint.countDocuments({ status: 'Rejected' }),
      Complaint.countDocuments({ status: 'Closed' }),
      Complaint.countDocuments({ anonymous: true }),
    ]);

    const departmentWise = await Complaint.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'dept' } },
      { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
      { $project: { name: '$dept.name', count: 1 } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const statusDistribution = await Complaint.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);

    const monthly = await Complaint.aggregate([
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 },
    ]);

    const officerPerformance = await Complaint.aggregate([
      { $match: { assignedOfficer: { $ne: null }, status: 'Resolved' } },
      { $group: { _id: '$assignedOfficer', resolved: { $sum: 1 } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'officer' } },
      { $unwind: { path: '$officer', preserveNullAndEmptyArrays: true } },
      { $project: { name: '$officer.name', employeeId: '$officer.employeeId', resolved: 1 } },
      { $sort: { resolved: -1 } },
      { $limit: 10 },
    ]);

    const recentComplaints = await Complaint.find().populate('department', 'name').populate('citizen', 'name').sort('-createdAt').limit(8);
    const pendingApprovalsList = await ApprovalRequest.find({ status: 'Pending' }).populate('requestedBy', 'name role').sort('-createdAt').limit(8);
    const recentActivity = await ActivityLog.find().sort('-createdAt').limit(15);
    const helplineQueue = await HelplineTicket.find({ status: { $in: ['New', 'Assigned', 'In Progress', 'Escalated'] } }).sort('-createdAt').limit(8);

    res.json({
      cards: {
        totalCitizens, totalOfficers, totalAdmins, totalDepartments, totalComplaints,
        pendingApprovals, pendingComplaints, resolvedComplaints, escalatedComplaints,
        rejectedComplaints, closedComplaints, anonymousComplaints,
      },
      charts: { departmentWise, statusDistribution, monthly, officerPerformance },
      recentComplaints, pendingApprovalsList, recentActivity, helplineQueue,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ============================= ADMINS =============================

// @desc  Super Admin creates an Admin account directly (no approval needed —
//        Super Admin IS the approving authority). Optionally scoped to one
//        department, or left system-wide.
// @route POST /api/super-admin/admins
const createAdmin = async (req, res) => {
  try {
    const { department, state, district } = req.body;
    const adminId = await generateAdminId();
    // Name / e-mail / password are all optional — blanks get safe defaults.
    const { name, email, password, generated } = applyAccountDefaults(req.body, 'Admin', adminId);
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'An account with this email already exists' });

    const admin = await User.create({
      name, email, password, department: department || undefined, state, district,
      adminId, role: 'admin', createdBy: req.user._id, mustChangePassword: !!generated.password,
    });

    await logActivity({
      actor: req.user, action: 'Created Admin', targetType: 'User',
      targetId: admin._id, targetLabel: adminId, newValue: { name, email }, req,
    });

    res.status(201).json({
      _id: admin._id, name, email, adminId, role: 'admin',
      generated, tempPassword: generated.password ? password : undefined,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Update an admin's profile/scope (including department scope — set to
//        empty/null for system-wide access)
// @route PUT /api/super-admin/admins/:id
const updateAdmin = async (req, res) => {
  const admin = await User.findOne({ _id: req.params.id, role: 'admin' });
  if (!admin) return res.status(404).json({ message: 'Admin not found' });
  const fields = ['name', 'phone', 'department', 'state', 'district'];
  const oldValue = {};
  fields.forEach((f) => {
    if (req.body[f] !== undefined) {
      oldValue[f] = admin[f];
      admin[f] = req.body[f] || undefined;
    }
  });
  await admin.save();
  await logActivity({ actor: req.user, action: 'Edited Admin profile', targetType: 'User', targetId: admin._id, targetLabel: admin.adminId, oldValue, newValue: req.body, req });
  res.json(admin);
};

// @desc  Permanently delete an admin (Super Admin only — no approval needed)
// @route DELETE /api/super-admin/admins/:id
const deleteAdmin = async (req, res) => {
  const admin = await User.findOneAndDelete({ _id: req.params.id, role: 'admin' });
  if (!admin) return res.status(404).json({ message: 'Admin not found' });
  await logActivity({ actor: req.user, action: 'Deleted Admin', targetType: 'User', targetId: admin._id, targetLabel: admin.adminId, req });
  res.json({ message: 'Admin permanently deleted' });
};

// ============================= OFFICERS =============================

// @desc  Super Admin creates an Officer account directly — active immediately,
//        no approval needed (unlike the Admin-initiated request flow).
// @route POST /api/super-admin/officers
const createOfficer = async (req, res) => {
  try {
    const { department, state, district } = req.body;
    const scopeCheck = validateScope(req.body.scopeState, req.body.scopeDistrict);
    if (scopeCheck.error) return res.status(400).json({ message: scopeCheck.error });
    const { scopeState, scopeDistrict } = scopeCheck;
    // Only the department is genuinely needed (it decides which complaints
    // the officer handles). Name / e-mail / password / scope are optional.
    if (!department) return res.status(400).json({ message: 'Please choose a department for the officer' });
    const dept = await Department.findById(department);
    if (!dept) return res.status(400).json({ message: 'Invalid department' });

    const employeeId = await generateEmployeeId(dept.name);
    const { name, email, password, generated } = applyAccountDefaults(req.body, 'Officer', employeeId);
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'An account with this email already exists' });

    const officer = await User.create({
      name, email, password, department, employeeId, state, district,
      scopeState, scopeDistrict,
      role: 'officer', approvalStatus: 'approved', isActive: true, createdBy: req.user._id,
      mustChangePassword: !!generated.password,
    });

    await logActivity({ actor: req.user, action: 'Created Officer', targetType: 'User', targetId: officer._id, targetLabel: employeeId, newValue: { name, email, department: dept.name }, req });
    res.status(201).json({
      _id: officer._id, name, email, employeeId, role: 'officer',
      generated, tempPassword: generated.password ? password : undefined,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Permanently delete an officer (Super Admin only — no approval needed)
// @route DELETE /api/super-admin/officers/:id
const deleteOfficer = async (req, res) => {
  const officer = await User.findOneAndDelete({ _id: req.params.id, role: 'officer' });
  if (!officer) return res.status(404).json({ message: 'Officer not found' });
  await logActivity({ actor: req.user, action: 'Deleted Officer', targetType: 'User', targetId: officer._id, targetLabel: officer.employeeId, req });
  res.json({ message: 'Officer permanently deleted' });
};

// ============================= CITIZENS =============================

// @desc  Super Admin creates a citizen account directly (rarely needed, but
//        available — e.g. registering someone without internet access).
// @route POST /api/super-admin/citizens
const createCitizen = async (req, res) => {
  try {
    const { phone, state, district, address, pincode } = req.body;
    const citizenId = await generateCitizenId();
    const { name, email, password, generated } = applyAccountDefaults(req.body, 'Citizen', citizenId);
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'An account with this email already exists' });

    const citizen = await User.create({
      name, email, password, phone, state, district, address, pincode,
      citizenId, role: 'citizen', createdBy: req.user._id, mustChangePassword: !!generated.password,
    });

    await logActivity({ actor: req.user, action: 'Created Citizen', targetType: 'User', targetId: citizen._id, targetLabel: citizenId, newValue: { name, email }, req });
    res.status(201).json({
      _id: citizen._id, name, email, citizenId, role: 'citizen',
      generated, tempPassword: generated.password ? password : undefined,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Permanently delete a citizen (Super Admin only — no approval needed)
// @route DELETE /api/super-admin/citizens/:id
const deleteCitizen = async (req, res) => {
  const citizen = await User.findOneAndDelete({ _id: req.params.id, role: 'citizen' });
  if (!citizen) return res.status(404).json({ message: 'Citizen not found' });
  await logActivity({ actor: req.user, action: 'Deleted Citizen', targetType: 'User', targetId: citizen._id, targetLabel: citizen.citizenId, req });
  res.json({ message: 'Citizen permanently deleted' });
};

// ============================= SHARED USER MANAGEMENT =============================

// @desc  Super Admin edits ANY user profile (citizen/officer/admin) directly,
//        including an officer's visibility scope (scopeState/scopeDistrict)
//        and an admin's department scope.
// @route PUT /api/super-admin/users/:id
const editUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (req.body.scopeState !== undefined || req.body.scopeDistrict !== undefined) {
    const v = validateScope(req.body.scopeState, req.body.scopeDistrict);
    if (v.error) return res.status(400).json({ message: v.error });
    req.body.scopeState = v.scopeState;
    req.body.scopeDistrict = v.scopeDistrict;
  }
  const fields = ['name', 'phone', 'address', 'state', 'district', 'pincode', 'department', 'scopeState', 'scopeDistrict'];
  const oldValue = {};
  fields.forEach((f) => {
    if (req.body[f] !== undefined) {
      oldValue[f] = user[f];
      user[f] = req.body[f] || (f === 'department' ? undefined : '');
    }
  });
  await user.save();
  await logActivity({ actor: req.user, action: `Edited ${user.role} profile`, targetType: 'User', targetId: user._id, targetLabel: user.name, oldValue, newValue: req.body, req });
  res.json(user);
};

// @desc  Activate/deactivate any account
// @route PUT /api/super-admin/users/:id/toggle
const toggleUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (String(user._id) === String(req.user._id)) {
    return res.status(400).json({ message: 'You cannot deactivate your own account.' });
  }
  user.isActive = !user.isActive;
  await user.save();
  await logActivity({ actor: req.user, action: `${user.isActive ? 'Activated' : 'Deactivated'} account`, targetType: 'User', targetId: user._id, targetLabel: user.name, req });
  res.json({ message: `Account ${user.isActive ? 'activated' : 'deactivated'}` });
};

// @desc  Reset a user's password — Super Admin never sees or sets the actual
//        plaintext long-term; this generates a temporary password (shown once)
//        and forces a change on next login. Password remains bcrypt-hashed —
//        this is a firm rule with no exception, even for the Super Admin.
// @route PUT /api/super-admin/users/:id/reset-password
const resetPassword = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const tempPassword = crypto.randomBytes(6).toString('hex');
  user.password = tempPassword; // hashed by the pre-save hook
  user.mustChangePassword = true;
  await user.save();

  await logActivity({ actor: req.user, action: 'Reset password', targetType: 'User', targetId: user._id, targetLabel: user.name, req });
  res.json({ message: 'Password reset. Share this temporary password with the user securely — it will not be shown again.', tempPassword });
};

// @desc  Force a password change on next login without resetting it now.
// @route PUT /api/super-admin/users/:id/force-change
const forcePasswordChange = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  user.mustChangePassword = true;
  await user.save();
  await logActivity({ actor: req.user, action: 'Forced password change', targetType: 'User', targetId: user._id, targetLabel: user.name, req });
  res.json({ message: 'User will be required to change their password on next login.' });
};

// @desc  List/search users of ONE role (citizens, officers, or admins) with
//        account status, last login, and creation-date range filtering.
//        Never returns the password field.
// @route GET /api/super-admin/users
const listUsers = async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  const { search, createdFrom, createdTo, lastLoginFrom, lastLoginTo, status } = req.query;
  if (search) {
    const regex = { $regex: search, $options: 'i' };
    filter.$or = [
      { name: regex }, { email: regex }, { phone: regex }, { district: regex },
      { state: regex }, { employeeId: regex }, { adminId: regex }, { citizenId: regex },
    ];
  }
  if (createdFrom || createdTo) {
    filter.createdAt = {};
    if (createdFrom) filter.createdAt.$gte = new Date(createdFrom);
    if (createdTo) filter.createdAt.$lte = new Date(createdTo);
  }
  if (lastLoginFrom || lastLoginTo) {
    filter.lastLogin = {};
    if (lastLoginFrom) filter.lastLogin.$gte = new Date(lastLoginFrom);
    if (lastLoginTo) filter.lastLogin.$lte = new Date(lastLoginTo);
  }
  if (status === 'active') filter.isActive = true;
  if (status === 'inactive') filter.isActive = false;
  if (status === 'pending') filter.approvalStatus = 'pending';

  const users = await User.find(filter).select('-password').populate('department', 'name').sort('-createdAt');
  res.json(users);
};

// @desc  Global universal search across citizens, officers, admins, complaints, departments
// @route GET /api/super-admin/search
const globalSearch = async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) return res.json({ results: [] });
  const regex = { $regex: q.trim(), $options: 'i' };

  const [users, complaints, departments] = await Promise.all([
    User.find({ $or: [{ name: regex }, { email: regex }, { phone: regex }, { employeeId: regex }, { adminId: regex }, { citizenId: regex }] })
      .select('name email role employeeId adminId citizenId department isActive').populate('department', 'name').limit(15),
    Complaint.find({ $or: [{ complaintId: regex }, { title: regex }] }).select('complaintId title status department').populate('department', 'name').limit(15),
    Department.find({ name: regex }).select('name type isActive').limit(10),
  ]);

  const results = [
    ...users.map((u) => ({ entityType: u.role, id: u.employeeId || u.adminId || u.citizenId || u._id, name: u.name, department: u.department?.name, status: u.isActive ? 'Active' : 'Inactive', _id: u._id })),
    ...complaints.map((c) => ({ entityType: 'complaint', id: c.complaintId, name: c.title, department: c.department?.name, status: c.status, _id: c._id })),
    ...departments.map((d) => ({ entityType: 'department', id: d._id, name: d.name, department: d.type, status: d.isActive ? 'Active' : 'Inactive', _id: d._id })),
  ];

  res.json({ results });
};

// @desc  View a user's activity/audit history
// @route GET /api/super-admin/users/:id/activity
const userActivity = async (req, res) => {
  const logs = await ActivityLog.find({ actor: req.params.id }).sort('-createdAt').limit(200);
  res.json(logs);
};

// @desc  System-wide activity log with filters
// @route GET /api/super-admin/activity
const systemActivity = async (req, res) => {
  const filter = {};
  if (req.query.actorRole) filter.actorRole = req.query.actorRole;
  if (req.query.targetType) filter.targetType = req.query.targetType;
  const { from, to } = req.query;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }
  const logs = await ActivityLog.find(filter).sort('-createdAt').limit(300);
  res.json(logs);
};

module.exports = {
  dashboard,
  createAdmin, updateAdmin, deleteAdmin,
  createOfficer, deleteOfficer,
  createCitizen, deleteCitizen,
  editUser, toggleUser, resetPassword, forcePasswordChange,
  listUsers, globalSearch, userActivity, systemActivity,
};
