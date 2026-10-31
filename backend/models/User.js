const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    // `name` remains the single display name used everywhere across the
    // app (dashboards, notifications, audit logs, etc). Citizens registering
    // through the public form fill in firstName/middleName/lastName instead,
    // and `name` is composed from those automatically (see pre-save hook) so
    // nothing else in the codebase needs to know about the split.
    name: { type: String, required: true, trim: true },
    firstName: { type: String, trim: true },
    middleName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    // Aadhar is intentionally optional everywhere — never required to
    // register or file a complaint. When provided, it must be a valid
    // 12-digit Aadhar number (spaces allowed for readability, stripped before validating).
    aadhar: {
      type: String,
      trim: true,
      validate: {
        validator: (v) => !v || /^\d{12}$/.test(String(v).replace(/\s+/g, '')),
        message: 'Aadhar number must be exactly 12 digits (or left blank)',
      },
    },
    password: { type: String, required: true, minlength: 6, select: false },
    role: {
      type: String,
      enum: ['citizen', 'officer', 'admin', 'super_admin'],
      default: 'citizen',
    },
    // Auto-generated identifiers. Citizens use their Mongo _id (CIT-<short>) for display,
    // officers get POL-0001 style ids, admins get ADM-0001 style ids. Never user-entered.
    citizenId: { type: String },
    employeeId: { type: String }, // officer ID, e.g. POL-0001
    adminId: { type: String }, // admin ID, e.g. ADM-0001

    // Officer/Admin department scope
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },

    // Officer accounts are created by an Admin but stay inactive/pending until
    // Super Admin approval. Admins are created directly & active by Super Admin.
    approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Address (the user's own location — never used for access control)
    address: String,
    state: String,
    district: String,
    pincode: String,
    isActive: { type: Boolean, default: true },

    // Officer visibility scope: restricts which complaints an officer can see
    // within their department. If scopeDistrict is set, the officer only sees
    // complaints for that district. Else if scopeState is set, they see the
    // whole state. If neither is set, they see the whole department (no
    // geographic restriction). Set by Super Admin (or Admin managing their
    // own department's officers) — never by the officer themselves.
    scopeState: { type: String, default: '' },
    scopeDistrict: { type: String, default: '' },

    // One officer per department can be given the "Complaint Head" rank. The
    // department helpline routes citizens straight to this officer.
    isComplaintHead: { type: Boolean, default: false },
    // Number of complaints an admin confirmed as fake / false (citizens only).
    falseComplaintStrikes: { type: Number, default: 0 },

    // Security / oversight metadata (never expose plaintext password)
    lastLogin: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
    mustChangePassword: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.pre('save', function (next) {
  if (this.firstName || this.lastName) {
    this.name = [this.firstName, this.middleName, this.lastName].filter(Boolean).join(' ').trim() || this.name;
  }
  next();
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  this.passwordChangedAt = new Date();
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
