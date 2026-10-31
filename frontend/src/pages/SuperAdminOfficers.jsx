import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import StateDistrictSelect from '../components/StateDistrictSelect';
import ScopePicker, { scopeLabel } from '../components/ScopePicker';
import PasswordInput, { PasswordPair, GeneratedCredentials } from '../components/PasswordInput';
import api from '../api/axios';

const emptyForm = { name: '', email: '', password: '', confirmPassword: '', department: '', state: '', district: '', scopeState: '', scopeDistrict: '' };

const SuperAdminOfficers = () => {
  const [officers, setOfficers] = useState([]);
  const [departments, setDepartments] = useState([]);
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
        role: 'officer', search: search || undefined,
        createdFrom: dateFrom || undefined, createdTo: dateTo || undefined,
        status: statusFilter || undefined,
      },
    }).then((res) => setOfficers(res.data)).finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    api.get('/departments').then((res) => setDepartments(res.data));
  }, []); // eslint-disable-line

  const runSearch = (e) => { e.preventDefault(); load(); };

  const createOfficer = async (e) => {
    e.preventDefault();
    setCreateMsg('');
    try {
      const { confirmPassword, ...payload } = form;
      const { data } = await api.post('/super-admin/officers', payload);
      setCreated({ id: data.employeeId, name: data.name, email: data.email, tempPassword: data.tempPassword, generated: data.generated });
      setCreateMsg('');
      setForm(emptyForm);
      load();
    } catch (err) {
      setCreateMsg(err.response?.data?.message || 'Failed to create officer');
    }
  };

  const openOfficer = async (o) => {
    setSelected(o);
    setEditForm({
      name: o.name, phone: o.phone || '', state: o.state || '', district: o.district || '',
      scopeState: o.scopeState || '', scopeDistrict: o.scopeDistrict || '',
    });
    const { data } = await api.get(`/super-admin/users/${o._id}/activity`);
    setActivity(data);
    setTempPassword(null);
    setMsg('');
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    await api.put(`/super-admin/users/${selected._id}`, editForm);
    setMsg('Profile & scope updated.');
    load();
  };

  const toggleActive = async () => {
    await api.put(`/super-admin/users/${selected._id}/toggle`);
    setMsg('Account status changed.');
    load();
  };

  const setHead = async (remove = false) => {
    if (!window.confirm(remove ? `Remove the Complaint Head rank from ${selected.name}?` : `Make ${selected.name} the Complaint Head of ${selected.department?.name}? Any current head is replaced.`)) return;
    try {
      const { data } = await api.put(`/departments/${selected.department?._id}/complaint-head`, { officerId: remove ? null : selected._id });
      setMsg(data.message);
      setSelected({ ...selected, isComplaintHead: !remove });
      load();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Could not update the Complaint Head');
    }
  };

  const resetPassword = async () => {
    const { data } = await api.put(`/super-admin/users/${selected._id}/reset-password`);
    setTempPassword(data.tempPassword);
  };

  const remove = async () => {
    if (!window.confirm(`Permanently delete officer ${selected.name} (${selected.employeeId})? This cannot be undone.`)) return;
    await api.delete(`/super-admin/officers/${selected._id}`);
    setSelected(null);
    load();
  };

  return (
    <DashboardLayout title="Government Officers" subtitle="Create, search, update, scope, or delete any officer account.">
      <div className="mb-6 flex justify-end">
        <button onClick={() => setShowCreate((s) => !s)} className="rounded-lg bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-600 transition">
          {showCreate ? 'Close' : '+ Create Officer'}
        </button>
      </div>

      <GeneratedCredentials result={created} onDismiss={() => setCreated(null)} />

      {showCreate && (
        <form onSubmit={createOfficer} className="card mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {createMsg && <p className="sm:col-span-2 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{createMsg}</p>}
          <p className="sm:col-span-2 text-xs text-slate-500 dark:text-slate-400">Created directly by Super Admin — active immediately, no approval needed. Employee ID auto-generates from the department.</p>
          <p className="sm:col-span-2 text-xs text-slate-500 dark:text-slate-400">Only the department is needed. Name, e-mail, password and visibility scope are optional — blanks are generated or left unrestricted.</p>
          <input placeholder="Name (optional)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
          <input type="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="Email (optional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
          <PasswordPair
            required={false} inputClass="input" password={form.password} confirm={form.confirmPassword}
            onPassword={(v) => setForm((p) => ({ ...p, password: v }))}
            onConfirm={(v) => setForm((p) => ({ ...p, confirmPassword: v }))}
          />
          <select required value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="input">
            <option value="">Select department</option>
            {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
          <StateDistrictSelect state={form.state} district={form.district} onChange={({ state, district }) => setForm({ ...form, state, district })} />
          <ScopePicker scopeState={form.scopeState} scopeDistrict={form.scopeDistrict} onChange={(v) => setForm({ ...form, ...v })} />
          <button type="submit" className="sm:col-span-2 rounded-lg bg-gradient-to-r from-rose-700 to-navy-900 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition">
            Create Officer
          </button>
        </form>
      )}

      <form onSubmit={runSearch} className="card mb-6 flex flex-wrap items-end gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, Employee ID, state, district" className="input flex-1 min-w-[220px]" />
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
            <option value="pending">Pending Approval</option>
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
                    <th className="py-3 pr-4">Employee ID</th>
                    <th className="py-3 pr-4">Name</th>
                    <th className="py-3 pr-4">Department</th>
                    <th className="py-3 pr-4">Scope</th>
                    <th className="py-3 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {officers.map((o) => (
                    <tr key={o._id} onClick={() => openOfficer(o)}
                      className="cursor-pointer border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-900">
                      <td className="py-3 pr-4 font-mono text-xs font-semibold dark:text-slate-200">{o.employeeId || '-'}</td>
                      <td className="py-3 pr-4 font-medium dark:text-slate-200">
                        {o.name}
                        {o.isComplaintHead && <span className="ml-2 rounded-full bg-amber-100 dark:bg-amber-950 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300">★ Head</span>}
                      </td>
                      <td className="py-3 pr-4 dark:text-slate-300">{o.department?.name || '-'}</td>
                      <td className="py-3 pr-4 text-xs text-slate-400">{scopeLabel(o.scopeState, o.scopeDistrict)}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          o.approvalStatus === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : o.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                          {o.approvalStatus === 'pending' ? 'Pending Approval' : o.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {officers.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-400">No officers found.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card h-fit">
          {!selected ? (
            <p className="py-10 text-center text-sm text-slate-400">Select an officer to view/edit their profile and scope.</p>
          ) : (
            <div>
              <h2 className="font-display font-bold text-navy-900 dark:text-white">{selected.name}</h2>
              <p className="text-xs text-slate-400 font-mono">{selected.employeeId} · {selected.department?.name}</p>
              {msg && <p className="mt-2 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{msg}</p>}
              {tempPassword && (
                <p className="mt-2 rounded-lg bg-amber-50 dark:bg-amber-950 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                  Temporary password: <span className="font-mono">{tempPassword}</span> — share securely, shown once.
                </p>
              )}

              <form onSubmit={saveEdit} className="mt-4 flex flex-col gap-2">
                <input placeholder="Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="input" />
                <input placeholder="Phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="input" />
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="State" value={editForm.state} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })} className="input" />
                  <input placeholder="District" value={editForm.district} onChange={(e) => setEditForm({ ...editForm, district: e.target.value })} className="input" />
                </div>
                <ScopePicker compact scopeState={editForm.scopeState} scopeDistrict={editForm.scopeDistrict} onChange={(v) => setEditForm({ ...editForm, ...v })} />
                <button type="submit" className="rounded-lg bg-navy-900 py-2 text-sm font-semibold text-white hover:bg-navy-800 transition">Save Changes</button>
              </form>

              <div className="mt-4 flex flex-wrap gap-2">
                {selected.approvalStatus === 'approved' && (
                  <button onClick={() => setHead(!!selected.isComplaintHead)} className="rounded-lg border border-purple-400 px-3 py-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950 transition">
                    {selected.isComplaintHead ? '★ Remove Complaint Head rank' : '★ Make Complaint Head'}
                  </button>
                )}
                <button onClick={toggleActive} className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
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

export default SuperAdminOfficers;
