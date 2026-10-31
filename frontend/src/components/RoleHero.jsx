import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Each rank gets its own look, motto and shortcuts so the four portals feel
// related but clearly different: Citizen < Officer < Admin < Super Admin.
const RANKS = {
  citizen: {
    rank: 1, label: 'Citizen', motto: 'Your voice, our responsibility.',
    gradient: 'from-sky-600 to-blue-800', chip: 'bg-white/20',
  },
  officer: {
    rank: 2, label: 'Government Officer', motto: 'Resolve fast. Keep citizens informed.',
    gradient: 'from-teal-600 to-emerald-800', chip: 'bg-white/20',
  },
  admin: {
    rank: 3, label: 'Admin', motto: 'Keep the complaint pipeline moving.',
    gradient: 'from-indigo-600 to-violet-800', chip: 'bg-white/20',
  },
  super_admin: {
    rank: 4, label: 'Super Admin', motto: 'Governance, approvals and oversight.',
    gradient: 'from-purple-700 via-navy-900 to-slate-900', chip: 'bg-amber-400/25',
  },
};
const LADDER = ['Citizen', 'Officer', 'Admin', 'Super Admin'];

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

// stats: [{ label, value }]   actions: [{ label, to, icon }]
const RoleHero = ({ stats = [], actions = [], note }) => {
  const { user } = useAuth();
  const r = RANKS[user?.role] || RANKS.citizen;
  const idLabel = user?.employeeId || user?.adminId || user?.citizenId;

  return (
    <div className={`mb-6 overflow-hidden rounded-2xl bg-gradient-to-br ${r.gradient} p-6 text-white shadow-lg`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm opacity-80">{greeting()},</p>
          <h2 className="font-display text-2xl font-bold sm:text-3xl">{user?.name}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded-full px-3 py-1 font-semibold ${r.chip}`}>{r.label}</span>
            {idLabel && <span className={`rounded-full px-3 py-1 font-mono ${r.chip}`}>{idLabel}</span>}
            {user?.department?.name && <span className={`rounded-full px-3 py-1 ${r.chip}`}>{user.department.name}</span>}
          </div>
          <p className="mt-3 text-sm italic opacity-90">“{r.motto}”</p>
          {note && <p className="mt-2 max-w-xl text-sm opacity-90">{note}</p>}
        </div>

        {/* Authority ladder — shows where this role sits in the hierarchy */}
        <div className="hidden sm:block">
          <p className="mb-2 text-right text-[10px] font-semibold uppercase tracking-widest opacity-70">Authority level</p>
          <div className="flex flex-col-reverse items-end gap-1">
            {LADDER.map((name, i) => (
              <div
                key={name}
                className={`rounded-md px-3 py-1 text-[11px] font-semibold ${i + 1 === r.rank ? 'bg-white text-slate-900' : i + 1 < r.rank ? 'bg-white/25' : 'bg-white/10 opacity-60'}`}
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {stats.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-white/15 px-4 py-3 backdrop-blur">
              <p className="text-2xl font-bold">{s.value ?? '–'}</p>
              <p className="text-[11px] uppercase tracking-wide opacity-80">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {actions.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {actions.map((a) => (
            <Link key={a.label} to={a.to} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow hover:bg-slate-100 transition">
              {a.icon && <span className="mr-1">{a.icon}</span>}{a.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoleHero;
