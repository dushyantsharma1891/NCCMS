import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import StateDistrictSelect from '../components/StateDistrictSelect';
import PasswordInput, { PasswordPair, GeneratedCredentials } from '../components/PasswordInput';
import api from '../api/axios';

const emptyForm = { name: '', email: '', password: '', confirmPassword: '', phone: '', state: '', district: '', address: '', pincode: '' };

const SuperAdminCitizens = () => {
  const [citizens, setCitizens] = useState([]);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [createMsg, setCreateMsg] = useState('');
  const [created, setCreated] = useState(null);

  const [selected, setSelected] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [activity, setActivity] = useState([]);
  const [tempPassword, setTempPassword] = useState(null);
  const [msg, setMsg] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/super-admin/users', {
      params: {
        role: 'citizen', search: search || undefined,
        createdFrom: dateFrom || undefined, createdTo: dateTo || undefined,
        status: statusFilter || undefined,
      },
    }).then((res) => setCitizens(res.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const runSearch = (e) => { e.preventDefault(); load(); };

  const createCitizen = async (e) => {
    e.preventDefault();
    setCreateMsg('');
    try {
      const { confirmPassword, ...payload } = form;
      const { data } = await api.post('/super-admin/citizens', payload);
      setCreated({ id: data.citizenId, name: data.name, email: data.email, tempPassword: data.tempPassword, generated: data.generated });
      setCreateMsg('');
      setForm(emptyForm);
      load();
    } catch (err) {
      setCreateMsg(err.response?.data?.message || 'Failed to create citizen');
    }
  };

  const openCitizen = async (c) => {
    setSelected(c);
    setEditForm({ name: c.name, phone: c.phone || '', address: c.address || '', state: c.state || '', district: c.district || '', pincode: c.pincode || '' });
    const { data } = await api.get(`/super-admin/users/${c._id}/activity`);
    setActivity(data);
    setTempPassword(null);
    setMsg('');
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    await api.put(`/super-admin/users/${selected._id}`, editForm);
    setMsg('Profile updated.');
    load();
  };

  const toggleActive = async () => {
    await api.put(`/super-admin/users/${selected._id}/toggle`);
    setMsg('Account status changed.');
    load();
  };

  const resetPassword = async () => {
    const { data } = await api.put(`/super-admin/users/${selected._id}/reset-password`);
    setTempPassword(data.tempPassword);
  };

  const forceChange = async () => {
    await api.put(`/super-admin/users/${selected._id}/force-change`);
    setMsg('Citizen will be required to change their password on next login.');
  };

  const remove = async () => {
    if (!window.confirm(`Permanently delete citizen ${selected.name} (${selected.citizenId})? This cannot be undone.`)) return;
    await api.delete(`/super-admin/citizens/${selected._id}`);
    setSelected(null);
    load();
  };

  return (
    <DashboardLayout title="Citizens" subtitle="Create, search, update, or delete any citizen account.">
      <div className="mb-6 flex justify-end">
        <button onClick={() => setShowCreate((s) => !s)} className="rounded-lg bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-600 transition">
          {showCreate ? 'Close' : '+ Create Citizen'}
        </button>
      </div>

      <GeneratedCredentials result={created} onDismiss={() => setCreated(null)} />

      {showCreate && (
        <form onSubmit={createCitizen} className="card mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {createMsg && <p className="sm:col-span-2 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{createMsg}</p>}
          <p className="sm:col-span-2 text-xs text-slate-500 dark:text-slate-400">Everything is optional — blank name, e-mail or password are generated automatically and shown to you once.</p>
          <input placeholder="Name (optional)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
          <input type="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="Email (optional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
          <PasswordPair
            required={false} inputClass="input" password={form.password} confirm={form.confirmPassword}
            onPassword={(v) => setForm((p) => ({ ...p, password: v }))}
            onConfirm={(v) => setForm((p) => ({ ...p, confirmPassword: v }))}
          />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" />
          <StateDistrictSelect state={form.state} district={form.district} onChange={({ state, district }) => setForm({ ...form, state, district })} />
          <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" />
          <input placeholder="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} className="input" />
          <button type="submit" className="sm:col-span-2 rounded-lg bg-gradient-to-r from-rose-700 to-navy-900 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition">
            Create Citizen
          </button>
        </form>
      )}

      <form onSubmit={runSearch} className="card mb-6 flex flex-wrap items-end gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, phone, Citizen ID, state, district" className="input flex-1 min-w-[220px]" />
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Joined From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input mt-1" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Joined To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input mt-1" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input mt-1">
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <button className="rounded-lg bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 transition">Search</button>
      </form>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          {loading ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <th className="py-3 pr-4">Citizen ID</th>
                    <th className="py-3 pr-4">Name</th>
                    <th className="py-3 pr-4">Email</th>
                    <th className="py-3 pr-4">State / District</th>
                    <th className="py-3 pr-4">Joined</th>
                    <th className="py-3 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {citizens.map((c) => (
                    <tr key={c._id} onClick={() => openCitizen(c)}
                      className="cursor-pointer border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-900">
                      <td className="py-3 pr-4 font-mono text-xs font-semibold dark:text-slate-200">{c.citizenId}</td>
                      <td className="py-3 pr-4 font-medium dark:text-slate-200">{c.name}</td>
                      <td className="py-3 pr-4 dark:text-slate-300">{c.email}</td>
                      <td className="py-3 pr-4 dark:text-slate-300">{c.state || '-'} / {c.district || '-'}</td>
                      <td className="py-3 pr-4 text-xs text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${c.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                          {c.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {citizens.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-400">No citizens found.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card h-fit">
          {!selected ? (
            <p className="py-10 text-center text-sm text-slate-400">Select a citizen to view/edit their full profile.</p>
          ) : (
            <div>
              <h2 className="font-display font-bold text-navy-900 dark:text-white">{selected.name}</h2>
              <p className="text-xs text-slate-400 font-mono">{selected.citizenId} · {selected.email}</p>
              {msg && <p className="mt-2 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{msg}</p>}
              {tempPassword && (
                <p className="mt-2 rounded-lg bg-amber-50 dark:bg-amber-950 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                  Temporary password: <span className="font-mono">{tempPassword}</span> — share securely, shown once.
                </p>
              )}

              <form onSubmit={saveEdit} className="mt-4 flex flex-col gap-2">
                <input placeholder="Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="input" />
                <input placeholder="Phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="input" />
                <input placeholder="Address" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="input" />
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="State" value={editForm.state} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })} className="input" />
                  <input placeholder="District" value={editForm.district} onChange={(e) => setEditForm({ ...editForm, district: e.target.value })} className="input" />
                </div>
                <input placeholder="Pincode" value={editForm.pincode} onChange={(e) => setEditForm({ ...editForm, pincode: e.target.value })} className="input" />
                <button type="submit" className="rounded-lg bg-navy-900 py-2 text-sm font-semibold text-white hover:bg-navy-800 transition">Save Changes</button>
              </form>

              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={toggleActive} className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                  Activate/Deactivate
                </button>
                <button onClick={resetPassword} className="rounded-lg border border-amber-400 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950 transition">
                  Reset Password
                </button>
                <button onClick={forceChange} className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                  Force Password Change
                </button>
                <button onClick={remove} className="rounded-lg border border-rose-400 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950 transition">
                  Delete Permanently
                </button>
              </div>
              <p className="mt-3 text-[11px] text-slate-400">Passwords stay hashed — even the Super Admin can never view an existing password, only reset it.</p>

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Recent Activity</p>
                <ul className="mt-2 flex flex-col gap-2 max-h-64 overflow-y-auto">
                  {activity.length === 0 ? <p className="text-xs text-slate-400">No recorded activity.</p> : activity.map((a) => (
                    <li key={a._id} className="rounded-lg bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs dark:text-slate-300">
                      {a.action} {a.targetLabel ? `— ${a.targetLabel}` : ''}
                      <p className="text-[10px] text-slate-400">{new Date(a.createdAt).toLocaleString()}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminCitizens;
