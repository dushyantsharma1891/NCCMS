import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import roleTheme from '../theme/roleTheme';

const iconMap = {
  Dashboard: 'M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10',
  Complaints: 'M9 12h6m-6 4h6M9 8h6M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z',
  Departments: 'M3 21h18M5 21V7l7-4 7 4v14M9 9h1m-1 4h1m4-4h1m-1 4h1M9 21v-4h6v4',
  Citizens: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m5-1.13a4 4 0 100-8 4 4 0 000 8z',
  Reports: 'M9 12h6m-3-3v6M5 3h14a1 1 0 011 1v16a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z',
  Notifications: 'M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-4-5.7V5a2 2 0 10-4 0v.3A6 6 0 006 11v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  Settings: 'M10.3 3.3a1 1 0 011.4 0l.6.6a1 1 0 00.9.3l.8-.2a1 1 0 011.2.7l.2.8a1 1 0 00.6.6l.8.2a1 1 0 01.7 1.2l-.2.8a1 1 0 00.3.9l.6.6a1 1 0 010 1.4l-.6.6a1 1 0 00-.3.9l.2.8a1 1 0 01-.7 1.2l-.8.2a1 1 0 00-.6.6l-.2.8a1 1 0 01-1.2.7l-.8-.2a1 1 0 00-.9.3l-.6.6a1 1 0 01-1.4 0l-.6-.6a1 1 0 00-.9-.3l-.8.2a1 1 0 01-1.2-.7l-.2-.8a1 1 0 00-.6-.6l-.8-.2a1 1 0 01-.7-1.2l.2-.8a1 1 0 00-.3-.9l-.6-.6a1 1 0 010-1.4l.6-.6a1 1 0 00.3-.9l-.2-.8a1 1 0 01.7-1.2l.8-.2a1 1 0 00.6-.6l.2-.8z',
  Approvals: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  Helpline: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-6l-4 4v-4z',
  AI: 'M13 10V3L4 14h7v7l9-11h-7z',
  Search: 'M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z',
  Admins: 'M12 4.5a4 4 0 100 8 4 4 0 000-8zM3 20a9 9 0 0118 0',
  Activity: 'M3 12h4l3 8 4-16 3 8h4',
  Flag: 'M3 21V4m0 0h13l-2 4 2 4H3',
  StatusRequest: 'M4 4v5h.582M20 20v-5h-.581M5.5 9a7 7 0 0113 0M18.5 15a7 7 0 01-13 0',
};

const Icon = ({ path }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);

