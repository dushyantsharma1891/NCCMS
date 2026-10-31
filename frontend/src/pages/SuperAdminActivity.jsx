import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import api from '../api/axios';

const SuperAdminActivity = () => {
  const [logs, setLogs] = useState([]);
  const [actorRole, setActorRole] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/super-admin/activity', { params: { actorRole: actorRole || undefined } }).then((res) => setLogs(res.data)).finally(() => setLoading(false));
  }, [actorRole]);

  return (
    <DashboardLayout title="System Activity Log" subtitle="Immutable audit trail — every sensitive action across the system, in one place.">
      <div className="mb-4 flex gap-2">
        {['', 'citizen', 'officer', 'admin', 'super_admin'].map((r) => (
          <button key={r || 'all'} onClick={() => setActorRole(r)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize ${actorRole === r ? 'bg-navy-900 text-white' : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
            {r ? r.replace('_', ' ') : 'All Roles'}
          </button>
        ))}
      </div>
      <div className="card">
        {loading ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className="py-3 pr-4">Time</th>
                  <th className="py-3 pr-4">Actor</th>
                  <th className="py-3 pr-4">Action</th>
                  <th className="py-3 pr-4">Target</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l._id} className="border-b border-slate-100 dark:border-slate-800/60">
                    <td className="py-3 pr-4 text-xs text-slate-400 whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td>
                    <td className="py-3 pr-4 dark:text-slate-300">{l.actorName || '—'} <span className="text-xs text-slate-400">({l.actorRole})</span></td>
                    <td className="py-3 pr-4 dark:text-slate-300">{l.action}</td>
                    <td className="py-3 pr-4 text-xs text-slate-400">{l.targetLabel || '-'} {l.reason ? `— ${l.reason}` : ''}</td>
                  </tr>
                ))}
                {logs.length === 0 && <tr><td colSpan={4} className="py-10 text-center text-sm text-slate-400">No activity recorded yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminActivity;
