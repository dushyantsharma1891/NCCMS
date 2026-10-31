const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');

// A complaint that has been Resolved for AUTO_CLOSE_HOURS (default 42) with no
// further action is closed automatically. The citizen has that window to
// reply in the chat if the problem is not actually fixed.
const AUTO_CLOSE_HOURS = Number(process.env.AUTO_CLOSE_HOURS) || 42;
const HOUR = 60 * 60 * 1000;

const autoCloseAtFor = (complaint) => {
  if (complaint.status !== 'Resolved') return null;
  const since = complaint.resolvedAt || complaint.terminalAt || complaint.updatedAt;
  return since ? new Date(new Date(since).getTime() + AUTO_CLOSE_HOURS * HOUR) : null;
};

const closeResolvedComplaints = async () => {
  const cutoff = new Date(Date.now() - AUTO_CLOSE_HOURS * HOUR);
  // resolvedAt is the truth; older complaints (resolved before this feature
  // existed) fall back to terminalAt.
  const due = await Complaint.find({
    status: 'Resolved',
    $or: [
      { resolvedAt: { $lte: cutoff } },
      { resolvedAt: null, terminalAt: { $lte: cutoff } },
      { resolvedAt: { $exists: false }, terminalAt: { $lte: cutoff } },
    ],
  });

  for (const c of due) {
    c.history.push({
      previousStatus: 'Resolved',
      status: 'Closed',
      actionType: 'StatusChange',
      remarks: `Closed automatically ${AUTO_CLOSE_HOURS} hours after being resolved`,
      updatedByRole: 'system',
    });
    c.status = 'Closed';
    c.autoClosed = true;
    if (!c.terminalAt) c.terminalAt = new Date();
    await c.save();

    const msg = `Complaint ${c.complaintId} was resolved ${AUTO_CLOSE_HOURS} hours ago, so it has been closed automatically.`;
    const recipients = [c.citizen, c.assignedOfficer].filter(Boolean);
    await Promise.all(recipients.map((user) => Notification.create({
      user, title: `Complaint ${c.complaintId} closed`, message: msg, type: 'Complaint Updated', complaint: c._id,
    })));
  }
  return due.length;
};

const startAutoCloseJob = () => {
  const run = () => closeResolvedComplaints()
    .then((n) => { if (n) console.log(`Auto-closed ${n} resolved complaint(s)`); })
    .catch((e) => console.error('Auto-close job failed:', e.message));
  run();
  const timer = setInterval(run, 10 * 60 * 1000); // every 10 minutes
  timer.unref?.();
  return timer;
};

module.exports = { AUTO_CLOSE_HOURS, autoCloseAtFor, closeResolvedComplaints, startAutoCloseJob };
