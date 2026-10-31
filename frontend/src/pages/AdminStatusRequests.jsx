import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import api from '../api/axios';

const statusColor = {
  Pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  Approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  Rejected: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
};

const AdminStatusRequests = () => {
  const [requests, setRequests] = useState([]);
  const [remarks, setRemarks] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Pending');

  const load = () => {
    setLoading(true);
    api.get('/status-requests', { params: filter ? { status: filter } : {} }).then((res) => setRequests(res.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [filter]); // eslint-disable-line

  const decide = async (id, decision) => {
    await api.put(`/status-requests/${id}/decide`, { decision, remark: remarks[id] || '' });
    load();
  };

  return (
    <DashboardLayout title="Status Change Requests" subtitle="Officers cannot move a complaint backward directly — review and approve or reject their requests here.">
      <div className="mb-4 flex gap-2">
        {['Pending', 'Approved', 'Rejected', ''].map((s) => (
          <button key={s || 'all'} onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${filter === s ? 'bg-navy-900 text-white' : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
            {s || 'All'}
          </button>
        ))}
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
                    <Link to={`/complaints/${r.complaint?._id}`} className="font-semibold text-navy-900 dark:text-white hover:underline">
                      {r.complaint?.complaintId} — {r.complaint?.title}
                    </Link>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor[r.status]}`}>{r.status}</span>
                </div>
                <p className="mt-2 text-sm dark:text-slate-300">
                  Requested by <strong>{r.requestedBy?.name}</strong> ({r.requestedBy?.employeeId}) — move{' '}
                  <strong>{r.currentStatus}</strong> → <strong>{r.requestedStatus}</strong>
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Reason: {r.reason}</p>

                {r.status === 'Pending' ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      placeholder="Optional remark..."
                      value={remarks[r._id] || ''}
                      onChange={(e) => setRemarks({ ...remarks, [r._id]: e.target.value })}
                      className="input flex-1 min-w-[12rem]"
                    />
                    <button onClick={() => decide(r._id, 'Approved')} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition">Approve</button>
                    <button onClick={() => decide(r._id, 'Rejected')} className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition">Reject</button>
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

export default AdminStatusRequests;
