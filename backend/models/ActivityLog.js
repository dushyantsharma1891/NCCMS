const mongoose = require('mongoose');

// System-wide, append-only audit log. Entries are never edited or deleted by
// application code — a correction is always a NEW log entry, never a mutation
// of an old one (see auditLog.js util).
const activityLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorRole: { type: String },
    actorName: { type: String },
    action: { type: String, required: true }, // human-readable, e.g. "Created Officer"
    targetType: { type: String }, // 'Complaint' | 'User' | 'Department' | 'ApprovalRequest' | ...
    targetId: { type: mongoose.Schema.Types.Mixed },
    targetLabel: { type: String }, // e.g. complaint's human ID or user's name, for quick display
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
    reason: { type: String },
    ip: { type: String },
  },
  { timestamps: true }
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ targetType: 1, targetId: 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
