import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import StateDistrictSelect from '../components/StateDistrictSelect';
import ScopePicker, { scopeLabel } from '../components/ScopePicker';
import PasswordInput, { PasswordPair, GeneratedCredentials } from '../components/PasswordInput';
import api from '../api/axios';

const initialForm = { name: '', email: '', password: '', confirmPassword: '', department: '', state: '', district: '', scopeState: '', scopeDistrict: '', reason: '' };

const AdminOfficers = () => {
  const [officers, setOfficers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tempPassword, setTempPassword] = useState(null);
  const [created, setCreated] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteMsg, setDeleteMsg] = useState('');

  const loadOfficers = () => {
    setLoading(true);
    api.get('/admin/officers', { params: { all: 'true' } }).then((res) => setOfficers(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOfficers();
    api.get('/departments').then((res) => setDepartments(res.data));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setSaving(true);
    try {
      const { confirmPassword, ...payload } = form;
      const { data } = await api.post('/approvals/officer', payload);
      setSuccess(`Officer request submitted (auto-generated ID: ${data.officer.employeeId}). It is now pending Super Admin approval before the account is activated.`);
      setCreated({ id: data.officer.employeeId, name: data.officer.name, email: data.officer.email, tempPassword: data.tempPassword, generated: data.generated });
      setForm(initialForm);
      loadOfficers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit officer request');
    } finally {
      setSaving(false);
    }
  };

  // Admins can change an officer's visibility scope at any time.
  const [scopeEdit, setScopeEdit] = useState(null);
  const saveScope = async () => {
    try {
      await api.put(`/admin/officers/${scopeEdit.officer._id}`, { scopeState: scopeEdit.scopeState, scopeDistrict: scopeEdit.scopeDistrict });
      setSuccess(`Scope of ${scopeEdit.officer.name} updated to: ${scopeLabel(scopeEdit.scopeState, scopeEdit.scopeDistrict)}`);
      setScopeEdit(null);
      loadOfficers();
    } catch (err) {
      setScopeEdit({ ...scopeEdit, error: err.response?.data?.message || 'Could not update the scope' });
    }
  };

  const makeHead = async (o, remove = false) => {
    const verb = remove ? `Remove the Complaint Head rank from ${o.name}?` : `Make ${o.name} the Complaint Head of ${o.department?.name}? Any current head will be replaced, and the department helpline will route to this officer.`;
    if (!window.confirm(verb)) return;
    try {
      const { data } = await api.put(`/departments/${o.department?._id}/complaint-head`, { officerId: remove ? null : o._id });
      setSuccess(data.message);
      loadOfficers();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update the Complaint Head');
    }
  };

  const toggle = async (id) => {
    await api.put(`/admin/officers/${id}/toggle`);
    loadOfficers();
  };

  // Admin can reset an officer's password directly — no Super Admin approval
  // needed for this one action (unlike creating or deleting an officer).
  const resetPassword = async (id) => {
    const { data } = await api.put(`/admin/officers/${id}/reset-password`);
    setTempPassword(data.tempPassword);
  };

  const openDeleteRequest = (officer) => {
    setDeleteTarget(officer);
    setDeleteReason('');
    setDeleteMsg('');
  };

  // Admin cannot delete an officer directly — only request it. Super Admin
  // reviews and either approves (which performs the deletion) or rejects.
  const submitDeleteRequest = async (e) => {
    e.preventDefault();
    try {
      await api.post('/approvals/delete-officer', { targetId: deleteTarget._id, reason: deleteReason });
      setDeleteMsg('Deletion request sent to Super Admin for approval.');
      setTimeout(() => setDeleteTarget(null), 1500);
    } catch (err) {
      setDeleteMsg(err.response?.data?.message || 'Failed to submit request');
    }
  };

  const statusLabel = (o) => {
    if (o.approvalStatus === 'pending') return { text: 'Pending Approval', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' };
    if (o.approvalStatus === 'rejected') return { text: 'Rejected', cls: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' };
    return o.isActive
      ? { text: 'Active', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' }
      : { text: 'Disabled', cls: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' };
  };

  return (
    <DashboardLayout title="Government Officers" subtitle="Officer accounts you create stay pending until a Super Admin approves them. Officers can only act on complaints you assign to them.">
      <div className="mb-6 flex justify-end">
        <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-600 transition">
          {showForm ? 'Close' : '+ Request New Officer'}
        </button>
      </div>

      {tempPassword && (
        <div className="card mb-6 border-amber-300 dark:border-amber-800">
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Temporary password (shown once): <span className="font-mono">{tempPassword}</span></p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Share this securely with the officer. They will be required to change it on next login.</p>
          <button onClick={() => setTempPassword(null)} className="mt-2 text-xs font-semibold text-slate-400 hover:underline">Dismiss</button>
        </div>
      )}

      {deleteTarget && (
        <form onSubmit={submitDeleteRequest} className="card mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <p className="sm:col-span-3 text-sm font-semibold text-navy-900 dark:text-white">
            Request deletion of {deleteTarget.name} ({deleteTarget.employeeId})
          </p>
          {deleteMsg && <p className="sm:col-span-3 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{deleteMsg}</p>}
          <input required placeholder="Reason for deletion" value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} className="input sm:col-span-2" />
          <div className="flex gap-3">
            <button type="submit" className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition">Submit Request</button>
            <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Cancel</button>
          </div>
        </form>
      )}

      <GeneratedCredentials result={created} onDismiss={() => setCreated(null)} />

      {showForm && (
        <form onSubmit={submit} className="card mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {error && <p className="sm:col-span-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">{error}</p>}
          {success && <p className="sm:col-span-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{success}</p>}
          <p className="sm:col-span-2 text-xs text-slate-500 dark:text-slate-400">
            Employee ID is generated automatically from the department (e.g. POL-0001). The account is created immediately but stays inactive until Super Admin approval.
          </p>

          <div>
            <label className="label">Officer Name <span className="font-normal text-slate-400">(optional)</span></label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input mt-1" />
          </div>
          <div>
            <label className="label">Office Email <span className="font-normal text-slate-400">(optional)</span></label>
            <input type="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input mt-1" />
          </div>
          <PasswordPair
            required={false} password={form.password} confirm={form.confirmPassword}
            onPassword={(v) => setForm((p) => ({ ...p, password: v }))}
            onConfirm={(v) => setForm((p) => ({ ...p, confirmPassword: v }))}
            hint="Optional — leave blank to auto-generate a temporary password."
          />
          <div>
            <label className="label">Department *</label>
            <select required value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="input mt-1">
              <option value="">Select department</option>
              {departments.map((d) => <option key={d._id} value={d._id}>{d.name} ({d.type})</option>)}
            </select>
          </div>
          <StateDistrictSelect
            state={form.state}
            district={form.district}
            onChange={({ state, district }) => setForm({ ...form, state, district })}
          />
          <ScopePicker scopeState={form.scopeState} scopeDistrict={form.scopeDistrict} onChange={(v) => setForm({ ...form, ...v })} />
          <div className="sm:col-span-2">
            <label className="label">Reason / Justification</label>
            <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Department is understaffed for the current complaint volume" className="input mt-1" />
          </div>
          <button type="submit" disabled={saving}
            className="sm:col-span-2 mt-2 rounded-lg bg-navy-900 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 transition disabled:opacity-60">
            {saving ? 'Submitting...' : 'Submit for Super Admin Approval'}
          </button>
        </form>
      )}

      <div className="card">
        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>
        ) : officers.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">No officers registered yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className="py-3 pr-4">Name</th>
                  <th className="py-3 pr-4">Department</th>
                  <th className="py-3 pr-4">Employee ID</th>
                  <th className="py-3 pr-4">Email</th>
                  <th className="py-3 pr-4">Visibility scope</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {officers.map((o) => {
                  const s = statusLabel(o);
                  return (
                    <tr key={o._id} className="border-b border-slate-100 dark:border-slate-800/60">
                      <td className="py-3 pr-4 font-medium dark:text-slate-200">
                        {o.name}
                        {o.isComplaintHead && <span className="ml-2 rounded-full bg-amber-100 dark:bg-amber-950 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300">★ Complaint Head</span>}
                      </td>
                      <td className="py-3 pr-4 dark:text-slate-300">{o.department?.name || '-'}</td>
                      <td className="py-3 pr-4 font-mono text-xs font-semibold dark:text-slate-200">{o.employeeId || '-'}</td>
                      <td className="py-3 pr-4 dark:text-slate-300">{o.email}</td>
                      <td className="py-3 pr-4 text-xs dark:text-slate-300">{scopeLabel(o.scopeState, o.scopeDistrict)}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${s.cls}`}>{s.text}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-2 text-xs font-medium">
                          {o.approvalStatus === 'approved' && (
                            <button onClick={() => setScopeEdit({ officer: o, scopeState: o.scopeState || '', scopeDistrict: o.scopeDistrict || '' })} className="text-teal-600 hover:underline">Edit scope</button>
                          )}
                          {o.approvalStatus === 'approved' && o.isActive && (
                            o.isComplaintHead
                              ? <button onClick={() => makeHead(o, true)} className="text-slate-500 hover:underline">Remove Head rank</button>
                              : <button onClick={() => makeHead(o)} className="text-purple-600 hover:underline">Make Complaint Head</button>
                          )}
                          {o.approvalStatus === 'approved' && (
                            <button onClick={() => toggle(o._id)} className="text-accent-500 hover:underline">
                              {o.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                          <button onClick={() => resetPassword(o._id)} className="text-amber-600 hover:underline">Reset Password</button>
                          <button onClick={() => openDeleteRequest(o)} className="text-rose-600 hover:underline">Request Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {scopeEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setScopeEdit(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold text-navy-900 dark:text-white">Visibility scope — {scopeEdit.officer.name}</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{scopeEdit.officer.employeeId} · {scopeEdit.officer.department?.name}</p>
            <div className="mt-4 grid">
              <ScopePicker scopeState={scopeEdit.scopeState} scopeDistrict={scopeEdit.scopeDistrict} onChange={(v) => setScopeEdit({ ...scopeEdit, ...v, error: '' })} />
            </div>
            {scopeEdit.error && <p className="mt-3 rounded-lg bg-rose-50 dark:bg-rose-950 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">{scopeEdit.error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setScopeEdit(null)} className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Cancel</button>
              <button onClick={saveScope} className="rounded-lg bg-navy-900 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800">Save scope</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminOfficers;
