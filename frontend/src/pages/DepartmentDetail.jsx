import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ChatAssistant from '../components/ChatAssistant';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const formatSince = (d) => d ? new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : null;

const DepartmentDetail = () => {
  const { id } = useParams();
  const [dept, setDept] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    api.get(`/departments/${id}`).then((res) => setDept(res.data)).finally(() => setLoading(false));
  }, [id]);

  const fileComplaint = () => {
    if (!user) return navigate('/login', { state: { redirectTo: `/complaints/new?department=${id}` } });
    if (user.role !== 'citizen') return;
    navigate(`/complaints/new?department=${id}&name=${encodeURIComponent(dept.name)}`);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950"><Navbar /><p className="p-10 text-center text-sm text-slate-400">Loading...</p></div>
  );
  if (!dept) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950"><Navbar /><p className="p-10 text-center text-sm text-slate-400">Department not found.</p></div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <Navbar />
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* SPA link, not a full page reload — the browser Back button then
            returns here instantly instead of re-fetching everything. */}
        <Link to="/departments" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-navy-900 dark:hover:text-white transition">
          ← Back to Departments
        </Link>

        <div className="card overflow-hidden bg-gradient-to-br from-navy-900 to-slate-800 text-white border-0 p-0">
          {dept.banner && (
            <img src={dept.banner} alt="" className="h-40 w-full object-cover opacity-80" />
          )}
          <div className="p-6">
            <div className="flex items-start gap-4">
              {dept.logo && (
                <div className="h-16 w-16 shrink-0 rounded-xl bg-white/95 flex items-center justify-center overflow-hidden">
                  <img src={dept.logo} alt={dept.name} className="h-full w-full object-contain" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{dept.type}{dept.sector ? ` · ${dept.sector}` : ''}{dept.state && dept.state !== 'All India' ? ` · ${dept.state}` : ''}</p>
                <h1 className="mt-1 font-display text-2xl font-bold">{dept.name}</h1>
                {dept.description && <p className="mt-2 text-sm opacity-80 max-w-2xl">{dept.description}</p>}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {(!user || user.role === 'citizen') && (
                <button onClick={fileComplaint} className="btn-animate rounded-lg bg-accent-500 px-5 py-2.5 text-sm font-semibold hover:bg-accent-600 transition">
                  File a Complaint Here →
                </button>
              )}
              {dept.website && (
                <a href={dept.website} target="_blank" rel="noreferrer"
                  className="btn-animate rounded-lg border border-white/30 px-5 py-2.5 text-sm font-semibold hover:bg-white/10 transition">
                  🔗 Visit Official Website
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {(dept.mission || dept.vision) && (
            <div className="card">
              <h2 className="font-display font-bold text-navy-900 dark:text-white">Mission & Vision</h2>
              {dept.mission && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300"><strong>Mission:</strong> {dept.mission}</p>}
              {dept.vision && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300"><strong>Vision:</strong> {dept.vision}</p>}
            </div>
          )}

          <div className="card">
            <h2 className="font-display font-bold text-navy-900 dark:text-white">Contact & Helpline</h2>
            <div className="mt-2 grid grid-cols-1 gap-1 text-sm text-slate-600 dark:text-slate-300">
              {dept.helpline && <p><span className="text-slate-400">Helpline:</span> {dept.helpline}</p>}
              {dept.emergencyContact && <p><span className="text-slate-400">Emergency:</span> {dept.emergencyContact}</p>}
              {dept.email && <p><span className="text-slate-400">Email:</span> {dept.email}</p>}
              {dept.officialPhone && <p><span className="text-slate-400">Phone:</span> {dept.officialPhone}</p>}
              {dept.officialAddress && <p><span className="text-slate-400">Address:</span> {dept.officialAddress}</p>}
              {dept.workingHours && <p><span className="text-slate-400">Working Hours:</span> {dept.workingHours}</p>}
              {dept.website && (
                <p>
                  <span className="text-slate-400">Website:</span>{' '}
                  <a href={dept.website} target="_blank" rel="noreferrer" className="text-accent-500 hover:underline">{dept.website}</a>
                </p>
              )}
              {!dept.helpline && !dept.email && !dept.officialAddress && <p className="text-slate-400">No contact details published yet.</p>}
              {(!user || user.role === 'citizen') && (
                <div className="mt-4 rounded-lg bg-accent-500/5 border border-accent-500/30 p-3">
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {dept.complaintHead?.name
                      ? <>Questions go directly to our <strong>Complaint Head</strong>, {dept.complaintHead.name}.</>
                      : 'Your question goes to the department helpline team.'}
                  </p>
                  <button
                    onClick={() => (user ? navigate(`/citizen/helpline?department=${id}`) : navigate('/login', { state: { redirectTo: `/citizen/helpline?department=${id}` } }))}
                    className="mt-2 rounded-lg bg-accent-500 px-4 py-2 text-xs font-semibold text-white hover:bg-accent-600 transition"
                  >
                    ☎ Talk to the department helpline
                  </button>
                </div>
              )}
            </div>
            {dept.temporaryNotice && (
              <p className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-950 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">📌 {dept.temporaryNotice}</p>
            )}
          </div>
        </div>

        {dept.chief?.name && (
          <div className="card mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent-500">{dept.chief.designation || 'Chief'}</p>
            <h2 className="mt-1 font-display text-lg font-bold text-navy-900 dark:text-white">{dept.chief.name}</h2>
            {dept.chief.since && <p className="text-xs text-slate-400">In office since {formatSince(dept.chief.since)}</p>}
            {dept.chief.message && <p className="mt-2 text-sm italic text-slate-600 dark:text-slate-300">"{dept.chief.message}"</p>}
            {dept.chief.biography && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{dept.chief.biography}</p>}
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {dept.departmentHead?.name && (
            <div className="card">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent-500">Department Head / Secretary</p>
              <h3 className="mt-1 font-display font-bold text-navy-900 dark:text-white">{dept.departmentHead.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{dept.departmentHead.designation}</p>
              {dept.departmentHead.since && <p className="text-xs text-slate-400">In office since {formatSince(dept.departmentHead.since)}</p>}
              {dept.departmentHead.responsibilities && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{dept.departmentHead.responsibilities}</p>}
            </div>
          )}
          {dept.complaintOfficerHead?.name && (
            <div className="card">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent-500">Complaint Officer Head</p>
              <h3 className="mt-1 font-display font-bold text-navy-900 dark:text-white">{dept.complaintOfficerHead.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{dept.complaintOfficerHead.designation}</p>
              <p className="mt-2 text-xs text-slate-400">
                {dept.complaintOfficerHead.helpline && `Helpline: ${dept.complaintOfficerHead.helpline} · `}
                {dept.complaintOfficerHead.workingHours}
              </p>
            </div>
          )}
        </div>

        {dept.team?.length > 0 && (
          <div className="card mt-6">
            <h2 className="font-display font-bold text-navy-900 dark:text-white mb-4">Department Team</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {dept.team.map((m, i) => (
                <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                  <p className="font-semibold text-navy-900 dark:text-white">{m.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{m.designation}</p>
                  {m.email && <p className="mt-1 text-xs text-slate-400">{m.email}</p>}
                  {m.officeLocation && <p className="text-xs text-slate-400">{m.officeLocation}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {dept.complaintCategories?.length > 0 && (
          <div className="card mt-6">
            <h2 className="font-display font-bold text-navy-900 dark:text-white mb-3">Complaint Categories Handled</h2>
            <div className="flex flex-wrap gap-2">
              {dept.complaintCategories.map((c) => (
                <span key={c} className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">{c}</span>
              ))}
            </div>
          </div>
        )}

        <Link to="/departments" className="mt-8 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-navy-900 dark:hover:text-white transition">
          ← Back to Departments
        </Link>
      </div>
      <ChatAssistant department={dept} />
    </div>
  );
};

export default DepartmentDetail;
