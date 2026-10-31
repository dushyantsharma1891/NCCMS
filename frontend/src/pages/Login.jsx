import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import PasswordInput from '../components/PasswordInput';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const loginTypes = [
  { key: 'citizen', label: 'Citizen' },
  { key: 'officer', label: 'Government Officer' },
  { key: 'admin', label: 'Admin' },
];

// `superAdminMode` renders the discreet, separate "Authorized Administration"
// login screen (see the link at the bottom of the normal login page). It uses
// the exact same authentication endpoint and password check as every other
// role — there is no bypass, no hidden credential, nothing hardcoded.
const Login = ({ superAdminMode = false }) => {
  const [loginType, setLoginType] = useState('citizen');
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(form.email, form.password, superAdminMode ? 'super_admin' : loginType);
      if (data.mustChangePassword) {
        navigate('/profile', { state: { forcePasswordChange: true } });
        return;
      }
      const redirectTo = location.state?.redirectTo;
      if (redirectTo && data.role === 'citizen') {
        navigate(redirectTo);
        return;
      }
      const dest = data.role === 'super_admin' ? '/super-admin' : data.role === 'admin' ? '/admin' : data.role === 'officer' ? '/officer' : '/citizen';
      navigate(dest);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  if (superAdminMode) {
    return (
      <div className="min-h-screen bg-navy-950 dark:bg-slate-950 transition-colors">
        <Navbar />
        <div className="mx-auto flex max-w-md flex-col px-6 py-16">
          <div className="rounded-2xl border border-rose-900/40 bg-white dark:bg-slate-900 p-6 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">Authorized Administration</p>
            <h1 className="mt-1 font-display text-xl font-bold text-navy-900 dark:text-white">Super Admin Sign-In</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              This is a protected sign-in for system-level administration. Access is authenticated and logged like any other account — there is no special bypass.
            </p>

            <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
              {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">{error}</p>}
              <div>
                <label className="label">Email</label>
                <input type="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input mt-1" />
              </div>
              <div>
                <label className="label">Password</label>
                <PasswordInput required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input mt-1" autoComplete="current-password" />
              </div>
              <button type="submit" disabled={loading}
                className="mt-2 rounded-lg bg-gradient-to-r from-rose-700 to-navy-900 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-60">
                {loading ? 'Verifying...' : 'Sign In as Super Admin'}
              </button>
            </form>
            <Link to="/login" className="mt-5 block text-center text-xs text-slate-400 hover:underline">← Back to regular login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <Navbar />
      <div className="mx-auto flex max-w-md flex-col px-6 py-16">
        <h1 className="font-display text-2xl font-bold text-navy-900 dark:text-white">{t('login.title')}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('login.subtitle')}</p>

        <div className="mt-6 flex rounded-lg bg-slate-100 dark:bg-slate-900 p-1">
          {loginTypes.map((tp) => (
            <button
              key={tp.key}
              onClick={() => setLoginType(tp.key)}
              className={`flex-1 rounded-md py-2 text-xs font-semibold transition ${
                loginType === tp.key ? 'bg-white dark:bg-slate-700 shadow text-navy-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {tp.label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">{error}</p>}
          <div>
            <label className="label">{t('login.email')}</label>
            <input
              type="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input mt-1"
            />
          </div>
          <div>
            <label className="label">{t('login.password')}</label>
            <PasswordInput
              required value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input mt-1" autoComplete="current-password"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="mt-2 rounded-lg bg-navy-900 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 transition disabled:opacity-60"
          >
            {loading ? 'Logging in...' : t('login.submit')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          {t('login.new')}{' '}
          <Link to="/register" className="font-semibold text-accent-500 hover:underline">{t('login.create')}</Link>
        </p>
        <p className="mt-3 rounded-lg bg-slate-100 dark:bg-slate-900 px-3 py-2 text-center text-xs text-slate-500 dark:text-slate-400">
          Demo admin: admin@nccms.gov.in / Admin@123 · Demo officer: officer.police@nccms.gov.in / Officer@123
        </p>

        <Link to="/authorized-administration" className="mt-8 text-center text-[11px] text-slate-300 dark:text-slate-700 hover:text-slate-400 transition">
          Authorized Administration
        </Link>
      </div>
    </div>
  );
};

export default Login;
