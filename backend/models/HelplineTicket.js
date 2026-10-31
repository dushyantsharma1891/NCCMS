const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: { type: String },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const helplineTicketSchema = new mongoose.Schema(
  {
    ticketId: { type: String, required: true, unique: true }, // HLP-000001
    citizen: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    // 'official'   -> NCCMS Admin / Super Admin helpline
    // 'department' -> the department's own helpline, answered by its
    //                 Complaint Head officer (falls back to admins if none)
    channel: { type: String, enum: ['official', 'department'], default: 'official' },
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', default: null },
    assignedOfficer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    subject: { type: String, required: true },
    messages: [messageSchema],
    assignedAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    status: {
      type: String,
      enum: ['New', 'Assigned', 'In Progress', 'Answered', 'Resolved', 'Escalated'],
      default: 'New',
    },
    unreadByAdmin: { type: Boolean, default: true },
    unreadByCitizen: { type: Boolean, default: false },
    unreadByOfficer: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('HelplineTicket', helplineTicketSchema);
