import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import api from '../api/axios';

const AdminCitizens = () => {
  const [citizens, setCitizens] = useState([]);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [correcting, setCorrecting] = useState(null);
  const [correction, setCorrection] = useState({ field: 'phone', value: '', reason: '' });

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/admin/citizens', { params: { search: search || undefined, createdFrom: dateFrom || undefined, createdTo: dateTo || undefined } })
      .then((res) => setCitizens(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const submitSearch = (e) => { e.preventDefault(); load(); };

  const openCorrection = (citizen) => {
    setCorrecting(citizen);
    setDeleteTarget(null);
    setCorrection({ field: 'phone', value: '', reason: '' });
    setMsg('');
  };

  const submitCorrection = async (e) => {
    e.preventDefault();
    try {
      await api.post('/approvals/citizen-correction', {
        citizenId: correcting._id,
        fields: { [correction.field]: correction.value },
        reason: correction.reason,
      });
      setMsg('Correction request sent to Super Admin for approval.');
      setCorrecting(null);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to submit correction request');
    }
  };

  const openDeleteRequest = (citizen) => {
    setDeleteTarget(citizen);
    setCorrecting(null);
    setDeleteReason('');
    setMsg('');
  };

  // Admin cannot delete a citizen directly — only request it. Super Admin
  // reviews and either approves (which performs the deletion) or rejects.
  const submitDeleteRequest = async (e) => {
    e.preventDefault();
    try {
      await api.post('/approvals/delete-citizen', { targetId: deleteTarget._id, reason: deleteReason });
      setMsg('Deletion request sent to Super Admin for approval.');
      setDeleteTarget(null);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to submit request');
    }
  };

  return (
    <DashboardLayout title="Citizens" subtitle="Admin can search and view citizens (including their password status — never the password itself), but never edit or delete them directly. Corrections and deletions require Super Admin approval.">
      <form onSubmit={submitSearch} className="card mb-6 flex flex-wrap items-end gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, phone, Aadhar, state or district"
          className="input flex-1 min-w-[220px]"
        />
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Joined From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input mt-1" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Joined To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input mt-1" />
        </div>
        <button className="rounded-lg bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 transition">
          Search
        </button>
      </form>

      {msg && <p className="mb-4 rounded-lg bg-slate-100 dark:bg-slate-900 px-3 py-2 text-sm text-slate-600 dark:text-slate-300">{msg}</p>}

      {correcting && (
        <form onSubmit={submitCorrection} className="card mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <p className="sm:col-span-3 text-sm font-semibold text-navy-900 dark:text-white">
            Request a profile correction for {correcting.name}
          </p>
          <select value={correction.field} onChange={(e) => setCorrection({ ...correction, field: e.target.value })} className="input">
            {['phone', 'address', 'state', 'district', 'pincode', 'name'].map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <input required placeholder="New value" value={correction.value} onChange={(e) => setCorrection({ ...correction, value: e.target.value })} className="input" />
          <input required placeholder="Reason" value={correction.reason} onChange={(e) => setCorrection({ ...correction, reason: e.target.value })} className="input" />
          <div className="sm:col-span-3 flex gap-3">
            <button type="submit" className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 transition">Send for Approval</button>
            <button type="button" onClick={() => setCorrecting(null)} className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Cancel</button>
          </div>
        </form>
      )}

      {deleteTarget && (
        <form onSubmit={submitDeleteRequest} className="card mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <p className="sm:col-span-3 text-sm font-semibold text-navy-900 dark:text-white">
            Request deletion of {deleteTarget.name} ({deleteTarget.citizenId})
          </p>
          <input required placeholder="Reason for deletion" value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} className="input sm:col-span-2" />
          <div className="flex gap-3">
            <button type="submit" className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition">Submit Request</button>
            <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Cancel</button>
          </div>
        </form>
      )}

      <div className="card">
        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>
        ) : citizens.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">No citizens found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className="py-3 pr-4">Citizen ID</th>
                  <th className="py-3 pr-4">Name</th>
                  <th className="py-3 pr-4">Email</th>
                  <th className="py-3 pr-4">Phone</th>
                  <th className="py-3 pr-4">State / District</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {citizens.map((c) => (
                  <tr key={c._id} className="border-b border-slate-100 dark:border-slate-800/60">
                    <td className="py-3 pr-4 font-mono text-xs font-semibold dark:text-slate-200">{c.citizenId || '-'}</td>
                    <td className="py-3 pr-4 font-medium dark:text-slate-200">{c.name}</td>
                    <td className="py-3 pr-4 dark:text-slate-300">{c.email}</td>
                    <td className="py-3 pr-4 dark:text-slate-300">{c.phone || '-'}</td>
                    <td className="py-3 pr-4 dark:text-slate-300">{c.state || '-'} / {c.district || '-'}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${c.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                        {c.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-2 text-xs font-medium">
                        <button onClick={() => openCorrection(c)} className="text-accent-500 hover:underline">Request Correction</button>
                        <button onClick={() => openDeleteRequest(c)} className="text-rose-600 hover:underline">Request Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminCitizens;
