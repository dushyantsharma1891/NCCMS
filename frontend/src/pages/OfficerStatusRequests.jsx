import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import api from '../api/axios';

const statusColor = {
  Pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  Approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  Rejected: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
};

const OfficerStatusRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/status-requests').then((res) => setRequests(res.data)).finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout title="Status Change Requests" subtitle="Requests you've raised to move a complaint backward in the lifecycle (e.g. Resolved → In Progress). These need Admin approval.">
      <div className="card">
        {loading ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p> : requests.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            No requests yet. You can raise one from a complaint's detail page if it needs to move backward (e.g. reopening a Resolved complaint).
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className="py-3 pr-4">Request ID</th>
                  <th className="py-3 pr-4">Complaint</th>
                  <th className="py-3 pr-4">Change</th>
                  <th className="py-3 pr-4">Reason</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Remark</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r._id} className="border-b border-slate-100 dark:border-slate-800/60">
                    <td className="py-3 pr-4 font-mono text-xs font-semibold dark:text-slate-200">{r.requestId}</td>
                    <td className="py-3 pr-4">
                      <Link to={`/complaints/${r.complaint?._id}`} className="text-accent-500 hover:underline font-medium">{r.complaint?.complaintId}</Link>
                    </td>
                    <td className="py-3 pr-4 dark:text-slate-300">{r.currentStatus} → {r.requestedStatus}</td>
                    <td className="py-3 pr-4 dark:text-slate-300 max-w-xs truncate">{r.reason}</td>
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

export default OfficerStatusRequests;
