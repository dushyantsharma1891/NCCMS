import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ChatAssistant from '../components/ChatAssistant';
import Logo from '../assets/Logo';
import Watermark from '../assets/Watermark';
import api from '../api/axios';
import { useLanguage } from '../context/LanguageContext';

const departmentTypes = [
  { name: 'Central Government', desc: 'Railways, Passport, Income Tax, GST, Cyber Crime & more', icon: '🏛️' },
  { name: 'State Government', desc: 'Police, Municipal, Electricity, Water, Health & more', icon: '🏢' },
  { name: 'Public Sector', desc: 'SBI, PNB, LIC, BSNL, Indian Oil & more', icon: '🏦' },
  { name: 'Private Sector', desc: 'Banks, Telecom, E-commerce, Insurance & Business', icon: '🏬' },
];

const steps = [
  { n: '01', title: 'Register & Login', desc: 'Create your citizen account in under a minute.' },
  { n: '02', title: 'Submit Complaint', desc: 'Choose the right department and category, attach evidence.' },
  { n: '03', title: 'Track Progress', desc: 'Follow live status updates from Pending to Resolved.' },
  { n: '04', title: 'Get Resolution', desc: 'Receive notifications and proof of resolution.' },
];

const features = [
  { icon: '🔒', title: 'Officer Accountability', desc: 'Officers can only act on a complaint once an admin explicitly assigns it to them — every action is timestamped and traceable.' },
  { icon: '🗂️', title: 'Auto-Archival Privacy', desc: 'Resolved, closed or rejected complaints quietly leave active views after a few days, keeping dashboards clean without losing the record.' },
  { icon: '🖨️', title: 'Printable Official Receipt', desc: 'Every complaint can be printed as a signed, watermarked receipt for your records.' },
  { icon: '🌐', title: 'Hindi & English', desc: 'Use the portal in the language you\'re comfortable with, switch anytime.' },
];

const Landing = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [trackId, setTrackId] = useState('');

  useEffect(() => {
    api.get('/meta/public-stats').then((res) => setStats(res.data)).catch(() => {});
  }, []);

  const quickTrack = (e) => {
    e.preventDefault();
    if (!trackId.trim()) return;
    navigate(`/track?id=${encodeURIComponent(trackId.trim())}`);
  };

  const statItems = [
    { label: 'Complaints Filed', value: stats?.totalComplaints },
    { label: 'Resolved', value: stats?.resolved },
    { label: 'Departments Covered', value: stats?.departments },
    { label: 'Registered Citizens', value: stats?.citizens },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <Navbar />

      <section className="relative overflow-hidden bg-navy-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.35),transparent_45%)]" />
        <Watermark className="absolute inset-x-0 bottom-0 w-full text-white" opacity={0.05} />

        <div className="relative mx-auto max-w-7xl px-6 py-20">
          <div className="flex items-center gap-3 mb-6">
            <Logo size={44} />
            <p className="rounded-full bg-white/10 px-4 py-1 text-xs font-semibold tracking-wide text-blue-200">
              {t('landing.tag')}
            </p>
          </div>
          <h1 className="font-display max-w-3xl text-4xl font-black leading-tight sm:text-5xl">
            {t('landing.title')}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-300">
            {t('landing.subtitle')}
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/register" className="rounded-lg bg-accent-500 px-6 py-3 font-semibold hover:bg-accent-600 transition">
              {t('landing.file')}
            </Link>
            <Link to="/departments" className="rounded-lg border border-white/30 px-6 py-3 font-semibold hover:bg-white/10 transition">
              {t('nav.departments')}
            </Link>
          </div>

          {/* Quick track widget — right on the homepage, no login needed */}
          <form onSubmit={quickTrack} className="mt-10 max-w-lg rounded-2xl border border-white/15 bg-white/5 backdrop-blur p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-200 mb-2">{t('track.heading')}</p>
            <div className="flex gap-2">
              <input
                value={trackId}
                onChange={(e) => setTrackId(e.target.value)}
                placeholder={t('track.placeholder')}
                className="flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-accent-500"
              />
              <button className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-navy-950 hover:bg-blue-50 transition">
                {t('track.button')}
              </button>
            </div>
          </form>

          {/* Live impact numbers */}
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4 max-w-3xl">
            {statItems.map((s) => (
              <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="font-display text-2xl font-bold">{s.value ?? '—'}</p>
                <p className="text-xs text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="font-display text-2xl font-bold text-navy-900 dark:text-white">Why NCCMS</h2>
        <p className="mt-1 text-slate-500 dark:text-slate-400">Built for transparency between citizens, officers, and the administration.</p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="card hover:shadow-md transition">
              <div className="text-3xl">{f.icon}</div>
              <h3 className="mt-3 font-display font-bold text-navy-900 dark:text-white">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <h2 className="font-display text-2xl font-bold text-navy-900 dark:text-white">{t('landing.deptHeading')}</h2>
        <p className="mt-1 text-slate-500 dark:text-slate-400">{t('landing.deptSub')}</p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {departmentTypes.map((d) => (
            <div key={d.name} className="card hover:shadow-md transition">
              <div className="text-3xl">{d.icon}</div>
              <h3 className="mt-3 font-display font-bold text-navy-900 dark:text-white">{d.name}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{d.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative bg-white dark:bg-slate-900 py-16 transition-colors overflow-hidden">
        <Watermark className="absolute right-0 top-0 w-96 text-navy-900 dark:text-white" opacity={0.04} />
        <div className="relative mx-auto max-w-7xl px-6">
          <h2 className="font-display text-2xl font-bold text-navy-900 dark:text-white">{t('landing.howHeading')}</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.n} className="relative rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
                <span className="font-display text-4xl font-black text-slate-100 dark:text-slate-800">{s.n}</span>
                <h3 className="mt-2 font-display font-bold text-navy-900 dark:text-white">{s.title}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Logo size={22} />
          <span className="font-display font-bold text-navy-900 dark:text-white">NCCMS</span>
        </div>
        © {new Date().getFullYear()} National Citizen Complaint Management System · Department of Public Grievances
      </footer>
      <ChatAssistant />
    </div>
  );
};

export default Landing;
