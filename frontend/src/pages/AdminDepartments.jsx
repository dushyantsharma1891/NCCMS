import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import api from '../api/axios';

const editableFields = [
  { k: 'helpline', label: 'Helpline Number' },
  { k: 'officialPhone', label: 'Office Phone' },
  { k: 'workingHours', label: 'Working Hours' },
  { k: 'email', label: 'Email' },
  { k: 'website', label: 'Website' },
  { k: 'officialAddress', label: 'Official Address' },
  { k: 'emergencyContact', label: 'Emergency Contact' },
  { k: 'temporaryNotice', label: 'Temporary Notice', long: true },
  { k: 'complaintInstructions', label: 'Complaint Instructions', long: true },
  { k: 'description', label: 'Description', long: true },
  { k: 'mission', label: 'Mission', long: true },
  { k: 'vision', label: 'Vision', long: true },
  { k: 'logo', label: 'Logo URL' },
  { k: 'banner', label: 'Banner URL' },
  { k: 'name', label: 'Department Name' },
];

// Admin has NO direct write access to departments at all — every proposed
// change, however small, is submitted here as a single Approval Request and
// only takes effect once the Super Admin approves it (with an optional remark).
const AdminDepartments = () => {
  const [departments, setDepartments] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  const [changed, setChanged] = useState({});
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [myRequests, setMyRequests] = useState([]);

  const load = () => {
    setLoading(true);
    api.get('/departments').then((res) => {
      setDepartments(res.data);
      if (!selectedId && res.data.length) setSelectedId(res.data[0]._id);
    }).finally(() => setLoading(false));
    api.get('/approvals', { params: { type: 'department_update' } }).then((res) => setMyRequests(res.data));
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  useEffect(() => {
    if (!selectedId) return;
    api.get(`/departments/${selectedId}`).then((res) => setDetail(res.data));
    setChanged({});
  }, [selectedId]);

  const setField = (key, value) => {
    setChanged((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    if (Object.keys(changed).length === 0) {
      setMsg('Change at least one field before submitting.');
      return;
    }
    if (!reason.trim()) {
      setMsg('Please give a short reason for this change.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/approvals/department', { departmentId: selectedId, fields: changed, reason });
      setMsg('Change request submitted to Super Admin for approval.');
      setChanged({});
      setReason('');
      load();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedDept = departments.find((d) => d._id === selectedId);
  const pendingForThis = myRequests.filter((r) => r.status === 'Pending');

  return (
    <DashboardLayout title="Department Information" subtitle="You cannot edit departments directly. Propose any change here — name, contact info, notices, anything — and it takes effect once the Super Admin approves it.">
      <div className="card mb-6">
        <label className="label">Department</label>
        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="input mt-1 max-w-md">
          {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
        </select>
      </div>

      {loading || !detail ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p> : (
        <div className="grid gap-6 lg:grid-cols-3">
          <form onSubmit={submit} className="card lg:col-span-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <h2 className="sm:col-span-2 font-display font-bold text-navy-900 dark:text-white">Propose Changes — {selectedDept?.name}</h2>
            {msg && <p className="sm:col-span-2 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{msg}</p>}
            {editableFields.map((f) => (
              <div key={f.k} className={f.long ? 'sm:col-span-2' : ''}>
                <label className="label">{f.label}</label>
                {f.long ? (
                  <textarea rows={2} defaultValue={detail[f.k] || ''} onChange={(e) => setField(f.k, e.target.value)} className="input mt-1" />
                ) : (
                  <input defaultValue={detail[f.k] || ''} onChange={(e) => setField(f.k, e.target.value)} className="input mt-1" />
                )}
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="label">Reason for this change *</label>
              <textarea required rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className="input mt-1" placeholder="e.g. Helpline number changed after office relocation" />
            </div>
            <button type="submit" disabled={submitting} className="sm:col-span-2 mt-2 rounded-lg bg-gradient-to-r from-purple-700 to-navy-900 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-60">
              {submitting ? 'Submitting...' : 'Submit for Super Admin Approval'}
            </button>
          </form>

          <div className="card h-fit">
            <h2 className="font-display font-bold text-navy-900 dark:text-white">Your Requests</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{pendingForThis.length} pending across all departments.</p>
            <ul className="mt-3 flex flex-col gap-2 max-h-96 overflow-y-auto">
              {myRequests.length === 0 ? <p className="text-xs text-slate-400">No requests yet.</p> : myRequests.map((r) => (
                <li key={r._id} className="rounded-lg bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-slate-400">{r.requestId}</span>
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${
                      r.status === 'Pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : r.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                      {r.status}
                    </span>
                  </div>
                  <p className="mt-1 dark:text-slate-300">{r.reason}</p>
                  {r.reviewRemark && <p className="mt-1 text-slate-400">Remark: {r.reviewRemark}</p>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminDepartments;
