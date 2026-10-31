import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';

const ComplaintTable = ({ complaints, showCitizen, showDepartment, viewerRole }) => {
  if (!complaints?.length) {
    return <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">No complaints found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <th className="py-3 pr-4">Complaint ID</th>
            <th className="py-3 pr-4">Title</th>
            {showCitizen && <th className="py-3 pr-4">Citizen</th>}
            {showDepartment && <th className="py-3 pr-4">Department</th>}
            <th className="py-3 pr-4">Category</th>
            <th className="py-3 pr-4">Priority</th>
            <th className="py-3 pr-4">Status</th>
            <th className="py-3 pr-4">Date</th>
            <th className="py-3 pr-4"></th>
          </tr>
        </thead>
        <tbody>
          {complaints.map((c) => (
            <tr key={c._id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-900">
              <td className="py-3 pr-4 font-mono text-xs font-semibold text-navy-900 dark:text-slate-100">{c.complaintId}</td>
              <td className="py-3 pr-4 max-w-[220px] truncate dark:text-slate-200">{c.title}</td>
              {showCitizen && (
                <td className="py-3 pr-4 dark:text-slate-300">
                  {c.anonymous && viewerRole !== 'super_admin' ? 'Anonymous' : (c.citizen?.name || '-')}
                  {c.anonymous && viewerRole === 'super_admin' && (
                    <span className="ml-1 rounded-full bg-rose-100 dark:bg-rose-950 px-1.5 py-0.5 text-[9px] font-semibold text-rose-700 dark:text-rose-300">anon</span>
                  )}
                </td>
              )}
              {showDepartment && <td className="py-3 pr-4 dark:text-slate-300">{c.department?.name || '-'}</td>}
              <td className="py-3 pr-4 dark:text-slate-300">{c.category}</td>
              <td className="py-3 pr-4 dark:text-slate-300">{c.priority}</td>
              <td className="py-3 pr-4"><StatusBadge status={c.status} /></td>
              <td className="py-3 pr-4 text-xs text-slate-500 dark:text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</td>
              <td className="py-3 pr-4">
                <Link to={`/complaints/${c._id}`} className="text-accent-500 hover:underline font-medium">View</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ComplaintTable;
