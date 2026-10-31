import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import api from '../api/axios';

const statusColor = {
  Pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  Approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  Rejected: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
};

const typeLabel = {
  create_officer: 'Create Officer',
  update_officer: 'Update Officer',
  citizen_profile_correction: 'Citizen Correction',
  department_update: 'Department Update',
  complaint_edit: 'Complaint Edit',
  delete_citizen: 'Delete Citizen',
  delete_officer: 'Delete Officer',
  delete_complaint: 'Delete Complaint',
  other: 'Other',
};

const AdminApprovals = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get('/approvals', { params: filter ? { status: filter } : {} }).then((res) => setRequests(res.data)).finally(() => setLoading(false));
  }, [filter]);

  return (
    <DashboardLayout title="My Approval Requests" subtitle="Everything you've submitted for Super Admin sign-off, and its current status.">
      <div className="mb-4 flex gap-2">
        {['', 'Pending', 'Approved', 'Rejected'].map((s) => (
          <button key={s || 'all'} onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${filter === s ? 'bg-navy-900 text-white' : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>
      <div className="card">
        {loading ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p> : requests.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">No requests yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className="py-3 pr-4">Request ID</th>
                  <th className="py-3 pr-4">Type</th>
                  <th className="py-3 pr-4">Reason</th>
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Remark</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r._id} className="border-b border-slate-100 dark:border-slate-800/60">
                    <td className="py-3 pr-4 font-mono text-xs font-semibold dark:text-slate-200">{r.requestId}</td>
                    <td className="py-3 pr-4 dark:text-slate-300">{typeLabel[r.type] || r.type}</td>
                    <td className="py-3 pr-4 dark:text-slate-300 max-w-xs truncate">{r.reason}</td>
                    <td className="py-3 pr-4 dark:text-slate-300">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 pr-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor[r.status]}`}>{r.status}</span></td>
                    <td className="py-3 pr-4 dark:text-slate-300 max-w-xs truncate">{r.reviewRemark || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminApprovals;
