import React from 'react';
import { useNavigate } from 'react-router-dom';

const colorMap = {
  blue: 'from-blue-50 to-blue-100 text-blue-700 dark:from-blue-950 dark:to-blue-900 dark:text-blue-200',
  green: 'from-emerald-50 to-emerald-100 text-emerald-700 dark:from-emerald-950 dark:to-emerald-900 dark:text-emerald-200',
  amber: 'from-amber-50 to-amber-100 text-amber-700 dark:from-amber-950 dark:to-amber-900 dark:text-amber-200',
  red: 'from-rose-50 to-rose-100 text-rose-700 dark:from-rose-950 dark:to-rose-900 dark:text-rose-200',
  navy: 'from-slate-100 to-slate-200 text-navy-900 dark:from-slate-800 dark:to-slate-700 dark:text-white',
  purple: 'from-violet-50 to-violet-100 text-violet-700 dark:from-violet-950 dark:to-violet-900 dark:text-violet-200',
  teal: 'from-teal-50 to-teal-100 text-teal-700 dark:from-teal-950 dark:to-teal-900 dark:text-teal-200',
};

// If `to` is provided, the whole card becomes a button that navigates there —
// used across every dashboard so e.g. "Resolved Complaints" jumps straight to
// the complaints list pre-filtered to status=Resolved, "Total Officers" jumps
// to the Officers management page, etc.
const StatCard = ({ label, value, color = 'navy', to }) => {
  const navigate = useNavigate();
  const clickable = !!to;

  return (
    <div
      onClick={clickable ? () => navigate(to) : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter') navigate(to); } : undefined}
      className={`card bg-gradient-to-br ${colorMap[color]} border-0 ${clickable ? 'cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md' : ''}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-2 text-3xl font-display font-bold">{value ?? 0}</p>
      {clickable && <p className="mt-1 text-[11px] font-semibold opacity-60">View details →</p>}
    </div>
  );
};

export default StatCard;
