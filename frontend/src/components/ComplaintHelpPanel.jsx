import React, { useEffect, useState } from 'react';
import ComplaintChat from './ComplaintChat';
import api from '../api/axios';

// The citizen's help box on the right of a complaint, two options:
//   1. Chat with the officer handling THIS complaint
//   2. Talk to the department helpline (goes to the department's Complaint Head)
const ComplaintHelpPanel = ({ complaint }) => {
  const [tab, setTab] = useState('officer');
  const [dept, setDept] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');

  const deptId = complaint.department?._id;
  const loadTicket = () => api.get(`/helpline/by-complaint/${complaint._id}`).then((r) => setTicket(r.data)).catch(() => {});

  useEffect(() => {
    if (deptId) api.get(`/departments/${deptId}`).then((r) => setDept(r.data)).catch(() => {});
    loadTicket();
    const t = setInterval(loadTicket, 10000);
    return () => clearInterval(t);
  }, [complaint._id]); // eslint-disable-line

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true); setMsg('');
    try {
      if (ticket) await api.post(`/helpline/${ticket._id}/reply`, { text });
      else {
        const { data } = await api.post('/helpline', {
          channel: 'department', complaintId: complaint._id, message: text,
          subject: `About complaint ${complaint.complaintId}`,
        });
        setMsg(data.routedToHead ? `Sent to ${data.headName}, the department Complaint Head.` : 'Sent to the department helpline team.');
      }
      setText('');
      await loadTicket();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Could not send your message');
    } finally {
      setSending(false);
    }
  };

  const head = dept?.complaintHead;
  const tabBtn = (key, label) => (
    <button
      onClick={() => setTab(key)}
      className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${tab === key ? 'bg-navy-900 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="card h-fit">
      <h2 className="font-display font-bold text-navy-900 dark:text-white">Need help with this complaint?</h2>
      <div className="mt-3 flex gap-2">
        {tabBtn('officer', '💬 Chat with handling officer')}
        {tabBtn('dept', '☎️ Department helpline')}
      </div>

      <div className="mt-4">
        {tab === 'officer' ? (
          <ComplaintChat complaintId={complaint._id} bare />
        ) : (
          <>
            <div className="mb-3 rounded-lg bg-slate-50 dark:bg-slate-950 p-3 text-xs text-slate-600 dark:text-slate-300">
              <p className="font-semibold text-navy-900 dark:text-white">{dept?.name || complaint.department?.name}</p>
              {head?.name
                ? <p className="mt-1">Your message goes straight to the <strong>Complaint Head</strong>: {head.name}{head.employeeId && <span className="font-mono"> ({head.employeeId})</span>}.</p>
                : <p className="mt-1 text-amber-700 dark:text-amber-300">This department has no Complaint Head yet — your message goes to the helpline team.</p>}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {dept?.helpline && <span>☎ {dept.helpline}</span>}
                {dept?.officialPhone && <span>📞 {dept.officialPhone}</span>}
                {dept?.email && <span>✉ {dept.email}</span>}
                {dept?.workingHours && <span>🕘 {dept.workingHours}</span>}
              </div>
            </div>

            <div className="flex max-h-64 min-h-[6rem] flex-col gap-2 overflow-y-auto rounded-lg bg-slate-50 dark:bg-slate-950 p-3">
              {!ticket && <p className="m-auto text-center text-xs text-slate-400">No conversation yet. Write below to start one.</p>}
              {ticket?.messages.map((m, i) => {
                const mine = m.senderRole === 'citizen';
                return (
                  <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${mine ? 'self-end bg-navy-900 text-white' : 'self-start bg-white dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'}`}>
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                    <p className={`mt-1 text-[10px] ${mine ? 'text-slate-300' : 'text-slate-400'}`}>
                      {mine ? 'You' : `${m.sender?.name || 'Department'}${m.senderRole === 'officer' ? ' (Complaint Head)' : ''}`} · {new Date(m.createdAt).toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>

            {msg && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{msg}</p>}
            <form onSubmit={send} className="mt-3 flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask the department…" className="input flex-1 !py-2 text-sm" />
              <button type="submit" disabled={sending || !text.trim()} className="rounded-lg bg-accent-500 px-4 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-50">Send</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ComplaintHelpPanel;
