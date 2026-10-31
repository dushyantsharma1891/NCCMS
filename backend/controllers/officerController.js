const Complaint = require('../models/Complaint');

// @desc  Officer dashboard stats. Officers only have real power over complaints
//        the admin has assigned to them — everything else in the department
//        queue is visible but read-only until assigned.
// @route GET /api/officer/dashboard
const officerDashboard = async (req, res) => {
  try {
    const dept = req.user.department;
    const me = req.user._id;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [assignedToMe, resolvedToday, pendingMine, unassignedInDept, resolvedByMe] = await Promise.all([
      Complaint.countDocuments({ assignedOfficer: me }),
      Complaint.countDocuments({ assignedOfficer: me, status: 'Resolved', updatedAt: { $gte: startOfDay } }),
      Complaint.countDocuments({ assignedOfficer: me, status: { $in: ['Assigned', 'In Progress'] } }),
      Complaint.countDocuments({ department: dept, assignedOfficer: null }),
      Complaint.find({ assignedOfficer: me, status: 'Resolved' }).select('createdAt updatedAt'),
    ]);

    let avgResolutionHours = 0;
    if (resolvedByMe.length) {
      const totalHours = resolvedByMe.reduce((sum, c) => sum + (c.updatedAt - c.createdAt) / 36e5, 0);
      avgResolutionHours = Math.round((totalHours / resolvedByMe.length) * 10) / 10;
    }

    const myComplaints = await Complaint.find({ assignedOfficer: me })
      .populate('citizen', 'name')
      .sort('-updatedAt')
      .limit(10);

    const queue = await Complaint.find({ department: dept, assignedOfficer: null })
      .populate('citizen', 'name')
      .sort('-createdAt')
      .limit(10);

    res.json({
      cards: { assignedToMe, resolvedToday, pendingMine, unassignedInDept, avgResolutionHours },
      myComplaints,
      queue,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { officerDashboard };
