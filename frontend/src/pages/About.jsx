import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';

const formatSince = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : null);
const tenure = (d) => {
  if (!d) return null;
  const months = Math.max(0, Math.floor((Date.now() - new Date(d)) / (30.44 * 86400000)));
  const y = Math.floor(months / 12);
  const m = months % 12;
  return y ? `${y} yr${y > 1 ? 's' : ''}${m ? ` ${m} mo` : ''}` : `${m} mo`;
};

const initials = (name = '') => name.replace(/\b(dr|mr|mrs|ms|shri|smt)\b\.?/gi, '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

const Avatar = ({ person, size = 'h-24 w-24', ring }) => (
  person?.photo ? (
    <img src={person.photo} alt={person.name} className={`${size} shrink-0 rounded-full object-cover ring-4 ${ring}`} />
  ) : (
    <div className={`${size} shrink-0 rounded-full bg-gradient-to-br from-navy-900 to-accent-500 text-white flex items-center justify-center text-2xl font-bold ring-4 ${ring}`}>
      {initials(person?.name) || '?'}
    </div>
  )
);

const IasBadge = ({ person }) => {
  if (!person?.service) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 rounded-full bg-amber-100 dark:bg-amber-950 px-3 py-1 text-[11px] font-bold text-amber-800 dark:text-amber-300">
      <span>{person.service}</span>
      {person.batch && <span className="font-medium">· {person.batch}</span>}
      {person.cadre && <span className="font-medium">· {person.cadre} cadre</span>}
    </span>
  );
};

// One rung of the ranking order: big card with a rank badge.
const RankCard = ({ rank, tier, person, fallbackTitle, accent }) => (
  <div className={`relative w-full max-w-2xl rounded-2xl border bg-white dark:bg-slate-900 p-5 shadow-sm ${accent.border}`}>
    <span className={`absolute -top-3 left-5 rounded-full px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider ${accent.chip}`}>
      Rank {rank} · {tier}
    </span>
    <div className="mt-2 flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
      <Avatar person={person} ring={accent.ring} />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-500">{person?.designation || fallbackTitle}</p>
        <h3 className="font-display text-xl font-bold text-navy-900 dark:text-white sm:text-2xl">{person?.name || 'Not yet configured'}</h3>
        <div className="mt-1.5"><IasBadge person={person} /></div>
        {person?.about && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{person.about}</p>}
        {person?.since && (
          <p className="mt-2 text-xs text-slate-400">In office since {formatSince(person.since)}{tenure(person.since) ? ` · ${tenure(person.since)}` : ''}</p>
        )}
      </div>
    </div>
  </div>
);

const Connector = () => (
  <div className="flex flex-col items-center py-1" aria-hidden>
    <div className="h-6 w-px bg-slate-300 dark:bg-slate-700" />
    <div className="h-2 w-2 rotate-45 border-b border-r border-slate-400 dark:border-slate-600" />
  </div>
);

const ACCENTS = [
  { border: 'border-amber-300 dark:border-amber-700', chip: 'bg-amber-500 text-white', ring: 'ring-amber-200 dark:ring-amber-900' },
  { border: 'border-sky-300 dark:border-sky-800', chip: 'bg-sky-600 text-white', ring: 'ring-sky-200 dark:ring-sky-900' },
  { border: 'border-emerald-300 dark:border-emerald-800', chip: 'bg-emerald-600 text-white', ring: 'ring-emerald-200 dark:ring-emerald-900' },
];

