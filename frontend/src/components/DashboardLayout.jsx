import React, { useEffect, useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import ChatAssistant from './ChatAssistant';
import { useAuth } from '../context/AuthContext';

const STORAGE_KEY = 'nccms_sidebar_open';

const DashboardLayout = ({ children, title, subtitle, actions }) => {
  const { user } = useAuth();
  // Desktop show/hide choice is remembered between pages and visits.
  const [open, setOpen] = useState(() => localStorage.getItem(STORAGE_KEY) !== 'false');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, String(open)); }, [open]);

  const toggle = () => {
    if (window.matchMedia('(min-width: 768px)').matches) setOpen((o) => !o);
    else setMobileOpen((m) => !m);
  };

  // Ctrl/Cmd + B toggles the menu, like most code editors and dashboards.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); toggle(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <Navbar />
      <div className="flex">
        <Sidebar open={open} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex items-start gap-3">
              <button
                onClick={toggle}
                title="Show / hide menu (Ctrl or ⌘ + B)"
                aria-label="Toggle menu"
                className="mt-0.5 shrink-0 rounded-lg border border-slate-300 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="min-w-0 flex-1">
                {title && <h1 className="font-display text-2xl font-bold text-navy-900 dark:text-white">{title}</h1>}
                {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
              </div>
              {actions && <div className="shrink-0">{actions}</div>}
            </div>
            {children}
          </div>
        </main>
      </div>
      {user?.role === 'citizen' && <ChatAssistant />}
    </div>
  );
};

export default DashboardLayout;
