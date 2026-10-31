import React from 'react';

const styles = {
  Pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  Accepted: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  Assigned: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300',
  'In Progress': 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
  Resolved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  Closed: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  Rejected: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
};

const StatusBadge = ({ status }) => (
  <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${styles[status] || 'bg-slate-100 text-slate-700'}`}>
    {status}
  </span>
);

export default StatusBadge;
