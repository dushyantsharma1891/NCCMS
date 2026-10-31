const mongoose = require('mongoose');

// An officer's report that a complaint is fake / false / misused. It lands in
// the Admin's "False Complaints" section for review; the admin can dismiss it
// (the complaint is restored if the officer had closed it) or confirm it and
// act on the citizen (warn or deactivate the account).
const falseComplaintReportSchema = new mongoose.Schema(
  {
    reportId: { type: String, required: true, unique: true }, // FCR-000001
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true, index: true },
    citizen: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reasonType: {
      type: String,
      enum: ['Fake or fabricated', 'False or misleading information', 'Duplicate or spam', 'Abuse or misuse of the system', 'Other'],
      required: true,
    },
    reason: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    closedByOfficer: { type: Boolean, default: false },
    status: { type: String, enum: ['Pending', 'Confirmed', 'Dismissed'], default: 'Pending' },
    action: { type: String, enum: ['None', 'Warned', 'Deactivated'], default: 'None' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    adminNote: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FalseComplaintReport', falseComplaintReportSchema);
