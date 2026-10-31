const HelplineTicket = require('../models/HelplineTicket');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Department = require('../models/Department');
const Complaint = require('../models/Complaint');
const generateRequestId = require('../utils/requestId');
const logActivity = require('../utils/auditLog');

const notify = async (userId, title, message) => {
  if (!userId) return;
  await Notification.create({ user: userId, title, message, type: 'Complaint Updated' });
};

// Department-channel tickets are answered by that department's Complaint Head
// officer. Only the head of the SAME department may see/reply to them.
const isHeadOf = (user, ticket) =>
  user.role === 'officer' && user.isComplaintHead && ticket.channel === 'department' &&
  String(user.department) === String(ticket.department?._id || ticket.department);

const staffRoles = ['admin', 'super_admin'];

// @desc  Citizen asks a question.
//        channel 'official'   -> NCCMS Admin / Super Admin team
//        channel 'department' -> the department's Complaint Head officer
//                                (admins are told instead if no head is set)
// @route POST /api/helpline
const createTicket = async (req, res) => {
  try {
    const { subject, message, department, priority, channel = 'official', complaintId } = req.body;
    if (!message || !String(message).trim()) return res.status(400).json({ message: 'Please type your message' });

    let deptId = department || undefined;
    let complaint = null;
    if (complaintId) {
      complaint = await Complaint.findOne({ _id: complaintId, citizen: req.user._id });
      if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
      deptId = complaint.department;
    }
    if (channel === 'department' && !deptId) {
      return res.status(400).json({ message: 'Please choose the department you want to contact' });
    }

    let head = null;
    let dept = null;
    if (deptId) dept = await Department.findById(deptId);
    if (channel === 'department') {
      if (!dept) return res.status(400).json({ message: 'Department not found' });
      if (dept.complaintHead) {
        head = await User.findOne({ _id: dept.complaintHead, role: 'officer', isActive: true });
      }
    }

    const ticketId = await generateRequestId(HelplineTicket, 'ticketId', 'HLP');
    const ticket = await HelplineTicket.create({
      ticketId,
      citizen: req.user._id,
      department: deptId,
      channel: channel === 'department' ? 'department' : 'official',
      complaint: complaint ? complaint._id : null,
      assignedOfficer: head ? head._id : null,
      subject: subject || (complaint ? `About complaint ${complaint.complaintId}` : 'Question'),
      priority: priority || 'Medium',
      messages: [{ sender: req.user._id, senderRole: 'citizen', text: message }],
      status: head ? 'Assigned' : 'New',
      unreadByOfficer: !!head,
      unreadByAdmin: !head,
    });

    if (head) {
      await notify(head._id, `Department helpline — ${ticketId}`, `${req.user.name}: ${String(message).slice(0, 120)}`);
    } else {
      // No Complaint Head (or official channel): the admin team picks it up.
      const adminFilter = { role: { $in: staffRoles }, isActive: true };
      const admins = await User.find(adminFilter).select('_id department role');
      const targets = admins.filter((a) => a.role === 'super_admin' || !a.department || !deptId || String(a.department) === String(deptId));
      await Promise.all(targets.map((a) => notify(a._id, `New helpline question — ${ticketId}`, `${ticket.subject}${channel === 'department' ? ` (${dept?.name} — no Complaint Head set)` : ''}`)));
    }
    await logActivity({ actor: req.user, action: `Citizen asked ${ticket.channel} helpline question`, targetType: 'HelplineTicket', targetId: ticket._id, targetLabel: ticketId, req });

    res.status(201).json({ ...ticket.toObject(), routedToHead: !!head, headName: head?.name || null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  List helpline tickets
//        citizen: own | officer: only if Complaint Head -> their dept's
//        department tickets | admin: all (own-dept for department tickets
//        when scoped) | super_admin: all
// @route GET /api/helpline
const listTickets = async (req, res) => {
  const filter = {};
  if (req.user.role === 'citizen') filter.citizen = req.user._id;
  if (req.user.role === 'officer') {
    if (!req.user.isComplaintHead) {
      return res.status(403).json({ message: 'Only the department Complaint Head can use the department helpline inbox.' });
    }
    filter.channel = 'department';
    filter.department = req.user.department;
  }
  if (req.user.role === 'admin') {
    if (req.query.mine === 'true') filter.assignedAdmin = req.user._id;
    if (req.user.department) {
      filter.$or = [{ channel: 'official' }, { channel: { $exists: false } }, { department: req.user.department }];
    }
  }
  if (req.query.status) filter.status = req.query.status;
  if (req.query.channel && ['official', 'department'].includes(req.query.channel) && req.user.role !== 'officer') {
    filter.channel = req.query.channel;
  }
  if (req.query.complaint && req.user.role === 'citizen') filter.complaint = req.query.complaint;

  const tickets = await HelplineTicket.find(filter)
    .populate('citizen', 'name email')
    .populate('assignedAdmin', 'name adminId')
    .populate('assignedOfficer', 'name employeeId')
    .populate('department', 'name')
    .populate('complaint', 'complaintId title')
    .sort('-updatedAt');
  res.json(tickets);
};

// @desc  Get single ticket + mark read for the viewer's side
// @route GET /api/helpline/:id
const getTicket = async (req, res) => {
  const ticket = await HelplineTicket.findById(req.params.id)
    .populate('citizen', 'name email')
    .populate('assignedAdmin', 'name adminId')
    .populate('assignedOfficer', 'name employeeId')
    .populate('department', 'name helpline officialPhone workingHours')
    .populate('complaint', 'complaintId title')
    .populate('messages.sender', 'name role employeeId');
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

  if (req.user.role === 'citizen') {
    if (String(ticket.citizen._id) !== String(req.user._id)) return res.status(403).json({ message: 'Not authorized' });
    ticket.unreadByCitizen = false;
  } else if (req.user.role === 'officer') {
    if (!isHeadOf(req.user, ticket)) return res.status(403).json({ message: 'Not authorized' });
    ticket.unreadByOfficer = false;
  } else {
    ticket.unreadByAdmin = false;
  }
  await ticket.save();
  res.json(ticket);
};

// @desc  The citizen's department-helpline conversation about one complaint
//        (null if they haven't started one) — drives the complaint page tab.
// @route GET /api/helpline/by-complaint/:complaintId
const getByComplaint = async (req, res) => {
  const ticket = await HelplineTicket.findOne({
    complaint: req.params.complaintId, citizen: req.user._id, channel: 'department',
  })
    .sort('-createdAt')
    .populate('assignedOfficer', 'name employeeId')
    .populate('messages.sender', 'name role employeeId');
  if (ticket) { ticket.unreadByCitizen = false; await ticket.save(); }
  res.json(ticket || null);
};

// @desc  Reply to a ticket — citizen follow-up, Complaint Head (department
//        tickets), or Admin / Super Admin
// @route POST /api/helpline/:id/reply
const replyTicket = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !String(text).trim()) return res.status(400).json({ message: 'Message text is required' });

    const ticket = await HelplineTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    if (req.user.role === 'citizen' && String(ticket.citizen) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (req.user.role === 'officer' && !isHeadOf(req.user, ticket)) {
      return res.status(403).json({ message: 'Only the department Complaint Head can answer this' });
    }

    ticket.messages.push({ sender: req.user._id, senderRole: req.user.role, text });

    if (req.user.role === 'citizen') {
      ticket.unreadByAdmin = !ticket.assignedOfficer;
      ticket.unreadByOfficer = !!ticket.assignedOfficer;
      if (ticket.status === 'Resolved' || ticket.status === 'Answered') ticket.status = 'In Progress';
      if (ticket.assignedOfficer) {
        await notify(ticket.assignedOfficer, `Helpline reply — ${ticket.ticketId}`, `${req.user.name}: ${text.slice(0, 120)}`);
      }
    } else {
      ticket.unreadByCitizen = true;
      ticket.status = 'Answered';
      if (req.user.role === 'officer') {
        if (!ticket.assignedOfficer) ticket.assignedOfficer = req.user._id;
      } else if (!ticket.assignedAdmin) {
        ticket.assignedAdmin = req.user._id;
      }
      await notify(ticket.citizen, `Helpline reply — ${ticket.ticketId}`, text);
    }

    await ticket.save();
    await logActivity({ actor: req.user, action: 'Replied to helpline ticket', targetType: 'HelplineTicket', targetId: ticket._id, targetLabel: ticket.ticketId, req });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Admin/Super Admin assigns a ticket to a specific Admin
// @route PUT /api/helpline/:id/assign
const assignTicket = async (req, res) => {
  const { adminId } = req.body;
  const ticket = await HelplineTicket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
  ticket.assignedAdmin = adminId || req.user._id;
  ticket.status = 'Assigned';
  await ticket.save();
  await logActivity({ actor: req.user, action: 'Assigned helpline ticket', targetType: 'HelplineTicket', targetId: ticket._id, targetLabel: ticket.ticketId, req });
  res.json(ticket);
};

// @desc  Mark resolved / escalate to Super Admin
// @route PUT /api/helpline/:id/status
const setTicketStatus = async (req, res) => {
  const { status } = req.body;
  if (!['Resolved', 'Escalated', 'In Progress'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  const ticket = await HelplineTicket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
  if (req.user.role === 'officer' && !isHeadOf(req.user, ticket)) {
    return res.status(403).json({ message: 'Only the department Complaint Head can update this' });
  }
  ticket.status = status;
  await ticket.save();
  if (status === 'Escalated') {
    // Complaint Head hands a hard question up to the admin team.
    const admins = await User.find({ role: { $in: staffRoles }, isActive: true }).select('_id');
    await Promise.all(admins.map((a) => notify(a._id, `Helpline escalated — ${ticket.ticketId}`, ticket.subject)));
    ticket.unreadByAdmin = true; await ticket.save();
  }
  if (status === 'Resolved') await notify(ticket.citizen, `Helpline resolved — ${ticket.ticketId}`, 'Your question has been marked resolved. You can reply again to reopen it.');
  await logActivity({ actor: req.user, action: `Marked helpline ticket ${status}`, targetType: 'HelplineTicket', targetId: ticket._id, targetLabel: ticket.ticketId, req });
  res.json(ticket);
};

// @desc  Super Admin bulk-deletes helpline tickets by age bucket — a
//        retention/cleanup tool. `period` is one of: today, 1week, 1month,
//        3months, 4months, 1year, all. Anything other than "today"/"all"
//        deletes tickets OLDER than that period; "today" deletes only
//        tickets created today; "all" wipes the entire helpline history.
// @route DELETE /api/helpline/bulk?period=1month
const bulkDeleteTickets = async (req, res) => {
  try {
    const { period } = req.query;
    const durations = {
      '1week': 7, '1month': 30, '3months': 90, '4months': 120, '1year': 365,
    };

    let filter = {};
    let label = period;
    if (period === 'all') {
      filter = {};
      label = 'all history';
    } else if (period === 'today') {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      filter = { createdAt: { $gte: startOfToday } };
      label = "today's tickets";
    } else if (durations[period]) {
      const cutoff = new Date(Date.now() - durations[period] * 24 * 60 * 60 * 1000);
      filter = { createdAt: { $lt: cutoff } };
      label = `tickets older than ${period}`;
    } else {
      return res.status(400).json({ message: 'Invalid period. Use today, 1week, 1month, 3months, 4months, 1year, or all.' });
    }

    const result = await HelplineTicket.deleteMany(filter);
    await logActivity({
      actor: req.user, action: `Bulk-deleted helpline history (${label})`, targetType: 'HelplineTicket',
      reason: `${result.deletedCount} ticket(s) deleted`, req,
    });
    res.json({ message: `Deleted ${result.deletedCount} ticket(s) — ${label}.`, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createTicket, listTickets, getTicket, getByComplaint, replyTicket, assignTicket, setTicketStatus, bulkDeleteTickets };
