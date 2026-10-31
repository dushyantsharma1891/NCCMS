const Complaint = require('../models/Complaint');

// Generates IDs like CMP202600012
const generateComplaintId = async () => {
  const year = new Date().getFullYear();
  const count = await Complaint.countDocuments();
  const sequence = String(count + 1).padStart(5, '0');
  const id = `CMP${year}${sequence}`;

  // Ensure uniqueness in case of race conditions
  const existing = await Complaint.findOne({ complaintId: id });
  if (existing) {
    const fallback = `CMP${year}${String(count + 1 + Math.floor(Math.random() * 1000)).padStart(5, '0')}`;
    return fallback;
  }
  return id;
};

module.exports = generateComplaintId;
