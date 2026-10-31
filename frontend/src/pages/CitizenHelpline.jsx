import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import api from '../api/axios';

const statusColor = {
  New: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  Assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  'In Progress': 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  Answered: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
  Resolved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  Escalated: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
};

const CitizenHelpline = () => {
  const [params] = useSearchParams();
  const [tickets, setTickets] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [channel, setChannel] = useState(params.get('department') ? 'department' : 'official');
  const [form, setForm] = useState({ subject: '', message: '', department: params.get('department') || '' });
  const [deptInfo, setDeptInfo] = useState(null);
  const [reply, setReply] = useState('');
  const [showForm, setShowForm] = useState(!!params.get('department'));
  const [msg, setMsg] = useState('');

  const load = () => api.get('/helpline').then((res) => setTickets(res.data));
  useEffect(() => { load(); api.get('/departments').then((r) => setDepartments(r.data)); }, []);

  // Show who will answer once a department is picked.
  useEffect(() => {
    if (channel === 'department' && form.department) api.get(`/departments/${form.department}`).then((r) => setDeptInfo(r.data)).catch(() => setDeptInfo(null));
    else setDeptInfo(null);
  }, [channel, form.department]);

  const openTicket = async (t) => {
    const { data } = await api.get(`/helpline/${t._id}`);
    setSelected(data);
    load();
  };

  const ask = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      const { data } = await api.post('/helpline', {
        channel, subject: form.subject, message: form.message, department: form.department || undefined,
      });
      setForm({ subject: '', message: '', department: '' });
      setShowForm(false);
      setMsg(channel === 'department'
        ? (data.routedToHead ? `Sent to ${data.headName}, the Complaint Head of the department.` : 'Sent to the department helpline team (no Complaint Head is designated yet).')
        : 'Your question has been sent to the NCCMS helpline team.');
      await load();
      openTicket(data);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to send question');
    }
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    await api.post(`/helpline/${selected._id}/reply`, { text: reply });
    setReply('');
    openTicket(selected);
  };

  const channelCard = (key, icon, title, desc) => (
    <button
      type="button" onClick={() => setChannel(key)}
      className={`flex-1 rounded-xl border-2 p-4 text-left transition ${channel === key ? 'border-accent-500 bg-accent-500/5' : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'}`}
    >
      <p className="text-lg">{icon}</p>
      <p className="mt-1 text-sm font-bold text-navy-900 dark:text-white">{title}</p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{desc}</p>
    </button>
  );

  return (
    <DashboardLayout title="Helpline" subtitle="Talk to a real person: your department's Complaint Head, or the NCCMS helpline team. (Different from the automated AI assistant.)">
      <div className="mb-6 flex justify-end">
        <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-600 transition">
          {showForm ? 'Close' : '+ Ask a Question'}
        </button>
      </div>

      {msg && <p className="mb-4 rounded-lg bg-slate-100 dark:bg-slate-900 px-3 py-2 text-sm text-slate-600 dark:text-slate-300">{msg}</p>}

      {showForm && (
        <form onSubmit={ask} className="card mb-6 flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            {channelCard('department', '🏛️', 'Department helpline', "Goes straight to the department's Complaint Head officer.")}
            {channelCard('official', '☎️', 'NCCMS official helpline', 'General portal questions — answered by the Admin team.')}
          </div>

          {channel === 'department' && (
            <div>
              <label className="label">Department *</label>
              <select required value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="input mt-1">
                <option value="">Select department</option>
                {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
              {deptInfo && (
                <div className="mt-2 rounded-lg bg-slate-50 dark:bg-slate-950 p-3 text-xs text-slate-600 dark:text-slate-300">
                  {deptInfo.complaintHead?.name
                    ? <p>Complaint Head: <strong>{deptInfo.complaintHead.name}</strong> <span className="font-mono">({deptInfo.complaintHead.employeeId})</span> will receive your message.</p>
                    : <p className="text-amber-700 dark:text-amber-300">No Complaint Head is designated yet — the helpline team will answer.</p>}
                  <div className="mt-1 flex flex-wrap gap-x-4">
                    {deptInfo.helpline && <span>☎ {deptInfo.helpline}</span>}
                    {deptInfo.officialPhone && <span>📞 {deptInfo.officialPhone}</span>}
                    {deptInfo.workingHours && <span>🕘 {deptInfo.workingHours}</span>}
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="label">Subject</label>
            <input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="input mt-1" />
          </div>
          <div>
            <label className="label">Your question</label>
            <textarea required rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="input mt-1" />
          </div>
          <button type="submit" className="rounded-lg bg-navy-900 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 transition">
            {channel === 'department' ? 'Send to Department' : 'Send to NCCMS Helpline'}
          </button>
        </form>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <h2 className="font-display font-bold text-navy-900 dark:text-white mb-3">Your Conversations</h2>
          {tickets.length === 0 ? (
            <p className="text-sm text-slate-400">No questions yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {tickets.map((t) => (
                <li key={t._id}>
                  <button onClick={() => openTicket(t)} className={`w-full rounded-lg border p-3 text-left transition ${selected?._id === t._id ? 'border-accent-500 bg-accent-500/5' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-navy-900 dark:text-white">{t.subject}</p>
                      {t.unreadByCitizen && <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" title="New reply" />}
                    </div>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      {t.channel === 'department' ? `🏛️ ${t.department?.name || 'Department'}` : '☎️ NCCMS helpline'}
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
            <p className="text-sm text-slate-400">Select a conversation to read replies.</p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display font-bold text-navy-900 dark:text-white">{selected.subject}</h2>
                  <p className="text-xs text-slate-400">
                    {selected.ticketId} · {selected.channel === 'department' ? `${selected.department?.name} department helpline` : 'NCCMS helpline'}
                    {selected.assignedOfficer && ` · Complaint Head: ${selected.assignedOfficer.name}`}
                    {selected.complaint && ` · About ${selected.complaint.complaintId}`}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor[selected.status]}`}>{selected.status}</span>
              </div>
              <div className="mt-4 flex max-h-96 flex-col gap-2 overflow-y-auto rounded-lg bg-slate-50 dark:bg-slate-950 p-3">
                {selected.messages.map((m, i) => {
                  const mine = m.senderRole === 'citizen';
                  return (
                    <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${mine ? 'self-end bg-navy-900 text-white' : 'self-start bg-white dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'}`}>
                      <p className="whitespace-pre-wrap break-words">{m.text}</p>
                      <p className={`mt-1 text-[10px] ${mine ? 'text-slate-300' : 'text-slate-400'}`}>
                        {mine ? 'You' : `${m.sender?.name || m.senderRole}${m.senderRole === 'officer' ? ' (Complaint Head)' : ''}`} · {new Date(m.createdAt).toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>
              <form onSubmit={sendReply} className="mt-3 flex gap-2">
                <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply…" className="input flex-1" />
                <button type="submit" className="rounded-lg bg-accent-500 px-5 text-sm font-semibold text-white hover:bg-accent-600">Send</button>
              </form>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CitizenHelpline;
