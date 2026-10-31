// Single source of truth for the complaint status lifecycle. The backend
// enforces this — never rely on frontend buttons to block invalid moves.

const LIFECYCLE = ['Pending', 'Assigned', 'Accepted', 'In Progress', 'Resolved', 'Closed'];

// Allowed FORWARD-only transitions for normal (non-approval) status updates.
const FORWARD_TRANSITIONS = {
  Pending: ['Assigned', 'Rejected'],
  Assigned: ['Accepted'],
  Accepted: ['In Progress'],
  'In Progress': ['Resolved'],
  Resolved: ['Closed'],
  Closed: [],
  Rejected: [],
};

const ALL_STATUSES = ['Pending', 'Assigned', 'Accepted', 'In Progress', 'Resolved', 'Closed', 'Rejected'];
const ACTIVE_STATUSES = ['Pending', 'Assigned', 'Accepted', 'In Progress'];

// Is `to` a legal forward move from `from`?
const isValidForwardTransition = (from, to) => {
  if (from === to) return false;
  return (FORWARD_TRANSITIONS[from] || []).includes(to);
};

// Role-aware set of statuses a user may move a complaint to RIGHT NOW,
// without going through a Status Change Request:
//  - Officer: strictly the normal forward path only (no Reject/Close ever —
//    that authority belongs to Admin/Super Admin).
//  - Admin: the normal forward path, PLUS Reject/Close from any active
//    status directly — matches their real operational authority to shut
//    down a complaint at any point, not just from Pending/Resolved.
//  - Super Admin: unrestricted — any status from any status. They are the
//    ultimate authority and every move is still fully audited.
const getAllowedNextStatuses = (currentStatus, role) => {
  if (role === 'super_admin') {
    return ALL_STATUSES.filter((s) => s !== currentStatus);
  }
  const forward = FORWARD_TRANSITIONS[currentStatus] || [];
  // Officers can never reject or close a complaint — that is Admin authority.
  if (role === 'officer') return forward.filter((s) => !['Rejected', 'Closed'].includes(s));
  if (role === 'admin' && ACTIVE_STATUSES.includes(currentStatus)) {
    const extra = ['Rejected', 'Closed'].filter((s) => s !== currentStatus && !forward.includes(s));
    return [...forward, ...extra];
  }
  return forward;
};

// Is `to` earlier in the lifecycle than `from`? (i.e. this would need a
// Status Change Request + Admin approval rather than a direct update)
const isBackwardTransition = (from, to) => {
  const fromIdx = LIFECYCLE.indexOf(from);
  const toIdx = LIFECYCLE.indexOf(to);
  if (fromIdx === -1 || toIdx === -1) return false;
  return toIdx < fromIdx;
};

// Builds the simplified, non-confusing timeline shown to citizens. Even if a
// complaint was RESOLVED and later moved back to IN PROGRESS via an approved
// Status Change Request, the citizen only ever sees a single clean forward
// checklist reflecting the CURRENT state — never a "Resolved -> In Progress"
// looking history.
const buildCitizenTimeline = (complaint) => {
  if (complaint.status === 'Rejected') {
    return {
      currentStatus: 'Rejected',
      steps: [
        { label: 'Submitted', done: true, reachedAt: complaint.createdAt || null },
        { label: 'Rejected', done: true, isTerminalNegative: true, reachedAt: (complaint.history || []).find((h) => h.status === 'Rejected')?.updatedAt || null },
      ],
    };
  }

  const currentIdx = LIFECYCLE.indexOf(complaint.status);
  const effectiveIdx = currentIdx === -1 ? 0 : currentIdx;

  const labelMap = {
    Pending: 'Submitted',
    Assigned: 'Assigned',
    Accepted: 'Accepted',
    'In Progress': 'In Progress',
    Resolved: 'Resolved',
    Closed: 'Closed',
  };

  // When did the complaint first reach each stage? Only the standard stages
  // and their times are exposed — never who did it or any internal remarks.
  const reached = {};
  (complaint.history || []).forEach((h) => {
    if (h.internalOnly || !h.status || h.actionType === 'StatusBackRequest') return;
    if (!reached[h.status] || new Date(h.updatedAt) < new Date(reached[h.status])) reached[h.status] = h.updatedAt;
  });
  reached.Pending = complaint.createdAt || reached.Pending;

  const steps = LIFECYCLE.map((status, idx) => ({
    label: labelMap[status],
    status,
    done: idx <= effectiveIdx,
    current: idx === effectiveIdx,
    reachedAt: idx <= effectiveIdx ? (reached[status] || null) : null,
  }));

  return { currentStatus: complaint.status, steps };
};

module.exports = {
  LIFECYCLE, FORWARD_TRANSITIONS, isValidForwardTransition, isBackwardTransition,
  buildCitizenTimeline, getAllowedNextStatuses,
};
