const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['Complaint Submitted', 'Complaint Assigned', 'Complaint Updated', 'Complaint Resolved', 'Complaint Rejected'],
      default: 'Complaint Updated',
    },
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
