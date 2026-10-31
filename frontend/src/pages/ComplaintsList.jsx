import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import ComplaintTable from '../components/ComplaintTable';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const statusOptions = ['', 'Pending', 'Accepted', 'Assigned', 'In Progress', 'Resolved', 'Closed', 'Rejected'];

// Reads status/department/officer/escalated straight from the URL so
// dashboard cards can link here pre-filtered (e.g. clicking "Resolved" on
// the Super Admin dashboard opens this page already showing only Resolved
// complaints). The filters remain fully editable afterward.
const ComplaintsList = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdminTier = user.role === 'admin' || user.role === 'super_admin';

  const [complaints, setComplaints] = useState([]);
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    search: searchParams.get('search') || '',
  });
  const [escalatedOnly, setEscalatedOnly] = useState(searchParams.get('escalated') === 'true');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.search) params.search = filters.search;
    if (escalatedOnly) params.escalated = 'true';
    const dept = searchParams.get('department');
    const officer = searchParams.get('officer');
    if (dept && isAdminTier) params.department = dept;
    if (officer && isAdminTier) params.officer = officer;
    if (searchParams.get('anonymous') === 'true' && isAdminTier) params.anonymous = 'true';
    if (searchParams.get('mine') === 'true' && user.role === 'officer') params.mine = 'true';
    if (isAdminTier && includeArchived) params.includeArchived = 'true';
    api.get('/complaints/all', { params }).then((res) => setComplaints(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filters.status, escalatedOnly, includeArchived]); // eslint-disable-line

  const search = (e) => { e.preventDefault(); load(); };

  const updateStatus = (status) => {
    setFilters({ ...filters, status });
    const next = new URLSearchParams(searchParams);
    if (status) next.set('status', status); else next.delete('status');
    setSearchParams(next, { replace: true });
  };

  return (
    <DashboardLayout
      title="Complaints"
      subtitle={isAdminTier
        ? 'Resolved, closed or rejected complaints auto-archive after a few days — toggle below to see everything.'
        : 'Search, filter and manage complaints.'}
    >
      <div className="card mb-6 flex flex-wrap items-end gap-4">
        <form onSubmit={search} className="flex flex-1 min-w-[220px] gap-2">
          <input
            value={filters.search} placeholder="Search by Complaint ID or title"
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="input flex-1"
          />
          <button className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white">Search</button>
        </form>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Status</label>
          <select value={filters.status} onChange={(e) => updateStatus(e.target.value)}
            className="input mt-1">
            {statusOptions.map((s) => <option key={s} value={s}>{s || 'All'}</option>)}
          </select>
        </div>
        {isAdminTier && (
          <>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 pb-2.5">
              <input type="checkbox" checked={escalatedOnly} onChange={(e) => setEscalatedOnly(e.target.checked)} />
              Escalated only
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 pb-2.5">
              <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} />
              Show archived (auto-hidden)
            </label>
          </>
        )}
      </div>

      <div className="card">
        {loading ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p> : (
          <ComplaintTable complaints={complaints} showCitizen={user.role !== 'citizen'} showDepartment={user.role !== 'officer'} viewerRole={user.role} />
        )}
      </div>
    </DashboardLayout>
  );
};

export default ComplaintsList;
