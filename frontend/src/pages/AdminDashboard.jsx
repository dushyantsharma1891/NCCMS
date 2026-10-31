import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import RoleHero from '../components/RoleHero';
import StatCard from '../components/StatCard';
import ComplaintTable from '../components/ComplaintTable';
import { BarChart, PieChart, LineChart } from '../components/Charts';
import api from '../api/axios';

const AdminDashboard = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/admin/dashboard').then((res) => setData(res.data));
  }, []);

  if (!data) return <DashboardLayout title="Admin Dashboard"><p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p></DashboardLayout>;

  const { cards, charts, latest } = data;
  const monthlyLabels = charts.monthly.map((m) => `${m._id.month}/${m._id.year}`);

  return (
    <DashboardLayout title="Admin Dashboard" subtitle={data.scopedDepartment ? 'Scoped to your assigned department.' : 'System-wide overview and analytics.'}>
      <RoleHero
        stats={[
          { label: 'Total complaints', value: cards.totalComplaints },
          { label: 'Pending', value: cards.pending },
          { label: 'Escalated to you', value: cards.escalated },
          { label: 'My approvals', value: cards.pendingApprovals },
        ]}
        actions={[
          { label: 'Complaint Queue', to: '/admin/complaints', icon: '📋' },
          { label: 'Manage Officers', to: '/admin/officers', icon: '👮' },
          { label: 'Status Requests', to: '/admin/status-requests', icon: '🔁' },
          { label: 'Helpline', to: '/admin/helpline', icon: '☎️' },
        ]}
        note="Assign complaints to officers, review status-change requests and escalations."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users" value={cards.totalUsers} color="navy" to="/admin/citizens" />
        <StatCard label="Departments" value={cards.totalDepartments} color="purple" to="/admin/departments" />
        <StatCard label="Total Complaints" value={cards.totalComplaints} color="blue" to="/admin/complaints" />
        <StatCard label="Resolved" value={cards.resolved} color="green" to="/admin/complaints?status=Resolved" />
        <StatCard label="Pending" value={cards.pending} color="amber" to="/admin/complaints?status=Pending" />
        <StatCard label="Officers" value={cards.officers} color="navy" to="/admin/officers" />
        <StatCard label="States Covered" value={cards.states} color="blue" to="/admin/reports" />
        <StatCard label="Escalated to You" value={cards.escalated} color="red" to="/admin/complaints?escalated=true" />
        <StatCard label="My Pending Approvals" value={cards.pendingApprovals} color="amber" to="/admin/approvals" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="font-display font-bold text-navy-900 dark:text-white mb-3">Department Wise</h3>
          <BarChart labels={charts.departmentWise.map((d) => d.name || 'Unknown')} data={charts.departmentWise.map((d) => d.count)} />
        </div>
        <div className="card">
          <h3 className="font-display font-bold text-navy-900 dark:text-white mb-3">Complaint Categories</h3>
          <PieChart labels={charts.categoryWise.map((c) => c._id)} data={charts.categoryWise.map((c) => c.count)} />
        </div>
        <div className="card lg:col-span-2">
          <h3 className="font-display font-bold text-navy-900 dark:text-white mb-3">Monthly Trend</h3>
          <LineChart labels={monthlyLabels} data={charts.monthly.map((m) => m.count)} />
        </div>
      </div>

      <div className="card mt-6">
        <h3 className="font-display font-bold text-navy-900 dark:text-white mb-3">Latest Complaints</h3>
        <ComplaintTable complaints={latest} showCitizen showDepartment />
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
