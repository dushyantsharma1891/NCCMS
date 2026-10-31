import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const statusStyle = {
  Pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  Confirmed: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
  Dismissed: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

// Admin / Super Admin: review officers' fake-complaint reports and act on the
// citizen. Officer: read-only list of the reports they filed.
const FalseComplaints = () => {
  const { user } = useAuth();
  const canReview = user.role === 'admin' || user.role === 'super_admin';
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState(canReview ? 'Pending' : '');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null); // report being reviewed
  const [action, setAction] = useState('warn');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/false-reports', { params: filter ? { status: filter } : {} })
      .then((r) => setReports(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [filter]); // eslint-disable-line

  const review = async (decision) => {
    const text = decision === 'dismiss'
      ? 'Dismiss this report? If the officer had closed the complaint, it will be reopened.'
      : action === 'deactivate'
        ? `Confirm as false AND deactivate ${open.citizen?.name}'s account? They will no longer be able to log in.`
        : 'Confirm this complaint as false?';
    if (!window.confirm(text)) return;
    setBusy(true); setMsg('');
    try {
      await api.put(`/false-reports/${open._id}/review`, { decision, action: decision === 'confirm' ? action : 'none', note });
      setMsg(decision === 'dismiss' ? 'Report dismissed.' : action === 'deactivate' ? 'Confirmed — the citizen account has been deactivated.' : action === 'warn' ? 'Confirmed — the citizen has been warned.' : 'Confirmed.');
      setOpen(null); setNote(''); setAction('warn');
      load();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Could not save the decision');
    } finally {
      setBusy(false);
    }
  };

  const base = user.role === 'super_admin' ? '/complaints' : '/complaints';

  return (
    <DashboardLayout
      title={canReview ? 'False Complaints' : 'My False-Complaint Reports'}
      subtitle={canReview
        ? 'Complaints officers reported as fake or false. Dismiss the report, or confirm it and act on the citizen.'
        : 'Reports you sent to the admins, and what they decided.'}
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {['', 'Pending', 'Confirmed', 'Dismissed'].map((s) => (
          <button key={s || 'all'} onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${filter === s ? 'bg-navy-900 text-white' : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>
      {msg && <p className="mb-4 rounded-lg bg-slate-100 dark:bg-slate-900 px-3 py-2 text-sm text-slate-600 dark:text-slate-300">{msg}</p>}

      {loading ? <p className="text-sm text-slate-400">Loading…</p> : reports.length === 0 ? (
        <div className="card py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          {filter === 'Pending' ? '🎉 No false-complaint reports waiting for review.' : 'Nothing here yet.'}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {reports.map((r) => (
            <div key={r._id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-slate-400">{r.reportId} · {new Date(r.createdAt).toLocaleString()}</p>
                  <Link to={`${base}/${r.complaint?._id}`} className="font-display font-bold text-navy-900 dark:text-white hover:underline">
                    {r.complaint?.complaintId} — {r.complaint?.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {r.department?.name} · {[r.complaint?.district, r.complaint?.state].filter(Boolean).join(', ')} · now <strong>{r.complaint?.status}</strong>
                    {r.closedByOfficer && ' · closed by officer'}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle[r.status]}`}>{r.status}{r.action !== 'None' ? ` · ${r.action}` : ''}</span>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-rose-700 dark:text-rose-300">Officer's report — {r.reasonType}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{r.reason}</p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">By {r.reportedBy?.name} ({r.reportedBy?.employeeId})</p>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Citizen</p>
                  <p className="mt-1 text-sm font-semibold text-navy-900 dark:text-white">{r.citizen?.name} <span className="font-mono text-xs font-normal text-slate-400">{r.citizen?.citizenId}</span></p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{r.citizen?.email}{r.citizen?.phone ? ` · ${r.citizen.phone}` : ''}</p>
                  <p className="mt-2 text-xs">
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${r.citizen?.isActive ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'}`}>
                      {r.citizen?.isActive ? 'Account active' : 'Account deactivated'}
                    </span>
                    <span className="ml-2 text-slate-500 dark:text-slate-400">Confirmed false complaints: <strong>{r.citizen?.falseComplaintStrikes || 0}</strong></span>
                  </p>
                </div>
              </div>

              {r.status !== 'Pending' && (
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Reviewed by {r.reviewedBy?.name} on {r.reviewedAt && new Date(r.reviewedAt).toLocaleString()}{r.adminNote && <> — “{r.adminNote}”</>}
                </p>
              )}

              {canReview && r.status === 'Pending' && (
                open?._id === r._id ? (
                  <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                    <p className="text-sm font-semibold text-navy-900 dark:text-white">Your decision</p>
                    <div className="mt-3 flex flex-col gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">If you confirm it is false, what happens to the citizen?</p>
                      {[
                        ['none', 'No action on the citizen (just record it)'],
                        ['warn', 'Send the citizen a warning'],
                        ['deactivate', 'Deactivate the citizen’s account'],
                      ].map(([val, label]) => (
                        <label key={val} className="flex items-center gap-2">
                          <input type="radio" name={`act-${r._id}`} checked={action === val} onChange={() => setAction(val)} /> {label}
                        </label>
                      ))}
                    </div>
                    <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional) — shared with the officer, and with the citizen if warned" className="input mt-3" />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button disabled={busy} onClick={() => review('confirm')} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">Confirm — it is false</button>
                      <button disabled={busy} onClick={() => review('dismiss')} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">Dismiss — it is genuine</button>
                      <button onClick={() => setOpen(null)} className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setOpen(r); setAction('warn'); setNote(''); setMsg(''); }} className="mt-4 rounded-lg bg-navy-900 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800">Review</button>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default FalseComplaints;
