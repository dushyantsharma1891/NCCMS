const mongoose = require('mongoose');

// Direct conversation between a citizen and the officer handling their
// complaint (admins / super admins can also read and join in for oversight).
const complaintMessageSchema = new mongoose.Schema(
  {
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: { type: String, enum: ['citizen', 'officer', 'admin', 'super_admin'], required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('ComplaintMessage', complaintMessageSchema);
