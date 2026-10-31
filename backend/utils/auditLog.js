const ActivityLog = require('../models/ActivityLog');

// Writes one immutable audit entry. Never call findOneAndUpdate/delete on
// ActivityLog anywhere in the app — corrections are new entries, not edits.
const logActivity = async ({ actor, action, targetType, targetId, targetLabel, oldValue, newValue, reason, req }) => {
  try {
    await ActivityLog.create({
      actor: actor?._id || actor || null,
      actorRole: actor?.role,
      actorName: actor?.name,
      action,
      targetType,
      targetId,
      targetLabel,
      oldValue,
      newValue,
      reason,
      ip: req?.ip,
    });
  } catch (err) {
    // Audit logging must never break the primary request flow.
    console.error('Failed to write activity log:', err.message);
  }
};

module.exports = logActivity;
