import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import api from '../api/axios';
import useStatesDistricts from '../hooks/useStatesDistricts';

const emptyDept = { name: '', type: 'State Government', sector: '', description: '', state: '' };

const SuperAdminDepartments = () => {
  const { states } = useStatesDistricts();
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  const [newDept, setNewDept] = useState(emptyDept);
  const [newCategory, setNewCategory] = useState('');
  const [msg, setMsg] = useState('');

  const [master, setMaster] = useState({
    name: '', type: '', sector: '', state: '', logo: '', banner: '', website: '', hasMultipleOffices: false,
    chief: {}, departmentHead: {}, complaintOfficerHead: {},
  });
  const [masterMsg, setMasterMsg] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/departments'), api.get('/departments/categories')]).then(([d, c]) => {
      setDepartments(d.data);
      setCategories(c.data);
      if (!selectedId && d.data.length) setSelectedId(d.data[0]._id);
    }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  useEffect(() => {
    if (!selectedId) return;
    api.get(`/departments/${selectedId}`).then((res) => {
      setDetail(res.data);
      setMaster({
        name: res.data.name, type: res.data.type, sector: res.data.sector || '', state: res.data.state || '',
        logo: res.data.logo || '', banner: res.data.banner || '', website: res.data.website || '',
        hasMultipleOffices: !!res.data.hasMultipleOffices,
        chief: res.data.chief || {}, departmentHead: res.data.departmentHead || {}, complaintOfficerHead: res.data.complaintOfficerHead || {},
      });
    });
  }, [selectedId]);

  const createDept = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/departments', newDept);
      setMsg(`Department "${newDept.name}" created.`);
      setNewDept(emptyDept);
      load();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to create department');
    }
  };

  const deactivateDept = async (id) => {
    if (!window.confirm('Deactivate this department? It will be hidden from citizens but complaint history is preserved.')) return;
    await api.put(`/departments/${id}/deactivate`);
    load();
  };

  const deleteDept = async (id, name) => {
    if (!window.confirm(`Permanently delete "${name}"? This cannot be undone. Existing complaints will keep a reference to it for audit purposes.`)) return;
    await api.delete(`/departments/${id}`);
    setSelectedId('');
    load();
  };

  const createCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    await api.post('/departments/categories', { name: newCategory });
    setNewCategory('');
    load();
  };

  const deleteCategory = async (id) => {
    if (!window.confirm('Permanently delete this category?')) return;
    await api.delete(`/departments/categories/${id}`);
    load();
  };

  const saveMaster = async (e) => {
    e.preventDefault();
    setMasterMsg('');
    try {
      await api.put(`/departments/${selectedId}`, master);
      setMasterMsg('Department information updated.');
      load();
    } catch (err) {
      setMasterMsg(err.response?.data?.message || 'Failed to update');
    }
  };

  const selectedDept = departments.find((d) => d._id === selectedId);

  return (
    <DashboardLayout title="Department Management" subtitle="Only the Super Admin can create departments or write to them directly. Every Admin-proposed change lands here only after you approve it in the Approval Center.">
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <form onSubmit={createDept} className="card">
          <h2 className="font-display font-bold text-navy-900 dark:text-white">Create Department</h2>
          {msg && <p className="mt-2 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{msg}</p>}
          <div className="mt-3 flex flex-col gap-2">
            <input required placeholder="Department name" value={newDept.name} onChange={(e) => setNewDept({ ...newDept, name: e.target.value })} className="input" />
            <select value={newDept.type} onChange={(e) => setNewDept({ ...newDept, type: e.target.value })} className="input">
              {['Central Government', 'State Government', 'Public Sector', 'Private Sector'].map((t) => <option key={t}>{t}</option>)}
            </select>
            {newDept.type === 'State Government' && (
              <select value={newDept.state} onChange={(e) => setNewDept({ ...newDept, state: e.target.value })} className="input">
                <option value="">Which state? (leave blank = shown to all states)</option>
                {states.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            <input placeholder="Sector (optional, e.g. Banks, Telecom)" value={newDept.sector} onChange={(e) => setNewDept({ ...newDept, sector: e.target.value })} className="input" />
            <textarea placeholder="Description" rows={2} value={newDept.description} onChange={(e) => setNewDept({ ...newDept, description: e.target.value })} className="input" />
            <button type="submit" className="rounded-lg bg-gradient-to-r from-rose-700 to-navy-900 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition">Create Department</button>
          </div>
        </form>

        <div className="card">
          <h2 className="font-display font-bold text-navy-900 dark:text-white">Complaint Categories</h2>
          <form onSubmit={createCategory} className="mt-3 flex gap-2">
            <input placeholder="New category name" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="input flex-1" />
            <button className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 transition">Add</button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2 max-h-40 overflow-y-auto">
            {categories.map((c) => (
              <span key={c._id} className="flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                {c.name}
                <button onClick={() => deleteCategory(c._id)} className="text-rose-500 hover:text-rose-700">×</button>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="card mb-6 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[16rem]">
          <label className="label">Manage Department</label>
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="input mt-1">
            {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
        </div>
        {selectedId && (
          <div className="flex gap-2 pt-5">
            <button onClick={() => deactivateDept(selectedId)} className="text-xs font-semibold text-amber-600 hover:underline">Deactivate</button>
            <button onClick={() => deleteDept(selectedId, selectedDept?.name)} className="text-xs font-semibold text-rose-600 hover:underline">Delete Permanently</button>
          </div>
        )}
      </div>

      {loading || !detail ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p> : (
        <form onSubmit={saveMaster} className="grid gap-6 lg:grid-cols-2">
          <div className="card flex flex-col gap-3">
            <h2 className="font-display font-bold text-navy-900 dark:text-white">Identity & Branding</h2>
            {masterMsg && <p className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{masterMsg}</p>}
            <div>
              <label className="label">Name</label>
              <input value={master.name} onChange={(e) => setMaster({ ...master, name: e.target.value })} className="input mt-1" />
            </div>
            <div>
              <label className="label">Sector</label>
              <input value={master.sector} onChange={(e) => setMaster({ ...master, sector: e.target.value })} className="input mt-1" placeholder="e.g. Banks, Telecom, Insurance" />
            </div>
            {master.type === 'State Government' && (
              <div>
                <label className="label">State</label>
                <select value={master.state} onChange={(e) => setMaster({ ...master, state: e.target.value })} className="input mt-1">
                  <option value="">All India (shown to every state)</option>
                  {states.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <p className="mt-1 text-[11px] text-slate-400">Citizens only see this department if it matches their own state, or if left as "All India".</p>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={master.hasMultipleOffices} onChange={(e) => setMaster({ ...master, hasMultipleOffices: e.target.checked })} />
              This department has many branches/offices (citizen must specify which one when filing)
            </label>
            <div>
              <label className="label">Logo URL</label>
              <input value={master.logo} onChange={(e) => setMaster({ ...master, logo: e.target.value })} className="input mt-1" placeholder="https://..." />
              {master.logo && <img src={master.logo} alt="logo preview" className="mt-2 h-14 w-14 object-contain" />}
            </div>
            <div>
              <label className="label">Banner URL</label>
              <input value={master.banner} onChange={(e) => setMaster({ ...master, banner: e.target.value })} className="input mt-1" placeholder="https://..." />
            </div>
            <div>
              <label className="label">Official Website</label>
              <input value={master.website} onChange={(e) => setMaster({ ...master, website: e.target.value })} className="input mt-1" placeholder="https://..." />
              <p className="mt-1 text-[11px] text-slate-400">Shown to citizens/officers as a "Visit Official Website" link on the department page.</p>
            </div>

            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mt-2">
              Chief — the top leader of this department (Minister for a govt. department, Chairman/CEO for public or private sector)
            </p>
            <input placeholder="Name" value={master.chief?.name || ''} onChange={(e) => setMaster({ ...master, chief: { ...master.chief, name: e.target.value } })} className="input" />
            <input placeholder="Designation (e.g. Minister of Home Affairs, Chairman, CEO)" value={master.chief?.designation || ''} onChange={(e) => setMaster({ ...master, chief: { ...master.chief, designation: e.target.value } })} className="input" />
            <textarea placeholder="Official message" rows={2} value={master.chief?.message || ''} onChange={(e) => setMaster({ ...master, chief: { ...master.chief, message: e.target.value } })} className="input" />
            <textarea placeholder="Biography" rows={2} value={master.chief?.biography || ''} onChange={(e) => setMaster({ ...master, chief: { ...master.chief, biography: e.target.value } })} className="input" />

            <button type="submit" className="mt-2 rounded-lg bg-gradient-to-r from-rose-700 to-navy-900 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition">
              Save Changes
            </button>
          </div>

          <div className="flex flex-col gap-6">
            <div className="card">
              <h2 className="font-display font-bold text-navy-900 dark:text-white">Department Head</h2>
              <div className="mt-3 flex flex-col gap-2">
                <input placeholder="Name" value={master.departmentHead?.name || ''} onChange={(e) => setMaster({ ...master, departmentHead: { ...master.departmentHead, name: e.target.value } })} className="input" />
                <input placeholder="Designation" value={master.departmentHead?.designation || ''} onChange={(e) => setMaster({ ...master, departmentHead: { ...master.departmentHead, designation: e.target.value } })} className="input" />
                <input placeholder="Employee ID" value={master.departmentHead?.employeeId || ''} onChange={(e) => setMaster({ ...master, departmentHead: { ...master.departmentHead, employeeId: e.target.value } })} className="input" />
                <input placeholder="Email" value={master.departmentHead?.email || ''} onChange={(e) => setMaster({ ...master, departmentHead: { ...master.departmentHead, email: e.target.value } })} className="input" />
                <input placeholder="Phone" value={master.departmentHead?.phone || ''} onChange={(e) => setMaster({ ...master, departmentHead: { ...master.departmentHead, phone: e.target.value } })} className="input" />
                <textarea placeholder="Responsibilities" rows={2} value={master.departmentHead?.responsibilities || ''} onChange={(e) => setMaster({ ...master, departmentHead: { ...master.departmentHead, responsibilities: e.target.value } })} className="input" />
              </div>
            </div>

            <div className="card">
              <h2 className="font-display font-bold text-navy-900 dark:text-white">Complaint Officer Head</h2>
              <div className="mt-3 flex flex-col gap-2">
                <input placeholder="Name" value={master.complaintOfficerHead?.name || ''} onChange={(e) => setMaster({ ...master, complaintOfficerHead: { ...master.complaintOfficerHead, name: e.target.value } })} className="input" />
                <input placeholder="Designation" value={master.complaintOfficerHead?.designation || ''} onChange={(e) => setMaster({ ...master, complaintOfficerHead: { ...master.complaintOfficerHead, designation: e.target.value } })} className="input" />
                <input placeholder="Helpline" value={master.complaintOfficerHead?.helpline || ''} onChange={(e) => setMaster({ ...master, complaintOfficerHead: { ...master.complaintOfficerHead, helpline: e.target.value } })} className="input" />
                <input placeholder="Working Hours" value={master.complaintOfficerHead?.workingHours || ''} onChange={(e) => setMaster({ ...master, complaintOfficerHead: { ...master.complaintOfficerHead, workingHours: e.target.value } })} className="input" />
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Helpline, working hours, address, notices, team directory and other operational fields are managed the same way — through this form or via an Admin's approval request, both writing to the same department record.
            </p>
          </div>
        </form>
      )}
    </DashboardLayout>
  );
};

export default SuperAdminDepartments;