const About = () => {
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/settings').then((res) => setSettings(res.data)).catch(() => setSettings({}));
    api.get('/meta/public-stats').then((res) => setStats(res.data)).catch(() => {});
  }, []);

  const officials = [...(settings?.officials || [])].sort((a, b) => (a.rank || 99) - (b.rank || 99));
  const top = [
    { rank: 1, tier: 'Head of State', person: settings?.president, fallbackTitle: 'President of India' },
    { rank: 2, tier: 'Head of Government', person: settings?.primeMinister, fallbackTitle: 'Prime Minister of India' },
    { rank: 3, tier: 'Head of the Civil Services', person: settings?.cabinetSecretary, fallbackTitle: 'Cabinet Secretary' },
  ];

  const governance = [
    { icon: '🛡️', title: 'Super Admin', text: 'System governance, approvals, leadership and department master data.' },
    { icon: '🧭', title: 'Admin', text: 'Day-to-day operations: assigning officers, reviewing escalations and false-complaint reports.' },
    { icon: '👮', title: 'Government Officer', text: 'Handles complaints in their department and scope; the Complaint Head answers the department helpline.' },
    { icon: '🙋', title: 'Citizen', text: 'Files, tracks and chats about complaints; can ask the helplines for help.' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <Navbar />

      {/* Hero */}
      <div className="bg-gradient-to-br from-navy-900 via-navy-800 to-accent-500/80 text-white">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-80">Government of India · Digital Governance Initiative</p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">About NCCMS</h1>
          <p className="mt-3 max-w-2xl text-sm opacity-90 sm:text-base">
            The National Citizen Complaint Management System connects citizens directly with the departments responsible for
            resolving their grievances — from central ministries to state departments, public sector undertakings and
            participating private organisations. Every complaint is tracked, every action is logged, and responsibility flows
            through a clear chain of accountability.
          </p>
          {stats && (
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Complaints filed', stats.totalComplaints],
                ['Resolved', stats.resolved],
                ['Departments', stats.departments],
                ['Citizens', stats.citizens],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur">
                  <p className="text-2xl font-bold">{Number(value).toLocaleString('en-IN')}</p>
                  <p className="text-[11px] uppercase tracking-wide opacity-80">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-12">
        {/* Ranking order */}
        <h2 className="font-display text-xl font-bold text-navy-900 dark:text-white">National Leadership &amp; Administration</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          Shown in order of rank. The elected leadership sets policy; the civil services — headed by an IAS officer, the
          Cabinet Secretary — run the administration that puts it into practice.
        </p>

        <div className="mt-8 flex flex-col items-center">
          {top.map((t, i) => (
            <React.Fragment key={t.rank}>
              <RankCard {...t} accent={ACCENTS[i]} />
              {(i < top.length - 1 || officials.length > 0) && <Connector />}
            </React.Fragment>
          ))}
        </div>

        {officials.length > 0 && (
          <>
            <h3 className="mt-2 mb-4 text-center font-display text-sm font-bold uppercase tracking-widest text-slate-400">Senior administrative officials</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {officials.map((o, i) => (
                <div key={`${o.name}-${i}`} className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                  <span className="absolute -top-3 left-5 rounded-full bg-slate-700 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">Rank {o.rank || 4 + i}</span>
                  <div className="mt-2 flex items-center gap-4">
                    <Avatar person={o} size="h-16 w-16" ring="ring-slate-200 dark:ring-slate-800" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-accent-500">{o.designation}</p>
                      <h4 className="font-display text-lg font-bold text-navy-900 dark:text-white">{o.name}</h4>
                      <div className="mt-1"><IasBadge person={o} /></div>
                    </div>
                  </div>
                  {o.about && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{o.about}</p>}
                  {o.since && <p className="mt-2 text-xs text-slate-400">In office since {formatSince(o.since)}</p>}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Political vs permanent executive */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          <div className="card">
            <p className="text-xs font-bold uppercase tracking-wide text-sky-600">Political executive</p>
            <h3 className="mt-1 font-display font-bold text-navy-900 dark:text-white">Elected leadership</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">The President, Prime Minister and Ministers decide policy. Every department on NCCMS is led by a Minister (or a Chairman / CEO for public and private bodies).</p>
          </div>
          <div className="card">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-600">Permanent executive</p>
            <h3 className="mt-1 font-display font-bold text-navy-900 dark:text-white">Civil services (IAS)</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">IAS officers serve as Secretaries and Department Heads and run daily operations — each department's page shows its Department Head and its Complaint Head.</p>
          </div>
        </div>

        {/* How NCCMS itself is governed */}
        <div className="card mt-8">
          <h2 className="font-display text-lg font-bold text-navy-900 dark:text-white">How Responsibility Flows on NCCMS</h2>
          <p className="mt-1 mb-5 text-sm text-slate-500 dark:text-slate-400">Authority runs top-down; every action is recorded in the audit log.</p>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {governance.map((g, i) => (
              <li key={g.title} className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
                <span className="absolute right-3 top-3 text-[11px] font-bold text-slate-300 dark:text-slate-600">#{i + 1}</span>
                <p className="text-2xl">{g.icon}</p>
                <p className="mt-1 font-semibold text-navy-900 dark:text-white">{g.title}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{g.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-5 text-center">
            <Link to="/departments" className="inline-block rounded-lg bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-600 transition">Browse departments &amp; their leadership →</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
