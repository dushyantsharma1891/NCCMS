import React, { useEffect, useRef, useState } from 'react';
import api from '../api/axios';

// Direct conversation about one complaint. Citizen <-> assigned officer
// (Admin / Super Admin can read and join in). Refreshes every few seconds.
const ComplaintChat = ({ complaintId, title = 'Chat', bare = false }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const lastCount = useRef(0);

  const load = () => api.get(`/complaint-chat/${complaintId}`)
    .then((r) => { setData(r.data); setError(''); })
    .catch((e) => setError(e.response?.data?.message || 'Could not load the chat'));

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [complaintId]); // eslint-disable-line

  useEffect(() => {
    if (data && data.messages.length !== lastCount.current) {
      lastCount.current = data.messages.length;
      endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [data]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await api.post(`/complaint-chat/${complaintId}`, { text });
      setText('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send the message');
    } finally {
      setSending(false);
    }
  };

  const body = (
    <>
      {error && <p className="mb-2 rounded-lg bg-rose-50 dark:bg-rose-950 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">{error}</p>}
      {!data ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <>
          {data.officer ? (
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              Handling officer: <strong className="text-slate-700 dark:text-slate-200">{data.officer.name}</strong>
              {data.officer.employeeId && <span className="font-mono"> ({data.officer.employeeId})</span>}
              {data.officer.isComplaintHead && <span className="ml-1 rounded-full bg-amber-100 dark:bg-amber-950 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300">Complaint Head</span>}
            </p>
          ) : (
            <p className="mb-3 rounded-lg bg-amber-50 dark:bg-amber-950 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">No officer is assigned yet.</p>
          )}

          <div className="flex max-h-72 min-h-[8rem] flex-col gap-2 overflow-y-auto rounded-lg bg-slate-50 dark:bg-slate-950 p-3">
            {data.messages.length === 0 && <p className="m-auto text-center text-xs text-slate-400">No messages yet. Say hello 👋</p>}
            {data.messages.map((m) => (
              <div key={m._id} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.mine ? 'self-end bg-navy-900 text-white' : 'self-start bg-white dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'}`}>
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                <p className={`mt-1 text-[10px] ${m.mine ? 'text-slate-300' : 'text-slate-400'}`}>{m.senderName} · {new Date(m.createdAt).toLocaleString()}</p>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {data.canPost ? (
            <form onSubmit={send} className="mt-3 flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Type a message…" className="input flex-1 !py-2 text-sm" />
              <button type="submit" disabled={sending || !text.trim()} className="rounded-lg bg-accent-500 px-4 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-50">Send</button>
            </form>
          ) : (
            <p className="mt-3 text-xs italic text-slate-400">{data.readOnlyReason}</p>
          )}
        </>
      )}
    </>
  );

  if (bare) return body;
  return (
    <div className="card h-fit">
      <h2 className="font-display font-bold text-navy-900 dark:text-white">{title}</h2>
      <div className="mt-3">{body}</div>
    </div>
  );
};

export default ComplaintChat;
