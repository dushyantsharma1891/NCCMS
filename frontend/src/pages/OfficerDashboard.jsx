import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import RoleHero from '../components/RoleHero';
import StatCard from '../components/StatCard';
import ComplaintTable from '../components/ComplaintTable';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const OfficerDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/officer/dashboard').then((res) => setData(res.data));
  }, []);

  return (
    <DashboardLayout
      title={`${user.department?.name || 'Department'} Officer`}
      subtitle="You can only act on complaints the admin has assigned to you — the department queue below is read-only until then."
    >
      <RoleHero
        stats={[
          { label: 'Assigned to me', value: data?.cards.assignedToMe },
          { label: 'Pending work', value: data?.cards.pendingMine },
          { label: 'Resolved today', value: data?.cards.resolvedToday },
          { label: 'Awaiting assignment', value: data?.cards.unassignedInDept },
        ]}
        actions={[
          { label: 'My Assigned Complaints', to: '/officer/complaints?mine=true', icon: '📋' },
          { label: 'Status Change Requests', to: '/officer/status-requests', icon: '🔁' },
          { label: 'Department Info', to: '/departments', icon: '🏛️' },
        ]}
        note="Open a complaint and use “Update Status” to move it forward: Accept → In Progress → Resolved."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Assigned to Me" value={data?.cards.assignedToMe} color="teal" to="/officer/complaints?mine=true" />
        <StatCard label="Resolved Today" value={data?.cards.resolvedToday} color="green" to="/officer/complaints?mine=true&status=Resolved" />
        <StatCard label="My Pending Work" value={data?.cards.pendingMine} color="amber" to="/officer/complaints?mine=true" />
        <StatCard label="Avg Resolution (hrs)" value={data?.cards.avgResolutionHours} color="purple" />
      </div>

      <div className="card mt-6">
        <h3 className="font-display font-bold text-navy-900 dark:text-white mb-3">My Assigned Complaints</h3>
        {!data ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>
        ) : (
          <ComplaintTable complaints={data.myComplaints} showCitizen />
        )}
      </div>

      <div className="card mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-navy-900 dark:text-white">Department Queue</h3>
          <span className="rounded-full bg-amber-100 dark:bg-amber-950 px-3 py-1 text-xs font-semibold text-amber-800 dark:text-amber-300">
            Awaiting admin assignment — {data?.cards.unassignedInDept ?? 0}
          </span>
        </div>
        {!data ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>
        ) : (
          <ComplaintTable complaints={data.queue} showCitizen />
        )}
      </div>
    </DashboardLayout>
  );
};

export default OfficerDashboard;
