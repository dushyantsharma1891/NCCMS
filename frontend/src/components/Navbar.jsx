import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import roleTheme from '../theme/roleTheme';
import Logo from '../assets/Logo';
import api from '../api/axios';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { dark, toggleDark } = useTheme();
  const { lang, toggleLang, t } = useLanguage();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  // Unread-notification badge, refreshed every minute while logged in.
  useEffect(() => {
    if (!user) { setUnread(0); return undefined; }
    let cancelled = false;
    const load = () => api.get('/notifications').then((r) => { if (!cancelled) setUnread(r.data.filter((n) => !n.read).length); }).catch(() => {});
    load();
    const t = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(t); };
  }, [user]);

  const dashboardPath = user?.role === 'super_admin' ? '/super-admin' : user?.role === 'admin' ? '/admin' : user?.role === 'officer' ? '/officer' : '/citizen';
  const theme = user ? roleTheme[user.role] : null;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/90 backdrop-blur transition-colors">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link to="/" className="flex items-center gap-2">
          <Logo size={38} />
          <div className="hidden sm:block leading-tight">
            <span className="block font-display text-lg font-bold text-navy-900 dark:text-white">NCCMS</span>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Dept. of Public Grievances</span>
          </div>
          {user && theme && (
            <span className={`ml-2 hidden md:inline-block rounded-full px-3 py-1 text-xs font-semibold ${theme.badge}`}>
              {theme.label}
            </span>
          )}
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          <Link to="/" className="hover:text-navy-900 dark:hover:text-white">{t('nav.home')}</Link>
          <Link to="/departments" className="hover:text-navy-900 dark:hover:text-white">{t('nav.departments')}</Link>
          <Link to="/track" className="hover:text-navy-900 dark:hover:text-white">{t('nav.track')}</Link>
          <Link to="/about" className="hover:text-navy-900 dark:hover:text-white">About</Link>
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleLang}
            title="Switch language"
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {lang === 'en' ? 'हिं' : lang === 'hi' ? 'Hinglish' : 'EN'}
          </button>
          <button
            onClick={toggleDark}
            title="Toggle dark mode"
            className="rounded-lg border border-slate-300 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {dark ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.36 6.36l-.7-.7M6.34 6.34l-.7-.7m12.72 0l-.7.7M6.34 17.66l-.7.7M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 1020.354 15.354z" />
              </svg>
            )}
          </button>

          {user ? (
            <>
              <Link to="/notifications" title="Notifications" className="relative rounded-lg border border-slate-300 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-4-5.7V5a2 2 0 10-4 0v.3A6 6 0 006 11v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unread > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>
                )}
              </Link>
              <Link
                to={dashboardPath}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${theme?.accentBg || 'bg-navy-900 hover:bg-navy-800'}`}
              >
                {t('nav.dashboard')}
              </Link>
              <button
                onClick={() => { logout(); navigate('/'); }}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                {t('nav.login')}
              </Link>
              <Link to="/register" className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-600 transition">
                {t('nav.register')}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
