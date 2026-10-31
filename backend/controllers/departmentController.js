const Department = require('../models/Department');
const Category = require('../models/Category');
const SiteSettings = require('../models/SiteSettings');
const User = require('../models/User');
const Notification = require('../models/Notification');
const HelplineTicket = require('../models/HelplineTicket');
const logActivity = require('../utils/auditLog');

// If no custom logo is supplied, auto-brand the department: Central
// Government departments get the national emblem, State Government
// departments get their own state's emblem (when configured by Super Admin
// in Settings). Never overrides a logo someone explicitly set.
const applyAutoEmblem = async (payload) => {
  if (payload.logo) return payload;
  if (!payload.type) return payload;
  const settings = await SiteSettings.getSingleton();
  if (payload.type === 'Central Government' && settings.centralEmblem) {
    payload.logo = settings.centralEmblem;
  } else if (payload.type === 'State Government' && payload.state) {
    const emblem = settings.stateEmblems.get(payload.state);
    if (emblem) payload.logo = emblem;
  }
  return payload;
};

// @desc  Get all departments (optionally filter by type) — public, but
//        personalizes for logged-in citizens: State Government departments
//        only show if they match the citizen's own state (some states have
//        a Grievance or Women's department, others don't — a citizen should
//        only ever see the offerings that actually apply to them). Central,
//        Public Sector and Private Sector departments are always shown to
//        everyone. Non-citizen viewers (Admin/Officer/Super Admin, or a
//        logged-out visitor) see everything, since they need full visibility.
// @route GET /api/departments
const getDepartments = async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.type) filter.type = req.query.type;

    if (req.user?.role === 'citizen' && req.user.state) {
      filter.$or = [
        { type: { $ne: 'State Government' } },
        { type: 'State Government', state: { $in: [req.user.state, 'All India'] } },
      ];
    }

    const departments = await Department.find(filter).sort('name');
    res.json(departments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Get a single department's full public profile — chief, leadership,
//        team, contact info, website. Viewable by citizens and officers.
// @route GET /api/departments/:id
const getDepartmentById = async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id).populate('complaintHead', 'name employeeId');
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    res.json(dept);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Give ONE officer of a department the "Complaint Head" rank (or clear
//        it by sending officerId: null). Citizens using the department
//        helpline are connected directly to this officer. Admin (for their own
//        department) and Super Admin can do this.
// @route PUT /api/departments/:id/complaint-head
const setComplaintHead = async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    if (req.user.role === 'admin' && req.user.department && String(req.user.department) !== String(dept._id)) {
      return res.status(403).json({ message: 'You can only manage the Complaint Head of your own department' });
    }

    const { officerId } = req.body;
    const previousHeadId = dept.complaintHead;
    let officer = null;
    if (officerId) {
      officer = await User.findOne({ _id: officerId, role: 'officer', department: dept._id });
      if (!officer) return res.status(400).json({ message: 'That officer does not belong to this department' });
      if (!officer.isActive || officer.approvalStatus !== 'approved') {
        return res.status(400).json({ message: 'Only an active, approved officer can be Complaint Head' });
      }
    }

    // Exactly one head per department: clear the old flag first.
    await User.updateMany({ role: 'officer', department: dept._id, isComplaintHead: true }, { isComplaintHead: false });
    dept.complaintHead = officer ? officer._id : null;
    if (officer) {
      // The flag was just cleared in the database above, so write it back
      // explicitly — `officer` was loaded before the clear and may already
      // hold `true` in memory (re-designating the current head), in which
      // case save() would see "no change" and skip the write.
      await User.updateOne({ _id: officer._id }, { isComplaintHead: true });
      officer.isComplaintHead = true;
      // Keep the public "Complaint Officer Head" profile in step with the real account.
      dept.complaintOfficerHead = {
        ...(dept.complaintOfficerHead?.toObject?.() || dept.complaintOfficerHead || {}),
        name: officer.name, employeeId: officer.employeeId, designation: 'Complaint Head',
        email: dept.complaintOfficerHead?.email || officer.email,
      };
      await Notification.create({
        user: officer._id, title: 'You are now Complaint Head',
        message: `You have been designated Complaint Head of ${dept.name}. Citizens who use the department helpline will now reach you — open "Department Helpline" in your menu. Please log in again to refresh your menu.`,
        type: 'Complaint Updated',
      });
      // Open department-helpline questions move to the new head.
      await HelplineTicket.updateMany(
        { channel: 'department', department: dept._id, status: { $ne: 'Resolved' } },
        { assignedOfficer: officer._id, unreadByOfficer: true }
      );
    }
    await dept.save();

    await logActivity({
      actor: req.user, action: officer ? 'Designated Complaint Head' : 'Removed Complaint Head',
      targetType: 'Department', targetId: dept._id, targetLabel: dept.name,
      oldValue: previousHeadId ? String(previousHeadId) : null, newValue: officer ? officer.employeeId : null, req,
    });
    res.json({ message: officer ? `${officer.name} is now Complaint Head of ${dept.name}` : 'Complaint Head removed', complaintHead: officer ? { _id: officer._id, name: officer.name, employeeId: officer.employeeId } : null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Get all categories
// @route GET /api/departments/categories
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort('name');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Create department (Super Admin only — Admin can never create a department)
// @route POST /api/departments
const createDepartment = async (req, res) => {
  try {
    const payload = await applyAutoEmblem({ ...req.body });
    const dept = await Department.create(payload);
    await logActivity({ actor: req.user, action: 'Created department', targetType: 'Department', targetId: dept._id, targetLabel: dept.name, req });
    res.status(201).json(dept);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc  Super Admin updates ANY field on a department directly — this is the
//        ONLY way a department is ever written to. Admin has no direct write
//        route at all; every Admin-proposed change (however small) goes
//        through POST /api/approvals/department and lands here only once
//        approved.
// @route PUT /api/departments/:id
const updateDepartment = async (req, res) => {
  const payload = await applyAutoEmblem({ ...req.body });
  const dept = await Department.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
  if (!dept) return res.status(404).json({ message: 'Department not found' });
  await logActivity({ actor: req.user, action: 'Updated department', targetType: 'Department', targetId: dept._id, targetLabel: dept.name, newValue: req.body, req });
  res.json(dept);
};

// @desc  Deactivate department — soft-hide it without losing complaint history (Super Admin only)
// @route PUT /api/departments/:id/deactivate
const deactivateDepartment = async (req, res) => {
  const dept = await Department.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!dept) return res.status(404).json({ message: 'Department not found' });
  await logActivity({ actor: req.user, action: 'Deactivated department', targetType: 'Department', targetId: dept._id, targetLabel: dept.name, req });
  res.json({ message: 'Department deactivated' });
};

// @desc  Permanently delete a department (Super Admin only). Existing
//        complaints keep a dangling reference for audit purposes.
// @route DELETE /api/departments/:id
const deleteDepartment = async (req, res) => {
  const dept = await Department.findByIdAndDelete(req.params.id);
  if (!dept) return res.status(404).json({ message: 'Department not found' });
  await logActivity({ actor: req.user, action: 'Deleted department', targetType: 'Department', targetId: dept._id, targetLabel: dept.name, req });
  res.json({ message: 'Department permanently deleted' });
};

// @desc  Create a complaint category (Super Admin only)
// @route POST /api/departments/categories
const createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Category name is required' });
    const category = await Category.create({ name });
    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc  Permanently delete a complaint category (Super Admin only)
// @route DELETE /api/departments/categories/:id
const deleteCategory = async (req, res) => {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) return res.status(404).json({ message: 'Category not found' });
  res.json({ message: 'Category permanently deleted' });
};

module.exports = {
  getDepartments,
  getDepartmentById,
  setComplaintHead,
  getCategories,
  createDepartment,
  updateDepartment,
  deactivateDepartment,
  deleteDepartment,
  createCategory,
  deleteCategory,
};
