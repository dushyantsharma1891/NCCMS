const User = require('../models/User');

// Auto-generates an Employee ID like "POL-0007" from the department name +
// a sequential count of officers already in that department.
// Admin never types this manually — it's assigned the moment an officer account is created.
const generateEmployeeId = async (departmentName) => {
  const code = (departmentName || 'GOV')
    .replace(/[^a-zA-Z ]/g, '')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 4) || 'GOV';

  const count = await User.countDocuments({ role: 'officer', employeeId: { $regex: `^${code}-` } });
  const sequence = String(count + 1).padStart(4, '0');
  let employeeId = `${code}-${sequence}`;

  // Guard against a collision (e.g. two department names sharing an initial code)
  let existing = await User.findOne({ employeeId });
  let attempt = count + 1;
  while (existing) {
    attempt += 1;
    employeeId = `${code}-${String(attempt).padStart(4, '0')}`;
    existing = await User.findOne({ employeeId });
  }

  return employeeId;
};

module.exports = generateEmployeeId;
