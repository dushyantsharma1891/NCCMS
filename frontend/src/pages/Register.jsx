import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import StateDistrictSelect from '../components/StateDistrictSelect';
import { PasswordPair } from '../components/PasswordInput';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const initialForm = {
  firstName: '', middleName: '', lastName: '', email: '', phone: '', aadhar: '', password: '', confirmPassword: '',
  address: '', state: '', district: '', pincode: '',
};

const Register = () => {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { confirmPassword, ...payload } = form;
      await register(payload);
      navigate('/citizen');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <Navbar />
      <div className="mx-auto flex max-w-xl flex-col px-6 py-16">
        <h1 className="font-display text-2xl font-bold text-navy-900 dark:text-white">{t('register.title')}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('register.subtitle')}</p>

        <form onSubmit={submit} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {error && <p className="sm:col-span-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">{error}</p>}

          <div>
            <label className="label">First Name *</label>
            <input required value={form.firstName} onChange={update('firstName')} className="input mt-1" />
          </div>
          <div>
            <label className="label">Middle Name</label>
            <input value={form.middleName} onChange={update('middleName')} className="input mt-1" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Last Name / Surname *</label>
            <input required value={form.lastName} onChange={update('lastName')} className="input mt-1" />
          </div>

          <div>
            <label className="label">Email *</label>
            <input type="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} required value={form.email} onChange={update('email')} className="input mt-1" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input type="tel" value={form.phone} onChange={update('phone')} className="input mt-1" />
          </div>

          <div className="sm:col-span-2">
            <label className="label">Aadhar Number <span className="font-normal text-slate-400">(optional — not required to register)</span></label>
            <input
              value={form.aadhar} onChange={update('aadhar')} maxLength={14}
              placeholder="1234 5678 9012" className="input mt-1"
            />
            <p className="mt-1 text-[11px] text-slate-400">If provided, must be a valid 12-digit Aadhar number. Feel free to leave this blank.</p>
          </div>

          <PasswordPair
            password={form.password} confirm={form.confirmPassword}
            onPassword={(v) => setForm((f) => ({ ...f, password: v }))}
            onConfirm={(v) => setForm((f) => ({ ...f, confirmPassword: v }))}
            hint="At least 6 characters."
          />

          <StateDistrictSelect
            state={form.state}
            district={form.district}
            onChange={({ state, district }) => setForm({ ...form, state, district })}
          />

          <div>
            <label className="label">Pincode</label>
            <input value={form.pincode} onChange={update('pincode')} className="input mt-1" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Address</label>
            <input value={form.address} onChange={update('address')} className="input mt-1" />
          </div>

          <button
            type="submit" disabled={loading}
            className="sm:col-span-2 mt-2 rounded-lg bg-navy-900 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 transition disabled:opacity-60"
          >
            {loading ? 'Creating account...' : t('register.submit')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          {t('register.have')}{' '}
          <Link to="/login" className="font-semibold text-accent-500 hover:underline">{t('login.submit')}</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
