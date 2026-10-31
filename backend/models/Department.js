const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema(
  {
    name: String,
    photo: String,
    designation: String,
    role: String,
    employeeId: String,
    email: String,
    phone: String,
    officeLocation: String,
    workingHours: String,
  },
  { _id: false }
);

const slaSchema = new mongoose.Schema(
  {
    Critical: { type: Number, default: 24 }, // hours
    High: { type: Number, default: 72 },
    Medium: { type: Number, default: 168 },
    Low: { type: Number, default: 360 },
  },
  { _id: false }
);

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    type: {
      type: String,
      enum: ['Central Government', 'State Government', 'Public Sector', 'Private Sector'],
      required: true,
    },
    sector: { type: String },
    description: String,
    mission: String,
    vision: String,
    state: { type: String, default: 'All India' },
    isActive: { type: Boolean, default: true },

    // --- Master data: Super Admin edits directly; Admin can only PROPOSE
    //     changes to any department field via an Approval Request. ---
    logo: { type: String, default: '' },
    banner: { type: String, default: '' },
    // Generic top leadership title — a Minister in a government department,
    // a Chairman/Chief/CEO in a public or private sector entity. `designation`
    // carries the actual title so the UI never assumes "Minister".
    chief: {
      name: String,
      photo: String,
      designation: String,
      biography: String,
      message: String,
      since: Date, // when they took this post — shown as "In office since ..."
    },
    departmentHead: {
      name: String,
      photo: String,
      designation: String,
      employeeId: String,
      email: String,
      phone: String,
      officeAddress: String,
      biography: String,
      responsibilities: String,
      since: Date,
    },
    complaintOfficerHead: {
      name: String,
      photo: String,
      employeeId: String,
      designation: String,
      contact: String,
      email: String,
      officeLocation: String,
      workingHours: String,
      responsibilities: String,
      helpline: String,
    },

    // The officer account holding the "Complaint Head" rank (see
    // setComplaintHead in departmentController).
    complaintHead: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    team: [teamMemberSchema],
    officialAddress: String,
    email: String,
    website: String,
    officialPhone: String,
    helpline: String,
    emergencyContact: String,
    workingHours: String,
    temporaryNotice: String,
    complaintInstructions: String,

    // When true, the complaint form asks the citizen to specify which
    // branch/office they mean (e.g. banks with many branches in one city).
    hasMultipleOffices: { type: Boolean, default: false },

    // Category/keyword metadata used by the AI complaint assistant to recommend
    // this department instead of relying on hardcoded names in the frontend.
    services: [String],
    complaintCategories: [String],
    keywords: [String],

    slaHours: { type: slaSchema, default: () => ({}) },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Department', departmentSchema);
