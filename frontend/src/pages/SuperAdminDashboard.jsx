import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import RoleHero from '../components/RoleHero';
import StatCard from '../components/StatCard';
import { BarChart, PieChart, LineChart } from '../components/Charts';
import api from '../api/axios';

const SuperAdminDashboard = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/super-admin/dashboard').then((res) => setData(res.data));
  }, []);

  if (!data) return <DashboardLayout title="Super Admin Dashboard"><p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p></DashboardLayout>;

  const { cards, charts, recentComplaints, pendingApprovalsList, recentActivity, helplineQueue } = data;
  const monthlyLabels = charts.monthly.map((m) => `${m._id.month}/${m._id.year}`);

  return (
    <DashboardLayout title="Super Admin Dashboard" subtitle="Full system oversight — governance, approvals, and monitoring.">
      <RoleHero
        stats={[
          { label: 'Pending approvals', value: cards.pendingApprovals },
          { label: 'Active complaints', value: cards.pendingComplaints },
          { label: 'Escalated', value: cards.escalatedComplaints },
          { label: 'Admins', value: cards.totalAdmins },
        ]}
        actions={[
          { label: 'Approval Center', to: '/super-admin/approvals', icon: '✅' },
          { label: 'Manage Admins', to: '/super-admin/admins', icon: '🛡️' },
          { label: 'Departments', to: '/super-admin/departments', icon: '🏛️' },
          { label: 'Activity Log', to: '/super-admin/activity', icon: '🕘' },
          { label: 'Settings', to: '/super-admin/settings', icon: '⚙️' },
        ]}
        note="You hold the highest authority: create admins and officers, approve sensitive changes and audit every action."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Citizens" value={cards.totalCitizens} color="blue" to="/super-admin/citizens" />
        <StatCard label="Total Officers" value={cards.totalOfficers} color="navy" to="/super-admin/officers" />
        <StatCard label="Total Admins" value={cards.totalAdmins} color="purple" to="/super-admin/admins" />
        <StatCard label="Departments" value={cards.totalDepartments} color="navy" to="/super-admin/departments" />
        <StatCard label="Total Complaints" value={cards.totalComplaints} color="blue" to="/super-admin/complaints" />
        <StatCard label="Pending Approvals" value={cards.pendingApprovals} color="amber" to="/super-admin/approvals" />
        <StatCard label="Active Complaints" value={cards.pendingComplaints} color="amber" to="/super-admin/complaints?status=Pending" />
        <StatCard label="Resolved" value={cards.resolvedComplaints} color="green" to="/super-admin/complaints?status=Resolved" />
        <StatCard label="Closed" value={cards.closedComplaints} color="navy" to="/super-admin/complaints?status=Closed" />
        <StatCard label="Rejected" value={cards.rejectedComplaints} color="red" to="/super-admin/complaints?status=Rejected" />
        <StatCard label="Escalated" value={cards.escalatedComplaints} color="red" to="/super-admin/complaints?escalated=true" />
        <StatCard label="Anonymous Complaints" value={cards.anonymousComplaints} color="purple" to="/super-admin/complaints?anonymous=true" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="font-display font-bold text-navy-900 dark:text-white mb-3">Department Wise Complaints</h3>
          <BarChart labels={charts.departmentWise.map((d) => d.name || 'Unknown')} data={charts.departmentWise.map((d) => d.count)} />
        </div>
        <div className="card">
          <h3 className="font-display font-bold text-navy-900 dark:text-white mb-3">Status Distribution</h3>
          <PieChart labels={charts.statusDistribution.map((s) => s._id)} data={charts.statusDistribution.map((s) => s.count)} />
        </div>
        <div className="card lg:col-span-2">
          <h3 className="font-display font-bold text-navy-900 dark:text-white mb-3">Monthly Complaint Trend</h3>
          <LineChart labels={monthlyLabels} data={charts.monthly.map((m) => m.count)} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-navy-900 dark:text-white">Pending Approvals</h3>
            <Link to="/super-admin/approvals" className="text-xs font-semibold text-accent-500 hover:underline">View all →</Link>
          </div>
          {pendingApprovalsList.length === 0 ? <p className="text-sm text-slate-400">Nothing pending.</p> : (
            <ul className="flex flex-col gap-2 text-sm">
              {pendingApprovalsList.map((r) => (
                <li key={r._id} className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-900 px-3 py-2">
                  <span className="dark:text-slate-300">{r.type.replace(/_/g, ' ')} — {r.requestedBy?.name}</span>
                  <span className="font-mono text-xs text-slate-400">{r.requestId}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-navy-900 dark:text-white">Helpline Queue</h3>
            <Link to="/super-admin/helpline" className="text-xs font-semibold text-accent-500 hover:underline">View all →</Link>
          </div>
          {helplineQueue.length === 0 ? <p className="text-sm text-slate-400">No open tickets.</p> : (
            <ul className="flex flex-col gap-2 text-sm">
              {helplineQueue.map((t) => (
                <li key={t._id} className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-900 px-3 py-2">
                  <span className="dark:text-slate-300 truncate">{t.subject}</span>
                  <span className="text-xs text-slate-400">{t.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-navy-900 dark:text-white">Recent Complaints</h3>
            <Link to="/super-admin/complaints" className="text-xs font-semibold text-accent-500 hover:underline">View all →</Link>
          </div>
          <ul className="flex flex-col gap-2 text-sm">
            {recentComplaints.map((c) => (
              <li key={c._id} className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-900 px-3 py-2">
                <span className="dark:text-slate-300 truncate">{c.complaintId} — {c.title}</span>
                <span className="text-xs text-slate-400">{c.status}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-navy-900 dark:text-white">Recent Activity</h3>
            <Link to="/super-admin/activity" className="text-xs font-semibold text-accent-500 hover:underline">View all →</Link>
          </div>
          <ul className="flex flex-col gap-2 text-sm">
            {recentActivity.map((a) => (
              <li key={a._id} className="rounded-lg bg-slate-50 dark:bg-slate-900 px-3 py-2">
                <p className="dark:text-slate-300">
                  <span className="font-semibold">{a.actorName || a.actorRole}</span> {a.action}
                  {a.targetLabel ? ` — ${a.targetLabel}` : ''}
                </p>
                <p className="text-[10px] text-slate-400">{new Date(a.createdAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminDashboard;
