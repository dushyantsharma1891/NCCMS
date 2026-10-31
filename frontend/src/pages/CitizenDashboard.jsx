import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import RoleHero from '../components/RoleHero';
import StatCard from '../components/StatCard';
import ComplaintTable from '../components/ComplaintTable';
import { PieChart, LineChart } from '../components/Charts';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const CitizenDashboard = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/complaints/all').then((res) => setComplaints(res.data)).finally(() => setLoading(false));
  }, []);

  const total = complaints.length;
  const pending = complaints.filter((c) => ['Pending', 'Accepted', 'Assigned', 'In Progress'].includes(c.status)).length;
  const resolved = complaints.filter((c) => c.status === 'Resolved').length;
  const rejected = complaints.filter((c) => c.status === 'Rejected').length;

  const categoryCounts = complaints.reduce((acc, c) => { acc[c.category] = (acc[c.category] || 0) + 1; return acc; }, {});
  const monthlyCounts = complaints.reduce((acc, c) => {
    const m = new Date(c.createdAt).toLocaleString('default', { month: 'short', year: '2-digit' });
    acc[m] = (acc[m] || 0) + 1;
    return acc;
  }, {});

  return (
    <DashboardLayout title="My Dashboard" subtitle="Everything about your complaints in one place.">
      <RoleHero
        stats={[{ label: 'Total', value: total }, { label: 'In progress', value: pending }, { label: 'Resolved', value: resolved }, { label: 'Rejected', value: rejected }]}
        actions={[
          { label: 'File a Complaint', to: '/complaints/new', icon: '➕' },
          { label: 'Ask AI Assistant', to: '/citizen/ai-assistant', icon: '✨' },
          { label: 'Track by ID', to: '/track', icon: '🔎' },
          { label: 'Official Helpline', to: '/citizen/helpline', icon: '☎️' },
        ]}
        note="Not sure where to complain? Use the chat button at the bottom-right — it can draft the complaint for you."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Complaints" value={total} color="navy" to="/citizen/complaints" />
        <StatCard label="Pending" value={pending} color="amber" to="/citizen/complaints?status=Pending" />
        <StatCard label="Resolved" value={resolved} color="green" to="/citizen/complaints?status=Resolved" />
        <StatCard label="Rejected" value={rejected} color="red" to="/citizen/complaints?status=Rejected" />
      </div>

      {total > 0 && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="card">
            <h3 className="font-display font-bold text-navy-900 dark:text-white mb-3">Complaints by Category</h3>
            <PieChart labels={Object.keys(categoryCounts)} data={Object.values(categoryCounts)} />
          </div>
          <div className="card">
            <h3 className="font-display font-bold text-navy-900 dark:text-white mb-3">Monthly Complaints</h3>
            <LineChart labels={Object.keys(monthlyCounts)} data={Object.values(monthlyCounts)} />
          </div>
        </div>
      )}

      <div className="card mt-6">
        <h3 className="font-display font-bold text-navy-900 dark:text-white mb-3">Recent Complaints</h3>
        {loading ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p> : <ComplaintTable complaints={complaints.slice(0, 8)} showDepartment />}
      </div>
    </DashboardLayout>
  );
};

export default CitizenDashboard;
