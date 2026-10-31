import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const statusColor = {
  New: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  Assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  'In Progress': 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  Answered: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
  Resolved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  Escalated: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
};

const AdminHelpline = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState('');
  const [filter, setFilter] = useState('');
  const [channel, setChannel] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/helpline', { params: { ...(filter ? { status: filter } : {}), ...(channel ? { channel } : {}) } }).then((res) => setTickets(res.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [filter, channel]); // eslint-disable-line

  const openTicket = async (t) => {
    const { data } = await api.get(`/helpline/${t._id}`);
    setSelected(data);
    load();
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    await api.post(`/helpline/${selected._id}/reply`, { text: reply });
    setReply('');
    openTicket(selected);
  };

  const assignToMe = async () => {
    await api.put(`/helpline/${selected._id}/assign`, { adminId: user._id });
    openTicket(selected);
  };

  const setStatus = async (status) => {
    await api.put(`/helpline/${selected._id}/status`, { status });
    openTicket(selected);
  };

  const statuses = ['', 'New', 'Assigned', 'In Progress', 'Answered', 'Resolved', 'Escalated'];
  const [bulkPeriod, setBulkPeriod] = useState('1month');
  const [bulkMsg, setBulkMsg] = useState('');

  const bulkDelete = async () => {
    const labels = { today: "today's tickets", '1week': 'tickets older than 1 week', '1month': 'tickets older than 1 month', '3months': 'tickets older than 3 months', '4months': 'tickets older than 4 months', '1year': 'tickets older than 1 year', all: 'ALL helpline history' };
    if (!window.confirm(`Permanently delete ${labels[bulkPeriod]}? This cannot be undone.`)) return;
    const { data } = await api.delete('/helpline/bulk', { params: { period: bulkPeriod } });
    setBulkMsg(data.message);
    setSelected(null);
    load();
  };

  return (
    <DashboardLayout title="Helpline" subtitle={user.role === 'super_admin' ? 'View and answer any citizen question, assign to admins, or manage escalations.' : 'Answer citizen questions and escalate difficult ones to the Super Admin.'}>
      <div className="mb-3 flex flex-wrap gap-2">
        {[['', 'All channels'], ['official', '☎️ Official helpline'], ['department', '🏛️ Department helplines']].map(([val, label]) => (
          <button key={val || 'all'} onClick={() => setChannel(val)}
            className={`rounded-lg px-4 py-1.5 text-xs font-semibold ${channel === val ? 'bg-accent-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {statuses.map((s) => (
          <button key={s || 'all'} onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${filter === s ? 'bg-navy-900 text-white' : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {user.role === 'super_admin' && (
        <div className="card mb-4 flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold text-navy-900 dark:text-white">Delete Helpline History</p>
          <select value={bulkPeriod} onChange={(e) => setBulkPeriod(e.target.value)} className="input w-auto">
            <option value="today">Today's tickets</option>
            <option value="1week">Older than 1 week</option>
            <option value="1month">Older than 1 month</option>
            <option value="3months">Older than 3 months</option>
            <option value="4months">Older than 4 months</option>
            <option value="1year">Older than 1 year</option>
            <option value="all">Everything (all time)</option>
          </select>
          <button onClick={bulkDelete} className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition">Delete</button>
          {bulkMsg && <span className="text-xs text-slate-500 dark:text-slate-400">{bulkMsg}</span>}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <h2 className="font-display font-bold text-navy-900 dark:text-white mb-3">Queue</h2>
          {loading ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p> : tickets.length === 0 ? (
            <p className="text-sm text-slate-400">No tickets in this filter.</p>
          ) : (
            <ul className="flex flex-col gap-2 max-h-[32rem] overflow-y-auto">
              {tickets.map((t) => (
                <li key={t._id}>
                  <button onClick={() => openTicket(t)} className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${selected?._id === t._id ? 'border-accent-500 bg-accent-50 dark:bg-accent-950/30' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'}`}>
                    <p className="font-semibold text-navy-900 dark:text-white truncate">{t.subject}</p>
                    <p className="text-xs text-slate-400 truncate">{t.citizen?.name}</p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      {t.channel === 'department' ? `🏛️ ${t.department?.name || 'Department'}${t.assignedOfficer ? ` → ${t.assignedOfficer.name}` : ' (no head set)'}` : '☎️ Official helpline'}
                    </p>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor[t.status]}`}>{t.status}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card lg:col-span-2">
          {!selected ? (
            <p className="py-16 text-center text-sm text-slate-400">Select a ticket to view the conversation.</p>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="font-display font-bold text-navy-900 dark:text-white">{selected.subject}</h2>
                  <p className="text-xs text-slate-400">{selected.citizen?.name} · {selected.citizen?.email} · Assigned: {selected.assignedAdmin?.name || 'Unassigned'}</p>
                  {selected.channel === 'department' && (
                    <p className="text-xs text-slate-400">Department helpline · {selected.department?.name} · Complaint Head: {selected.assignedOfficer ? `${selected.assignedOfficer.name} (${selected.assignedOfficer.employeeId})` : 'not designated'}{selected.complaint ? ` · Complaint ${selected.complaint.complaintId}` : ''}</p>
                  )}
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor[selected.status]}`}>{selected.status}</span>
              </div>

              <div className="mt-4 flex flex-col gap-3 max-h-80 overflow-y-auto">
                {selected.messages.map((m, i) => (
                  <div key={i} className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${m.senderRole !== 'citizen' ? 'self-end bg-navy-900 text-white' : 'self-start bg-slate-100 dark:bg-slate-800 dark:text-slate-200'}`}>
                    <p>{m.text}</p>
                    <p className={`mt-1 text-[10px] ${m.senderRole !== 'citizen' ? 'text-slate-300' : 'text-slate-400'}`}>
                      {m.senderRole === 'citizen' ? selected.citizen?.name : `${m.sender?.name || m.senderRole}${m.senderRole === 'officer' ? ' (Complaint Head)' : ''}`} · {new Date(m.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              <form onSubmit={sendReply} className="mt-4 flex gap-2">
                <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type your answer..." className="input flex-1" />
                <button type="submit" className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-600 transition">Send</button>
              </form>

              <div className="mt-4 flex flex-wrap gap-2">
                {!selected.assignedAdmin && (
                  <button onClick={assignToMe} className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition">Assign to me</button>
                )}
                <button onClick={() => setStatus('Resolved')} className="rounded-lg border border-emerald-300 dark:border-emerald-800 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition">Mark Resolved</button>
                {user.role === 'admin' && (
                  <button onClick={() => setStatus('Escalated')} className="rounded-lg border border-rose-300 dark:border-rose-800 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950 transition">Escalate to Super Admin</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminHelpline;
