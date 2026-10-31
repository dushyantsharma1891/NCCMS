import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import StateDistrictSelect from '../components/StateDistrictSelect';
import PasswordInput, { PasswordPair, GeneratedCredentials } from '../components/PasswordInput';
import api from '../api/axios';

const initialForm = { name: '', email: '', password: '', confirmPassword: '', department: '', state: '', district: '' };

const SuperAdminAdmins = () => {
  const [admins, setAdmins] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(initialForm);
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
        role: 'admin', search: search || undefined,
        createdFrom: dateFrom || undefined, createdTo: dateTo || undefined,
        status: statusFilter || undefined,
      },
    }).then((res) => setAdmins(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.get('/departments').then((res) => setDepartments(res.data));
  }, []); // eslint-disable-line

  const runSearch = (e) => { e.preventDefault(); load(); };

  const createAdmin = async (e) => {
    e.preventDefault();
    setCreateMsg('');
    try {
      const { confirmPassword, ...payload } = form;
      const { data } = await api.post('/super-admin/admins', payload);
      setCreated({ id: data.adminId, name: data.name, email: data.email, tempPassword: data.tempPassword, generated: data.generated });
      setCreateMsg('');
      setForm(initialForm);
      load();
    } catch (err) {
      setCreateMsg(err.response?.data?.message || 'Failed to create admin');
    }
  };

  const openAdmin = async (a) => {
    setSelected(a);
    setEditForm({ name: a.name, phone: a.phone || '', department: a.department?._id || '', state: a.state || '', district: a.district || '' });
    const { data } = await api.get(`/super-admin/users/${a._id}/activity`);
    setActivity(data);
    setTempPassword(null);
    setMsg('');
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    await api.put(`/super-admin/admins/${selected._id}`, editForm);
    setMsg('Profile & scope updated.');
    load();
  };

  const toggle = async () => { await api.put(`/super-admin/users/${selected._id}/toggle`); setMsg('Account status changed.'); load(); };
  const resetPassword = async () => {
    const { data } = await api.put(`/super-admin/users/${selected._id}/reset-password`);
    setTempPassword(data.tempPassword);
  };
  const remove = async () => {
    if (!window.confirm(`Permanently delete admin ${selected.name} (${selected.adminId})? This cannot be undone.`)) return;
    await api.delete(`/super-admin/admins/${selected._id}`);
    setSelected(null);
    load();
  };

  return (
    <DashboardLayout title="Admin Management" subtitle="Only the Super Admin can create Admin accounts. Admin IDs are auto-generated and cannot be chosen manually. Scope an Admin to one department, or leave system-wide.">
      <div className="mb-6 flex justify-end">
        <button onClick={() => setShowCreate((s) => !s)} className="rounded-lg bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-600 transition">
          {showCreate ? 'Close' : '+ Create Admin'}
        </button>
      </div>

      <GeneratedCredentials result={created} onDismiss={() => setCreated(null)} />

      {showCreate && (
        <form onSubmit={createAdmin} className="card mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {createMsg && <p className="sm:col-span-2 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm text-slate-600 dark:text-slate-300">{createMsg}</p>}
          <div>
            <label className="label">Name <span className="font-normal text-slate-400">(optional)</span></label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input mt-1" />
          </div>
          <div>
            <label className="label">Email <span className="font-normal text-slate-400">(optional)</span></label>
            <input type="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input mt-1" />
          </div>
          <PasswordPair
            required={false} password={form.password} confirm={form.confirmPassword}
            onPassword={(v) => setForm((p) => ({ ...p, password: v }))}
            onConfirm={(v) => setForm((p) => ({ ...p, confirmPassword: v }))}
            hint="Optional — leave blank and a secure temporary password is generated for you."
          />
          <div>
            <label className="label">Scope Department (optional)</label>
            <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="input mt-1">
              <option value="">System-wide</option>
              {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>
          <StateDistrictSelect state={form.state} district={form.district} onChange={({ state, district }) => setForm({ ...form, state, district })} />
          <button type="submit" className="sm:col-span-2 mt-2 rounded-lg bg-gradient-to-r from-rose-700 to-navy-900 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition">
            Create Admin
          </button>
        </form>
      )}

      <form onSubmit={runSearch} className="card mb-6 flex flex-wrap items-end gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, Admin ID, state, district" className="input flex-1 min-w-[220px]" />
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
                    <th className="py-3 pr-4">Admin ID</th>
                    <th className="py-3 pr-4">Name</th>
                    <th className="py-3 pr-4">Scope</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Last Login</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((a) => (
                    <tr key={a._id} onClick={() => openAdmin(a)}
                      className="cursor-pointer border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-900">
                      <td className="py-3 pr-4 font-mono text-xs font-semibold dark:text-slate-200">{a.adminId}</td>
                      <td className="py-3 pr-4 font-medium dark:text-slate-200">{a.name}</td>
                      <td className="py-3 pr-4 dark:text-slate-300">{a.department?.name || 'System-wide'}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${a.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                          {a.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-xs text-slate-400">{a.lastLogin ? new Date(a.lastLogin).toLocaleString() : 'Never'}</td>
                    </tr>
                  ))}
                  {admins.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-400">No admins found.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card h-fit">
          {!selected ? (
            <p className="py-10 text-center text-sm text-slate-400">Select an admin to view/edit their profile and scope.</p>
          ) : (
            <div>
              <h2 className="font-display font-bold text-navy-900 dark:text-white">{selected.name}</h2>
              <p className="text-xs text-slate-400 font-mono">{selected.adminId} · {selected.email}</p>
              {msg && <p className="mt-2 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{msg}</p>}
              {tempPassword && (
                <p className="mt-2 rounded-lg bg-amber-50 dark:bg-amber-950 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                  Temporary password: <span className="font-mono">{tempPassword}</span> — share securely, shown once.
                </p>
              )}

              <form onSubmit={saveEdit} className="mt-4 flex flex-col gap-2">
                <input placeholder="Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="input" />
                <input placeholder="Phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="input" />
                <select value={editForm.department} onChange={(e) => setEditForm({ ...editForm, department: e.target.value })} className="input">
                  <option value="">System-wide</option>
                  {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="State" value={editForm.state} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })} className="input" />
                  <input placeholder="District" value={editForm.district} onChange={(e) => setEditForm({ ...editForm, district: e.target.value })} className="input" />
                </div>
                <button type="submit" className="rounded-lg bg-navy-900 py-2 text-sm font-semibold text-white hover:bg-navy-800 transition">Save Changes</button>
              </form>

              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={toggle} className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                  Activate/Deactivate
                </button>
                <button onClick={resetPassword} className="rounded-lg border border-amber-400 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950 transition">
                  Reset Password
                </button>
                <button onClick={remove} className="rounded-lg border border-rose-400 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950 transition">
                  Delete Permanently
                </button>
              </div>

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

export default SuperAdminAdmins;
