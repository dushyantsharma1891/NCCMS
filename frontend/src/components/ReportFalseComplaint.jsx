import React, { useEffect, useState } from 'react';
import api from '../api/axios';

// Officer's "report a fake / false complaint" box. Sends the report (with the
// officer's feedback) to the admins' False Complaints section, and can close
// the complaint at the same time.
const ReportFalseComplaint = ({ complaint, onDone }) => {
  const [open, setOpen] = useState(false);
  const [reasons, setReasons] = useState([]);
  const [reasonType, setReasonType] = useState('');
  const [reason, setReason] = useState('');
  const [close, setClose] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => { api.get('/false-reports/reasons').then((r) => setReasons(r.data)).catch(() => {}); }, []);

  if (['Closed', 'Rejected'].includes(complaint.status) && !complaint.flaggedFalse) return null;

  if (complaint.flaggedFalse) {
    return (
      <div className="card h-fit border-rose-200 dark:border-rose-900">
        <h2 className="font-display font-bold text-rose-700 dark:text-rose-300">🚩 Reported as false</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          You reported this complaint{complaint.closedAsFalse ? ' and closed it' : ''}. It is waiting for an admin to review.
          If they find it genuine, it will be reopened for you automatically.
        </p>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (!window.confirm(close ? 'Report this complaint as false AND close it? An admin will review your report.' : 'Report this complaint to the admins as false / fake?')) return;
    setBusy(true); setMsg({ type: '', text: '' });
    try {
      await api.post('/false-reports', { complaintId: complaint._id, reasonType, reason, closeComplaint: close });
      setMsg({ type: 'ok', text: 'Report sent to the admins.' });
      setOpen(false);
      onDone?.();
    } catch (err) {
      setMsg({ type: 'err', text: err.response?.data?.message || 'Could not send the report' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card h-fit">
      <h2 className="font-display font-bold text-navy-900 dark:text-white">Fake or false complaint?</h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        If this complaint is fake, misleading or misuse of the system, report it with your feedback. It goes to the admins' <em>False Complaints</em> section, and you may close it right away.
      </p>
      {msg.text && <p className={`mt-3 rounded-lg px-3 py-2 text-xs ${msg.type === 'ok' ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300'}`}>{msg.text}</p>}
      {!open ? (
        <button onClick={() => setOpen(true)} className="mt-4 rounded-lg border border-rose-400 px-4 py-2 text-sm font-semibold text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950 transition">
          🚩 Report as fake / false
        </button>
      ) : (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          <div>
            <label className="label">Why? *</label>
            <select required value={reasonType} onChange={(e) => setReasonType(e.target.value)} className="input mt-1">
              <option value="">Select a reason</option>
              {reasons.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Your feedback for the admin *</label>
            <textarea required minLength={10} rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What did you find? e.g. the address does not exist, the photos are from elsewhere, same complaint filed 5 times…" className="input mt-1" />
          </div>
          <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={close} onChange={(e) => setClose(e.target.checked)} className="mt-1" />
            <span>Also <strong>close</strong> this complaint now <span className="block text-xs text-slate-400">The admin can still reopen it if they find it genuine.</span></span>
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="flex-1 rounded-lg bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">{busy ? 'Sending…' : 'Send report'}</button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ReportFalseComplaint;
