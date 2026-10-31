import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const statusColor = {
  New: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  Assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  'In Progress': 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  Answered: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
  Resolved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  Escalated: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
};

// Inbox of the department's Complaint Head: citizens who used the
// department helpline land here, directly with this officer.
const OfficerHelpline = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState('');
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => api.get('/helpline', { params: filter ? { status: filter } : {} })
    .then((r) => { setTickets(r.data); setError(''); })
    .catch((e) => setError(e.response?.data?.message || 'Could not load the helpline'))
    .finally(() => setLoading(false));

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [filter]); // eslint-disable-line

  const open = async (t) => {
    const { data } = await api.get(`/helpline/${t._id}`);
    setSelected(data);
    load();
  };
  const send = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    await api.post(`/helpline/${selected._id}/reply`, { text: reply });
    setReply('');
    open(selected);
  };
  const setStatus = async (status) => {
    await api.put(`/helpline/${selected._id}/status`, { status });
    open(selected);
  };

  if (!user.isComplaintHead) {
    return (
      <DashboardLayout title="Department Helpline">
        <div className="card">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Only your department's <strong>Complaint Head</strong> receives department helpline questions. An Admin or Super Admin can give you this rank.
          </p>
          <p className="mt-2 text-xs text-slate-400">If you were just made Complaint Head, log out and back in to refresh your menu.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Department Helpline" subtitle={`You are the Complaint Head${user.department?.name ? ` of ${user.department.name}` : ''}. Citizens who use the department helpline reach you directly.`}>
      <div className="mb-4 flex flex-wrap gap-2">
        {['', 'New', 'Assigned', 'In Progress', 'Answered', 'Resolved', 'Escalated'].map((s) => (
          <button key={s || 'all'} onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${filter === s ? 'bg-navy-900 text-white' : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>
      {error && <p className="mb-4 rounded-lg bg-rose-50 dark:bg-rose-950 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1 max-h-[34rem] overflow-y-auto">
          <h2 className="font-display font-bold text-navy-900 dark:text-white mb-3">Inbox</h2>
          {loading ? <p className="text-sm text-slate-400">Loading…</p> : tickets.length === 0 ? (
            <p className="text-sm text-slate-400">No citizen questions right now.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {tickets.map((t) => (
                <li key={t._id}>
                  <button onClick={() => open(t)} className={`w-full rounded-lg border p-3 text-left ${selected?._id === t._id ? 'border-accent-500 bg-accent-500/5' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-navy-900 dark:text-white">{t.subject}</p>
                      {t.unreadByOfficer && <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" title="Unread" />}
                    </div>
                    <p className="truncate text-xs text-slate-400">{t.citizen?.name}{t.complaint ? ` · ${t.complaint.complaintId}` : ''}</p>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor[t.status]}`}>{t.status}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card lg:col-span-2">
          {!selected ? <p className="text-sm text-slate-400">Select a question to answer it.</p> : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display font-bold text-navy-900 dark:text-white">{selected.subject}</h2>
                  <p className="text-xs text-slate-400">
                    {selected.ticketId} · {selected.citizen?.name}
                    {selected.complaint && <> · <Link className="text-accent-500 hover:underline" to={`/complaints/${selected.complaint._id}`}>Complaint {selected.complaint.complaintId}</Link></>}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor[selected.status]}`}>{selected.status}</span>
              </div>
              <div className="mt-4 flex max-h-96 flex-col gap-2 overflow-y-auto rounded-lg bg-slate-50 dark:bg-slate-950 p-3">
                {selected.messages.map((m, i) => {
                  const mine = m.senderRole !== 'citizen';
                  return (
                    <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${mine ? 'self-end bg-navy-900 text-white' : 'self-start bg-white dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'}`}>
                      <p className="whitespace-pre-wrap break-words">{m.text}</p>
                      <p className={`mt-1 text-[10px] ${mine ? 'text-slate-300' : 'text-slate-400'}`}>{m.senderRole === 'citizen' ? selected.citizen?.name : (m.sender?.name || m.senderRole)} · {new Date(m.createdAt).toLocaleString()}</p>
                    </div>
                  );
                })}
              </div>
              <form onSubmit={send} className="mt-3 flex gap-2">
                <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply to the citizen…" className="input flex-1" />
                <button type="submit" className="rounded-lg bg-accent-500 px-5 text-sm font-semibold text-white hover:bg-accent-600">Send</button>
              </form>
              {selected.status !== 'Resolved' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => setStatus('Resolved')} className="rounded-lg border border-emerald-400 px-4 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950">Mark Resolved</button>
                  <button onClick={() => setStatus('Escalated')} className="rounded-lg border border-amber-400 px-4 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950">Escalate to Admin</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OfficerHelpline;
