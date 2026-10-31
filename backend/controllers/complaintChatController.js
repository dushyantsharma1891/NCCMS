const Complaint = require('../models/Complaint');
const ComplaintMessage = require('../models/ComplaintMessage');
const Notification = require('../models/Notification');
const User = require('../models/User');

const CLOSED_STATES = ['Closed', 'Rejected'];

// Who may open this conversation? The citizen who filed the complaint, the
// officer it is assigned to, and Admin / Super Admin (read + join, for
// oversight). A scoped Admin only reaches complaints of their department.
const loadForUser = async (req, res) => {
  const complaint = await Complaint.findById(req.params.complaintId)
    .populate('assignedOfficer', 'name employeeId isComplaintHead')
    .populate('department', 'name');
  if (!complaint) { res.status(404).json({ message: 'Complaint not found' }); return null; }

  const u = req.user;
  let ok = false;
  if (u.role === 'citizen') ok = String(complaint.citizen) === String(u._id);
  else if (u.role === 'officer') ok = complaint.assignedOfficer && String(complaint.assignedOfficer._id) === String(u._id);
  else if (u.role === 'admin') ok = !u.department || String(complaint.department._id) === String(u.department);
  else if (u.role === 'super_admin') ok = true;
  if (!ok) { res.status(403).json({ message: 'You are not part of this conversation' }); return null; }
  return complaint;
};

const canPost = (complaint, user) => {
  if (CLOSED_STATES.includes(complaint.status)) return { ok: false, reason: `This complaint is ${complaint.status.toLowerCase()}, so the chat is read-only.` };
  if (user.role === 'admin' || user.role === 'super_admin') return { ok: true };
  if (!complaint.assignedOfficer) return { ok: false, reason: 'No officer has been assigned yet. You can chat as soon as one is — meanwhile use the department helpline.' };
  return { ok: true };
};

const displayName = (m, complaint, viewer) => {
  if (m.senderRole === 'citizen') {
    if (viewer.role === 'citizen') return 'You';
    return complaint.anonymous ? 'Citizen (anonymous)' : (m.sender?.name || 'Citizen');
  }
  if (String(m.sender?._id) === String(viewer._id)) return 'You';
  const label = { officer: 'Officer', admin: 'Admin', super_admin: 'Super Admin' }[m.senderRole];
  return `${m.sender?.name || label}${m.sender?.employeeId ? ` (${m.sender.employeeId})` : ''}`;
};

// @desc  Read the conversation (and mark it read for the viewer)
// @route GET /api/complaint-chat/:complaintId
const getMessages = async (req, res) => {
  try {
    const complaint = await loadForUser(req, res);
    if (!complaint) return;

    const messages = await ComplaintMessage.find({ complaint: complaint._id })
      .populate('sender', 'name employeeId')
      .sort('createdAt');
    await ComplaintMessage.updateMany(
      { complaint: complaint._id, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );

    const post = canPost(complaint, req.user);
    res.json({
      complaintId: complaint.complaintId,
      status: complaint.status,
      officer: complaint.assignedOfficer
        ? { name: complaint.assignedOfficer.name, employeeId: complaint.assignedOfficer.employeeId, isComplaintHead: complaint.assignedOfficer.isComplaintHead }
        : null,
      canPost: post.ok,
      readOnlyReason: post.ok ? null : post.reason,
      messages: messages.map((m) => ({
        _id: m._id, text: m.text, senderRole: m.senderRole, createdAt: m.createdAt,
        mine: String(m.sender?._id) === String(req.user._id),
        senderName: displayName(m, complaint, req.user),
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Send a message
// @route POST /api/complaint-chat/:complaintId
const postMessage = async (req, res) => {
  try {
    const text = String(req.body.text || '').trim();
    if (!text) return res.status(400).json({ message: 'Message cannot be empty' });
    const complaint = await loadForUser(req, res);
    if (!complaint) return;

    const post = canPost(complaint, req.user);
    if (!post.ok) return res.status(400).json({ message: post.reason });

    const msg = await ComplaintMessage.create({
      complaint: complaint._id, sender: req.user._id, senderRole: req.user.role, text, readBy: [req.user._id],
    });

    // Tell the other side.
    const recipients = [];
    if (req.user.role === 'citizen') {
      if (complaint.assignedOfficer) recipients.push(complaint.assignedOfficer._id);
    } else {
      recipients.push(complaint.citizen);
      if (req.user.role !== 'officer' && complaint.assignedOfficer) recipients.push(complaint.assignedOfficer._id);
    }
    const who = req.user.role === 'citizen' ? (complaint.anonymous ? 'The citizen' : req.user.name) : req.user.name;
    await Promise.all(recipients.map((uid) => Notification.create({
      user: uid, title: `New message on ${complaint.complaintId}`,
      message: `${who}: ${text.slice(0, 120)}`, type: 'Complaint Updated', complaint: complaint._id,
    })));

    res.status(201).json({ _id: msg._id, text: msg.text, createdAt: msg.createdAt });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getMessages, postMessage };
