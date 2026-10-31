const mongoose = require('mongoose');

// Generic approval-request envelope used for every action in the system that
// requires Super Admin sign-off: officer creation, officer profile updates,
// citizen profile corrections, sensitive department updates, etc.
const approvalRequestSchema = new mongoose.Schema(
  {
    requestId: { type: String, required: true, unique: true }, // APR-000001
    type: {
      type: String,
      enum: [
        'create_officer',
        'update_officer',
        'citizen_profile_correction',
        'department_update',
        'delete_citizen',
        'delete_officer',
        'delete_complaint',
        'complaint_edit',
        'other',
      ],
      required: true,
    },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requestedByRole: { type: String, required: true },

    // What this request is about (an officer being created/updated, a citizen
    // whose profile needs correction, a department being updated, etc.)
    targetType: { type: String, enum: ['User', 'Department', 'Complaint', 'Other'], default: 'Other' },
    targetId: { type: mongoose.Schema.Types.ObjectId, refPath: 'targetType' },

    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },

    reason: { type: String, default: '' },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },

    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewRemark: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ApprovalRequest', approvalRequestSchema);
