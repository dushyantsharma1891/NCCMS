import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const STORE = 'nccms_chat_v1';
const QUICK = [
  'Road is damaged and water collects there',
  'My electricity bill is very high',
  'No water supply for 3 days',
  'How do I track my complaint?',
];

const confidenceColor = {
  High: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  Medium: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  Low: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

// A problem description (as opposed to a quick question) is long enough and
// not obviously a "how do I…" question — those also get a complaint draft.
const looksLikeProblem = (t) => t.trim().length >= 25 && !/^(how|what|where|when|can i|do i)\b/i.test(t.trim());

const greeting = (deptName) => ({
  role: 'bot',
  text: deptName
    ? `Hi! 👋 I can help you file a complaint with ${deptName}. Tell me what went wrong and I'll draft it for you.`
    : "Hi! 👋 I'm the NCCMS assistant. Tell me your problem in your own words — I'll suggest the right department, category and priority and can pre-fill the complaint form for you.",
});

// Floating help chat shown on the home page, department pages and everywhere a
// citizen can register a complaint. It only SUGGESTS — it never submits for you.
const ChatAssistant = ({ department }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState(() => {
    try { const saved = JSON.parse(sessionStorage.getItem(STORE)); if (saved?.length) return saved; } catch { /* ignore */ }
    return [greeting(department?.name)];
  });
  const endRef = useRef(null);

  const base = user ? '/ai' : '/ai/public';
  // Staff accounts have no use for the complaint helper (checked AFTER all
  // hooks so the hook order never changes between renders).
  const hidden = !!user && user.role !== 'citizen';

  useEffect(() => { sessionStorage.setItem(STORE, JSON.stringify(messages.slice(-30))); }, [messages]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, open, busy]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || busy) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: msg }]);
    setBusy(true);
    try {
      const wantsDraft = looksLikeProblem(msg);
      const [chatRes, sugRes] = await Promise.all([
        api.post(`${base}/chat`, { message: msg }),
        wantsDraft ? api.post(`${base}/suggest`, { description: msg }).catch(() => null) : Promise.resolve(null),
      ]);
      const next = [{ role: 'bot', text: chatRes.data.reply }];
      if (sugRes?.data) next.push({ role: 'bot', suggestion: sugRes.data, original: msg });
      setMessages((m) => [...m, ...next]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'bot', text: err.response?.data?.message || 'Sorry, I could not reach the assistant right now. Please try again.' }]);
    } finally {
      setBusy(false);
    }
  };

  // Hand the draft to the normal complaint form. Citizen still reviews/edits
  // and must press Submit themselves. Guests are asked to log in first and
  // are returned to the pre-filled form afterwards.
  const createFromSuggestion = (s, original) => {
    const params = new URLSearchParams({
      title: s.suggestedTitle || '',
      description: s.suggestedDescription || original,
      category: s.recommendedCategory || '',
      priority: s.recommendedPriority || 'Medium',
    });
    const dept = s.recommendedDepartment || (department ? { _id: department._id, name: department.name } : null);
    if (dept?._id) { params.set('department', dept._id); params.set('name', dept.name); }
    const target = `/complaints/new?${params.toString()}`;
    setOpen(false);
    if (user) navigate(target);
    else navigate('/login', { state: { redirectTo: target } });
  };

  const reset = () => { setMessages([greeting(department?.name)]); };

  if (hidden) return null;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-accent-500 to-navy-900 px-5 py-3 text-sm font-semibold text-white shadow-xl hover:scale-105 transition"
          aria-label="Open help chat"
        >
          <span className="text-lg">💬</span> Need help?
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex h-[34rem] max-h-[85vh] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl">
          <div className="flex items-center justify-between bg-gradient-to-r from-navy-900 to-accent-500 px-4 py-3 text-white">
            <div>
              <p className="text-sm font-bold">NCCMS Assistant</p>
              <p className="text-[11px] opacity-80">Automated help — not a government officer</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={reset} title="New chat" className="rounded-md px-2 py-1 text-xs hover:bg-white/20">↺</button>
              <button onClick={() => setOpen(false)} title="Close" className="rounded-md px-2 py-1 text-sm hover:bg-white/20">✕</button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3 text-sm">
            {messages.map((m, i) => (
              m.suggestion ? (
                <div key={i} className="max-w-[92%] rounded-xl border border-accent-500/40 bg-accent-500/5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-accent-500">AI complaint draft</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${confidenceColor[m.suggestion.confidence] || confidenceColor.Low}`}>
                      {m.suggestion.confidence} confidence
                    </span>
                  </div>
                  <dl className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <div><dt className="inline text-slate-400">Department: </dt><dd className="inline font-semibold">{m.suggestion.recommendedDepartment?.name || 'choose on the form'}</dd></div>
                    <div><dt className="inline text-slate-400">Category: </dt><dd className="inline font-semibold">{m.suggestion.recommendedCategory}</dd></div>
                    <div><dt className="inline text-slate-400">Priority: </dt><dd className="inline font-semibold">{m.suggestion.recommendedPriority}</dd></div>
                    <div><dt className="inline text-slate-400">Title: </dt><dd className="inline font-semibold">{m.suggestion.suggestedTitle}</dd></div>
                  </dl>
                  {m.suggestion.missingInfo?.length > 0 && (
                    <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-300">Tip: also mention {m.suggestion.missingInfo.join(', ').toLowerCase()}.</p>
                  )}
                  <button
                    onClick={() => createFromSuggestion(m.suggestion, m.original)}
                    className="mt-3 w-full rounded-lg bg-accent-500 py-2 text-xs font-semibold text-white hover:bg-accent-600 transition"
                  >
                    ✨ Create complaint with this suggestion
                  </button>
                  <p className="mt-2 text-[10px] italic text-slate-400">{m.suggestion.disclaimer || 'AI suggestions are recommendations. Please verify before submitting.'}{!user && ' You will be asked to log in first.'}</p>
                </div>
              ) : (
                <div
                  key={i}
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 ${
                    m.role === 'user' ? 'ml-auto bg-navy-900 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {m.text}
                </div>
              )
            ))}
            {busy && <div className="w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 px-3 py-2 text-slate-400">• • •</div>}
            {messages.length <= 1 && !busy && (
              <div className="flex flex-wrap gap-2 pt-1">
                {QUICK.map((q) => (
                  <button key={q} onClick={() => send(q)} className="rounded-full border border-slate-300 dark:border-slate-600 px-3 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                    {q}
                  </button>
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 border-t border-slate-200 dark:border-slate-700 p-3">
            <input
              value={input} onChange={(e) => setInput(e.target.value)} placeholder="Describe your problem…"
              className="input flex-1 !py-2 text-sm"
            />
            <button type="submit" disabled={busy || !input.trim()} className="rounded-lg bg-navy-900 px-4 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50">
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatAssistant;
