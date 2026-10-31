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
  citizen_profile_correction: 'Citizen Profile Correction',
  department_update: 'Department Update',
  complaint_edit: 'Complaint Edit',
  delete_citizen: 'Delete Citizen',
  delete_officer: 'Delete Officer',
  delete_complaint: 'Delete Complaint',
  other: 'Other',
};

const renderValue = (v) => {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return Object.entries(v).map(([k, val]) => `${k}: ${val}`).join(', ');
  return String(v);
};

const SuperAdminApprovals = () => {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('Pending');
  const [typeFilter, setTypeFilter] = useState('');
  const [remarks, setRemarks] = useState({});
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/approvals', { params: { status: filter || undefined, type: typeFilter || undefined } })
      .then((res) => setRequests(res.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [filter, typeFilter]); // eslint-disable-line

  const decide = async (id, action) => {
    await api.put(`/approvals/${id}/${action}`, { remark: remarks[id] || '' });
    load();
  };

  return (
    <DashboardLayout title="Approval Center" subtitle="Every sensitive Admin action — officer creation, citizen corrections, department master updates — passes through here.">
      <div className="mb-4 flex flex-wrap gap-2">
        {['Pending', 'Approved', 'Rejected', ''].map((s) => (
          <button key={s || 'all'} onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${filter === s ? 'bg-navy-900 text-white' : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
            {s || 'All Statuses'}
          </button>
        ))}
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input w-auto">
          <option value="">All Types</option>
          {Object.entries(typeLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="card">
        {loading ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p> : requests.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">No requests in this filter.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {requests.map((r) => (
              <div key={r._id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs font-semibold text-slate-400">{r.requestId}</p>
                    <p className="font-semibold text-navy-900 dark:text-white">{typeLabel[r.type] || r.type}</p>
                    <p className="text-xs text-slate-400">Requested by {r.requestedBy?.name} ({r.requestedByRole}) · {new Date(r.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor[r.status]}`}>{r.status}</span>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-2">
                    <p className="font-semibold text-slate-400">Old Value</p>
                    <p className="dark:text-slate-300">{renderValue(r.oldValue)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-2">
                    <p className="font-semibold text-slate-400">New Value</p>
                    <p className="dark:text-slate-300">{renderValue(r.newValue)}</p>
                  </div>
                </div>
                {r.reason && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Reason: {r.reason}</p>}

                {r.status === 'Pending' ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input placeholder="Optional remark..." value={remarks[r._id] || ''} onChange={(e) => setRemarks({ ...remarks, [r._id]: e.target.value })} className="input flex-1 min-w-[12rem]" />
                    <button onClick={() => decide(r._id, 'approve')} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition">Approve</button>
                    <button onClick={() => decide(r._id, 'reject')} className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition">Reject</button>
                  </div>
                ) : (
                  r.reviewRemark && <p className="mt-2 text-xs text-slate-400">Remark: {r.reviewRemark}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminApprovals;
