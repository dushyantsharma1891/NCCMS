import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { BarChart, PieChart } from '../components/Charts';
import api from '../api/axios';

const AdminReports = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/admin/reports').then((res) => setData(res.data));
  }, []);

  if (!data) return <DashboardLayout title="Reports"><p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p></DashboardLayout>;

  return (
    <DashboardLayout title="Reports" subtitle="Breakdown by status, priority and state.">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="font-display font-bold text-navy-900 dark:text-white mb-3">By Status</h3>
          <PieChart labels={data.byStatus.map((s) => s._id)} data={data.byStatus.map((s) => s.count)} />
        </div>
        <div className="card">
          <h3 className="font-display font-bold text-navy-900 dark:text-white mb-3">By Priority</h3>
          <PieChart labels={data.byPriority.map((s) => s._id)} data={data.byPriority.map((s) => s.count)} />
        </div>
        <div className="card lg:col-span-2">
          <h3 className="font-display font-bold text-navy-900 dark:text-white mb-3">By State</h3>
          <BarChart labels={data.byState.map((s) => s._id || 'Unspecified')} data={data.byState.map((s) => s.count)} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminReports;