const Sidebar = ({ open = true, mobileOpen = false, onClose = () => {} }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const role = user?.role;
  const base = role === 'super_admin' ? '/super-admin' : role === 'admin' ? '/admin' : role === 'officer' ? '/officer' : '/citizen';
  const theme = roleTheme[role] || roleTheme.citizen;

  const complaintsLabel = role === 'citizen' ? t('side.mycomplaints') : t('side.complaints');

  let links = [{ label: t('side.dashboard'), to: base, icon: iconMap.Dashboard }];

  if (role === 'citizen') {
    links = links.concat([
      { label: complaintsLabel, to: `${base}/complaints`, icon: iconMap.Complaints },
      { label: 'AI Complaint Assistant', to: '/citizen/ai-assistant', icon: iconMap.AI },
      { label: 'Helpline', to: '/citizen/helpline', icon: iconMap.Helpline },
      { label: t('side.departments'), to: '/departments', icon: iconMap.Departments },
    ]);
  } else if (role === 'officer') {
    links = links.concat([
      { label: complaintsLabel, to: `${base}/complaints`, icon: iconMap.Complaints },
      { label: 'Status Change Requests', to: '/officer/status-requests', icon: iconMap.StatusRequest },
      { label: 'My False-Complaint Reports', to: '/officer/false-reports', icon: iconMap.Flag },
      // Only the department's Complaint Head gets the helpline inbox.
      ...(user?.isComplaintHead ? [{ label: 'Department Helpline', to: '/officer/helpline', icon: iconMap.Helpline }] : []),
      { label: t('side.departments'), to: '/departments', icon: iconMap.Departments },
    ]);
  } else if (role === 'admin') {
    links = links.concat([
      { label: complaintsLabel, to: `${base}/complaints`, icon: iconMap.Complaints },
      { label: t('side.citizens'), to: '/admin/citizens', icon: iconMap.Citizens },
      { label: t('side.officers'), to: '/admin/officers', icon: iconMap.Citizens },
      { label: 'Status Change Requests', to: '/admin/status-requests', icon: iconMap.StatusRequest },
      { label: 'False Complaints', to: '/admin/false-complaints', icon: iconMap.Flag },
      { label: 'Department Info', to: '/admin/departments', icon: iconMap.Departments },
      { label: 'My Approval Requests', to: '/admin/approvals', icon: iconMap.Approvals },
      { label: 'Helpline', to: '/admin/helpline', icon: iconMap.Helpline },
      { label: t('side.reports'), to: '/admin/reports', icon: iconMap.Reports },
    ]);
  } else if (role === 'super_admin') {
    links = links.concat([
      { label: 'Approval Center', to: '/super-admin/approvals', icon: iconMap.Approvals },
      { label: 'Citizens', to: '/super-admin/citizens', icon: iconMap.Citizens },
      { label: 'Officers', to: '/super-admin/officers', icon: iconMap.Citizens },
      { label: 'Admins', to: '/super-admin/admins', icon: iconMap.Admins },
      { label: 'Departments', to: '/super-admin/departments', icon: iconMap.Departments },
      { label: 'Helpline', to: '/super-admin/helpline', icon: iconMap.Helpline },
      { label: 'False Complaints', to: '/super-admin/false-complaints', icon: iconMap.Flag },
      { label: 'Complaints', to: '/super-admin/complaints', icon: iconMap.Complaints },
      { label: 'Activity Log', to: '/super-admin/activity', icon: iconMap.Activity },
      { label: 'Settings', to: '/super-admin/settings', icon: iconMap.Settings },
    ]);
  }

  links.push({ label: t('side.notifications'), to: '/notifications', icon: iconMap.Notifications });
  links.push({ label: t('side.profile'), to: '/profile', icon: iconMap.Settings });

  const roleLabel = theme.label;
  const idLabel = user?.employeeId || user?.adminId || user?.citizenId || '';

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3 pb-6">
      {links.map((l) => (
        <NavLink
          key={l.label}
          to={l.to}
          end
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              isActive ? theme.sidebarActive : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`
          }
        >
          <Icon path={l.icon} />
          <span className="truncate">{l.label}</span>
        </NavLink>
      ))}
    </nav>
  );

  const profileCard = user && (
    <div className="mx-3 mb-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3">
      <p className="truncate text-sm font-semibold text-navy-900 dark:text-white">{user.name}</p>
      <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${theme.badge}`}>{roleLabel}</span>
      {idLabel && <p className="mt-1 font-mono text-[11px] text-slate-400">{idLabel}</p>}
    </div>
  );

  return (
    <>
      {/* Desktop: fixed in place (sticky under the navbar) — it no longer
          scrolls away with the page. Width animates to 0 when hidden. */}
      <aside
        className={`hidden md:flex shrink-0 flex-col self-start sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto overflow-x-hidden border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 pt-4 transition-all duration-300 ${
          open ? 'w-64 opacity-100' : 'w-0 opacity-0 border-r-0 pointer-events-none'
        }`}
        aria-hidden={!open}
      >
        <div className="w-64">
          {profileCard}
          {nav}
        </div>
      </aside>

      {/* Mobile: slide-over drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <aside className="relative z-10 flex w-72 max-w-[85%] flex-col overflow-y-auto bg-white dark:bg-slate-950 pt-4 shadow-2xl">
            <button onClick={onClose} className="absolute right-3 top-3 rounded-md p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white" aria-label="Close menu">✕</button>
            <div className="mt-6">{profileCard}</div>
            {nav}
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
