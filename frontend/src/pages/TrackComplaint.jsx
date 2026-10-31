import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import AutoCloseNotice from '../components/AutoCloseNotice';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import { useLanguage } from '../context/LanguageContext';

const TrackComplaint = () => {
  const [searchParams] = useSearchParams();
  const [id, setId] = useState(searchParams.get('id') || '');
  const [complaint, setComplaint] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const runSearch = async (complaintId) => {
    setError('');
    setComplaint(null);
    setLoading(true);
    try {
      const { data } = await api.get(`/complaints/track/${encodeURIComponent(complaintId.trim())}`);
      setComplaint(data);
    } catch (err) {
      setError(err.response?.data?.message || 'No complaint found with this ID. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fromQuery = searchParams.get('id');
    if (fromQuery) runSearch(fromQuery);
  }, []); // eslint-disable-line

  // Keep the status fresh while the page is open.
  useEffect(() => {
    if (!complaint?.complaintId) return undefined;
    const timer = setInterval(() => {
      api.get(`/complaints/track/${encodeURIComponent(complaint.complaintId)}`).then((r) => setComplaint(r.data)).catch(() => {});
    }, 30000);
    return () => clearInterval(timer);
  }, [complaint?.complaintId]);

  const copyId = () => {
    navigator.clipboard?.writeText(complaint.complaintId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const search = (e) => {
    e.preventDefault();
    runSearch(id);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <Navbar />
      <div className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="font-display text-2xl font-bold text-navy-900 dark:text-white">{t('track.heading')}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('track.sub')}</p>

        <form onSubmit={search} className="mt-6 flex gap-3">
          <input
            value={id} onChange={(e) => setId(e.target.value)} required placeholder={t('track.placeholder')}
            className="input flex-1"
          />
          <button className="rounded-lg bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 transition" disabled={loading}>
            {loading ? '...' : t('track.button')}
          </button>
        </form>

        {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">{error}</p>}

        {complaint && (
          <div className="card mt-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-navy-900 dark:text-white">{complaint.title}</h2>
              <StatusBadge status={complaint.status} />
            </div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{complaint.description}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm dark:text-slate-300">
              <p><span className="text-slate-400">{t('common.department')}:</span> {complaint.department?.name}</p>
              <p><span className="text-slate-400">{t('common.category')}:</span> {complaint.category}</p>
              <p><span className="text-slate-400">{t('common.priority')}:</span> {complaint.priority}</p>
              <p><span className="text-slate-400">{t('common.filed')}:</span> {new Date(complaint.createdAt).toLocaleDateString()}</p>
              {complaint.state && <p><span className="text-slate-400">{t('common.state')}:</span> {complaint.state}</p>}
              {complaint.district && <p><span className="text-slate-400">{t('common.district')}:</span> {complaint.district}</p>}
            </div>

            {complaint.citizenTimeline?.steps?.length > 0 && (() => {
              const steps = complaint.citizenTimeline.steps;
              const rejected = complaint.status === 'Rejected';
              const pct = rejected ? 100 : Math.round(((steps.filter((x) => x.done).length - 1) / (steps.length - 1)) * 100);
              const daysOpen = Math.max(0, Math.floor((Date.now() - new Date(complaint.createdAt)) / 86400000));
              return (
                <div className="mt-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-navy-900 dark:text-white">Progress</p>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{pct}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className={`h-full rounded-full transition-all ${rejected ? 'bg-rose-500' : 'bg-gradient-to-r from-accent-500 to-emerald-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-slate-600 dark:text-slate-300">Open for {daysOpen} day{daysOpen === 1 ? '' : 's'}</span>
                    {!rejected && complaint.status !== 'Closed' && (
                      <span className={`rounded-full px-3 py-1 ${complaint.assigned ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'}`}>
                        {complaint.assigned ? 'An officer is handling this' : 'Waiting for an officer to be assigned'}
                      </span>
                    )}
                  </div>

                  {complaint.status === 'Resolved' && <div className="mt-4"><AutoCloseNotice autoCloseAt={complaint.autoCloseAt} hours={complaint.autoCloseHours} /></div>}
                  {complaint.status === 'Closed' && complaint.autoClosed && (
                    <p className="mt-4 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">Closed automatically {complaint.autoCloseHours} hours after it was resolved.</p>
                  )}

                  <ol className="mt-5 flex flex-col gap-4 border-l border-slate-200 dark:border-slate-800 pl-4">
                    {steps.map((st, i) => (
                      <li key={i} className="relative">
                        <span className={`absolute -left-[21px] top-1 h-3 w-3 rounded-full ${st.isTerminalNegative ? 'bg-rose-500' : st.done ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
                        <p className={`text-sm ${st.current ? 'font-bold text-navy-900 dark:text-white' : st.done ? 'font-medium text-slate-700 dark:text-slate-300' : 'text-slate-400'}`}>
                          {st.label}{st.current ? ' — current' : ''}
                        </p>
                        {st.reachedAt && <p className="text-xs text-slate-400">{new Date(st.reachedAt).toLocaleString()}</p>}
                      </li>
                    ))}
                  </ol>
                  {complaint.updatedAt && <p className="mt-4 text-xs text-slate-400">Last updated {new Date(complaint.updatedAt).toLocaleString()} · refreshes automatically</p>}

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button onClick={copyId} className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                      {copied ? '✓ Copied' : `Copy ID ${complaint.complaintId}`}
                    </button>
                    {user?.role === 'citizen' && (
                      <Link to={`/complaints/${complaint.complaintId}`} className="rounded-lg bg-accent-500 px-4 py-2 text-xs font-semibold text-white hover:bg-accent-600">
                        Open full view & chat with officer
                      </Link>
                    )}
                    {!user && (
                      <Link to="/login" className="rounded-lg border border-accent-500 px-4 py-2 text-xs font-semibold text-accent-500 hover:bg-accent-500/10">
                        Log in to chat with the officer
                      </Link>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackComplaint;
