const mongoose = require('mongoose');

// When an officer needs to move a complaint BACKWARD in the lifecycle (e.g.
// Resolved -> In Progress) they cannot do it directly — they raise this
// request and an Admin approves/rejects it. Super Admin retains view access.
const statusChangeRequestSchema = new mongoose.Schema(
  {
    requestId: { type: String, required: true, unique: true }, // SCR-000001
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requestedByRole: { type: String, default: 'officer' },
    currentStatus: { type: String, required: true },
    requestedStatus: { type: String, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewRemark: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StatusChangeRequest', statusChangeRequestSchema);
