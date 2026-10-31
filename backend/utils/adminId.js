const User = require('../models/User');

// Auto-generates ADM-0001 style IDs. Only ever called from the Super Admin
// "create admin" flow — never typed manually by anyone.
const generateAdminId = async () => {
  const count = await User.countDocuments({ role: 'admin' });
  let sequence = count + 1;
  let adminId = `ADM-${String(sequence).padStart(4, '0')}`;

  let existing = await User.findOne({ adminId });
  while (existing) {
    sequence += 1;
    adminId = `ADM-${String(sequence).padStart(4, '0')}`;
    existing = await User.findOne({ adminId });
  }
  return adminId;
};

module.exports = generateAdminId;
