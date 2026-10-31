const mongoose = require('mongoose');

const historyEntrySchema = new mongoose.Schema(
  {
    previousStatus: { type: String, default: null },
    status: { type: String, required: true }, // newStatus
    actionType: {
      type: String,
      enum: [
        'Submitted', 'Assignment', 'Reassignment', 'StatusChange', 'Escalation',
        'StatusBackRequest', 'StatusBackApproved', 'StatusBackRejected', 'Edit', 'FalseReport', 'FalseReview', 'Other',
      ],
      default: 'StatusChange',
    },
    remarks: String,
    reason: String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedByRole: { type: String },
    requestId: { type: String, default: null }, // links to a StatusChangeRequest, if any
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Internal-only entries (status-back requests/approvals, admin remarks) are
    // never surfaced in the citizen-facing timeline.
    internalOnly: { type: Boolean, default: false },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const complaintSchema = new mongoose.Schema(
  {
    complaintId: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    category: { type: String, required: true },
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
    state: String,
    district: String,
    location: String,
    // Only asked/shown when the selected department has hasMultipleOffices
    // set (e.g. a bank with many branches in one city) — which specific
    // branch/office the complaint concerns.
    officeBranch: { type: String, default: '' },
    images: [{ type: String }],
    resolutionImages: [{ type: String }],
    anonymous: { type: Boolean, default: false },
    citizen: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedOfficer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedAt: { type: Date },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Assigned', 'In Progress', 'Resolved', 'Closed', 'Rejected'],
      default: 'Pending',
    },
    remarks: String,
    history: [historyEntrySchema],
    // Set the moment a complaint enters a terminal state (Resolved/Closed/Rejected).
    // Used to auto-hide it from active lists a few days later — see complaintController.
    terminalAt: { type: Date, default: null },
    // When the complaint was last marked Resolved. A Resolved complaint is
    // closed automatically AUTO_CLOSE_HOURS (42) after this moment.
    resolvedAt: { type: Date, default: null },
    autoClosed: { type: Boolean, default: false },
    // Officer reported this as a fake / false complaint (see FalseComplaintReport).
    flaggedFalse: { type: Boolean, default: false },
    closedAsFalse: { type: Boolean, default: false },
    statusBeforeFalseClose: { type: String, default: null },
    // Officer-raised flag asking admin to step in on a complaint (escalation),
    // one of the "real" officer powers that doesn't require delete/reject rights.
    needsAdminAttention: { type: Boolean, default: false },
    escalationNote: { type: String, default: null },
    escalatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

complaintSchema.index({ department: 1, status: 1 });
complaintSchema.index({ citizen: 1 });

module.exports = mongoose.model('Complaint', complaintSchema);
