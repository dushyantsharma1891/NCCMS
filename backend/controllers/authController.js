const User = require('../models/User');
const Department = require('../models/Department');
const generateToken = require('../utils/generateToken');
const logActivity = require('../utils/auditLog');

// Generates a display-friendly Citizen ID, e.g. CIT-000123, from a running count.
const generateCitizenId = async () => {
  const count = await User.countDocuments({ role: 'citizen' });
  return `CIT-${String(count + 1).padStart(6, '0')}`;
};

// @desc  Register a new citizen
// @route POST /api/auth/register
const register = async (req, res) => {
  try {
    const { firstName, middleName, lastName, email, phone, aadhar, password, address, state, district, pincode } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'First name, last name, email and password are required' });
    }
    if (aadhar && !/^\d{12}$/.test(String(aadhar).replace(/\s+/g, ''))) {
      return res.status(400).json({ message: 'Aadhar number must be exactly 12 digits, or left blank' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const citizenId = await generateCitizenId();
    const name = [firstName, middleName, lastName].filter(Boolean).join(' ');

    const user = await User.create({
      name, firstName, middleName, lastName, email, phone, aadhar, password, address, state, district, pincode,
      citizenId,
      role: 'citizen',
    });

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      citizenId: user.citizenId,
      token: generateToken(user._id, user.role),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// NOTE: Officers are no longer created directly via this endpoint. Admins
// must go through POST /api/approvals/officer, which creates the account
// pending Super Admin approval (see approvalController.requestCreateOfficer).
// This stub remains only to return a clear, explicit error rather than a 404
// for any client still pointed at the old route.
const registerOfficer = async (req, res) => {
  return res.status(410).json({
    message: 'This endpoint has been retired. Officer accounts must be requested via POST /api/approvals/officer and require Super Admin approval before activation.',
  });
};

// @desc  Login — citizen, officer, admin, or super_admin (including the
//        discreet "Authorized Administration" entry point on the login page).
//        Same authentication path and password checks for every role — no
//        bypass, no hardcoded credentials.
// @route POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password, loginType } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    // Emails are stored lowercase; normalize so Safari/macOS auto-capitalisation
    // or a stray space from copy-paste can't cause a false "invalid" login.
    const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select('+password').populate('department', 'name');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (loginType && loginType !== user.role) {
      return res.status(401).json({ message: `This account is registered as '${user.role}', not '${loginType}'` });
    }

    if (!user.isActive) {
      const reason = user.role === 'officer' && user.approvalStatus === 'pending'
        ? 'This officer account is awaiting Super Admin approval.'
        : 'This account has been deactivated. Contact your administrator.';
      return res.status(403).json({ message: reason });
    }

    user.lastLogin = new Date();
    await user.save();

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      employeeId: user.employeeId,
      adminId: user.adminId,
      citizenId: user.citizenId,
      isComplaintHead: user.isComplaintHead,
      mustChangePassword: user.mustChangePassword,
      token: generateToken(user._id, user.role),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// @desc  Get logged-in user profile
// @route GET /api/auth/me
const getMe = async (req, res) => {
  const user = await User.findById(req.user._id).populate('department', 'name type');
  res.json(user);
};

// @desc  Update own profile — every role can only ever edit their own record
//        via this endpoint (enforced by req.user._id, never a body-supplied id).
// @route PUT /api/auth/me
const updateMe = async (req, res) => {
  try {
    const fields = ['name', 'firstName', 'middleName', 'lastName', 'phone', 'address', 'state', 'district', 'pincode', 'aadhar'];
    const updates = {};
    fields.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });
    if (updates.aadhar && !/^\d{12}$/.test(String(updates.aadhar).replace(/\s+/g, ''))) {
      return res.status(400).json({ message: 'Aadhar number must be exactly 12 digits, or left blank' });
    }
    if (updates.firstName || updates.lastName) {
      const current = await User.findById(req.user._id).select('firstName middleName lastName');
      const firstName = updates.firstName ?? current.firstName;
      const middleName = updates.middleName ?? current.middleName;
      const lastName = updates.lastName ?? current.lastName;
      updates.name = [firstName, middleName, lastName].filter(Boolean).join(' ');
    }
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Change own password (requires current password). Clears
//        mustChangePassword after a successful self-service change.
// @route PUT /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();
    await logActivity({ actor: req.user, action: 'Changed own password', targetType: 'User', targetId: user._id, targetLabel: user.name, req });
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { register, registerOfficer, login, getMe, updateMe, changePassword };
