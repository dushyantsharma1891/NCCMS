import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import PasswordInput, { PasswordPair } from '../components/PasswordInput';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user, setUser } = useAuth();
  const location = useLocation();
  const forcePasswordChange = !!location.state?.forcePasswordChange || !!user.mustChangePassword;

  const [form, setForm] = useState({
    name: user.name || '', phone: user.phone || '', address: user.address || '',
    state: user.state || '', district: user.district || '', pincode: user.pincode || '',
  });
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const { data } = await api.put('/auth/me', form);
      setUser({ ...user, ...data });
      setMsg('Profile updated successfully.');
    } catch (err) {
      setMsg(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwSaving(true);
    setPwMsg('');
    try {
      await api.put('/auth/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setUser({ ...user, mustChangePassword: false });
      setPwMsg('Password changed successfully.');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwMsg(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <DashboardLayout title="Profile" subtitle="Manage your account details.">
      {forcePasswordChange && (
        <p className="mb-6 max-w-xl rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          For security, please change your password before continuing.
        </p>
      )}

      <form onSubmit={changePassword} className="card max-w-xl mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <h2 className="sm:col-span-2 font-display font-bold text-navy-900 dark:text-white">Change Password</h2>
        {pwMsg && <p className="sm:col-span-2 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm text-slate-600 dark:text-slate-300">{pwMsg}</p>}
        <div>
          <label className="label">Current Password</label>
          <PasswordInput required value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} className="input mt-1" autoComplete="current-password" />
        </div>
        <div className="hidden sm:block" />
        <PasswordPair
          label="New Password" confirmLabel="Re-enter New Password"
          password={pwForm.newPassword} confirm={pwForm.confirmPassword}
          onPassword={(v) => setPwForm((p) => ({ ...p, newPassword: v }))}
          onConfirm={(v) => setPwForm((p) => ({ ...p, confirmPassword: v }))}
        />
        <button type="submit" disabled={pwSaving} className="sm:col-span-2 rounded-lg bg-navy-900 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 transition disabled:opacity-60">
          {pwSaving ? 'Updating...' : 'Change Password'}
        </button>
      </form>

      <form onSubmit={submit} className="card max-w-xl grid grid-cols-1 gap-4 sm:grid-cols-2">
        {msg && <p className="sm:col-span-2 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm text-slate-600 dark:text-slate-300">{msg}</p>}
        <p className="sm:col-span-2 text-sm text-slate-500 dark:text-slate-400">Email: <span className="font-medium text-slate-700 dark:text-slate-200">{user.email}</span> · Role: <span className="font-medium text-slate-700 dark:text-slate-200 capitalize">{user.role}</span></p>

        {['name', 'phone', 'state', 'district', 'pincode'].map((k) => (
          <div key={k}>
            <label className="label capitalize">{k}</label>
            <input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              className="input mt-1" />
          </div>
        ))}
        <div className="sm:col-span-2">
          <label className="label">Address</label>
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="input mt-1" />
        </div>
        <button type="submit" disabled={saving}
          className="sm:col-span-2 mt-2 rounded-lg bg-navy-900 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 transition disabled:opacity-60">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </DashboardLayout>
  );
};

export default Profile;
