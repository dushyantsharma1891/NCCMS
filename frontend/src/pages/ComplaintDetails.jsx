import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import StatusBadge from '../components/StatusBadge';
import StateDistrictSelect from '../components/StateDistrictSelect';
import ComplaintChat from '../components/ComplaintChat';
import { scopeLabel } from '../components/ScopePicker';
import ReportFalseComplaint from '../components/ReportFalseComplaint';
import ComplaintHelpPanel from '../components/ComplaintHelpPanel';
import AutoCloseNotice from '../components/AutoCloseNotice';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

// Mirrors backend/utils/statusFlow.js FORWARD_TRANSITIONS — kept here only to
// drive which options are shown; the backend is the actual source of truth
// and re-validates every request regardless of what the frontend sends.
const FORWARD_TRANSITIONS = {
  Pending: ['Assigned', 'Rejected'],
  Assigned: ['Accepted'],
  Accepted: ['In Progress'],
  'In Progress': ['Resolved'],
  Resolved: ['Closed'],
  Closed: [],
  Rejected: [],
};
const LIFECYCLE = ['Pending', 'Assigned', 'Accepted', 'In Progress', 'Resolved', 'Closed'];

const actionTypeLabel = {
  Submitted: 'Complaint Submitted',
  Assignment: 'Assigned',
  Reassignment: 'Reassigned',
  StatusChange: 'Status Changed',
  Escalation: 'Escalated to Admin',
  StatusBackRequest: 'Status Change Requested',
  StatusBackApproved: 'Status Rollback Approved',
  StatusBackRejected: 'Status Rollback Rejected',
  Edit: 'Edited',
  Other: 'Update',
};

const ComplaintDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdminTier = user.role === 'admin' || user.role === 'super_admin';

  const [complaint, setComplaint] = useState(null);
  const [status, setStatus] = useState('');
  const [remarks, setRemarks] = useState('');
  const [resolutionImages, setResolutionImages] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Admin/Super Admin: officer assignment
  const [officers, setOfficers] = useState([]);
  const [selectedOfficer, setSelectedOfficer] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignMsg, setAssignMsg] = useState('');

  // Admin/Super Admin: full edit
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg] = useState('');
  const [editReason, setEditReason] = useState('');

  // Officer-only: escalate to admin
  const [escalateNote, setEscalateNote] = useState('');
  const [escalating, setEscalating] = useState(false);
  const [escalateMsg, setEscalateMsg] = useState('');

  // Officer-only: request a backward status change (needs Admin approval)
  const [showBackRequest, setShowBackRequest] = useState(false);
  const [backTarget, setBackTarget] = useState('');
  const [backReason, setBackReason] = useState('');
  const [backSaving, setBackSaving] = useState(false);
  const [backMsg, setBackMsg] = useState('');

  // Admin-only: request deletion (Admin cannot delete a complaint directly —
  // only Super Admin can, and does so instantly below)
  const [showDeleteRequest, setShowDeleteRequest] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteRequestMsg, setDeleteRequestMsg] = useState('');
  const [deleteRequestSaving, setDeleteRequestSaving] = useState(false);

  const load = () => api.get(`/complaints/${id}`).then((res) => {
    setComplaint(res.data);
    setStatus((res.data.allowedNextStatuses || [])[0] || res.data.status);
    setEditForm({
      title: res.data.title, description: res.data.description, category: res.data.category,
      priority: res.data.priority, location: res.data.location, state: res.data.state, district: res.data.district,
    });
  });

  useEffect(() => { load(); }, [id]); // eslint-disable-line

  useEffect(() => {
    if (isAdminTier && complaint?.department?._id) {
      api.get('/admin/officers', { params: { complaint: complaint._id } }).then((res) => setOfficers(res.data));
    }
  }, [isAdminTier, complaint?.department?._id]);

  const updateStatus = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const data = new FormData();
      const sendStatus = (complaint.allowedNextStatuses || []).includes(status) ? status : (complaint.allowedNextStatuses || [])[0];
      data.append('status', sendStatus || status);
      data.append('remarks', remarks);
      resolutionImages.forEach((img) => data.append('resolutionImages', img));
      await api.put(`/complaints/status/${complaint._id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMsg('Status updated successfully.');
      setRemarks('');
      setResolutionImages([]);
      load();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const assignOfficer = async (e) => {
    e.preventDefault();
    if (!selectedOfficer) return;
    setAssigning(true);
    setAssignMsg('');
    try {
      await api.put(`/complaints/assign/${complaint._id}`, { officerId: selectedOfficer });
      setAssignMsg('Officer assigned successfully.');
      load();
    } catch (err) {
      setAssignMsg(err.response?.data?.message || 'Failed to assign officer');
    } finally {
      setAssigning(false);
    }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    setEditMsg('');
    try {
      if (user.role === 'super_admin') {
        await api.put(`/complaints/admin-edit/${complaint._id}`, editForm);
        setEditMsg('Complaint updated.');
        setEditing(false);
      } else {
        if (!editReason.trim()) {
          setEditMsg('Please give a reason for this proposed edit.');
          setEditSaving(false);
          return;
        }
        const changedFields = {};
        Object.entries(editForm).forEach(([k, v]) => {
          if (String(v) !== String(complaint[k] ?? '')) changedFields[k] = v;
        });
        if (Object.keys(changedFields).length === 0) {
          setEditMsg('Change at least one field before submitting.');
          setEditSaving(false);
          return;
        }
        await api.post('/approvals/complaint-edit', { complaintId: complaint._id, fields: changedFields, reason: editReason });
        setEditMsg('Edit proposal sent to Super Admin for approval.');
        setEditReason('');
        setEditing(false);
      }
      load();
    } catch (err) {
      setEditMsg(err.response?.data?.message || 'Failed to save changes');
    } finally {
      setEditSaving(false);
    }
  };

  const deleteComplaint = async () => {
    if (!window.confirm(`Permanently delete complaint ${complaint.complaintId}? This cannot be undone.`)) return;
    await api.delete(`/complaints/delete/${complaint._id}`);
    navigate(user.role === 'citizen' ? '/citizen/complaints' : isAdminTier ? '/admin/complaints' : '/officer/complaints');
  };

  // Admin cannot delete a complaint directly — only Super Admin can (via the
  // button above). Admin instead submits this request for Super Admin review.
  const submitDeleteRequest = async (e) => {
    e.preventDefault();
    setDeleteRequestSaving(true);
    setDeleteRequestMsg('');
    try {
      await api.post('/approvals/delete-complaint', { targetId: complaint._id, reason: deleteReason });
      setDeleteRequestMsg('Deletion request sent to Super Admin for approval.');
      setDeleteReason('');
    } catch (err) {
      setDeleteRequestMsg(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setDeleteRequestSaving(false);
    }
  };

  const escalate = async (e) => {
    e.preventDefault();
    setEscalating(true);
    setEscalateMsg('');
    try {
      await api.put(`/complaints/escalate/${complaint._id}`, { note: escalateNote });
      setEscalateMsg('Escalated to admin — they have been notified.');
      setEscalateNote('');
      load();
    } catch (err) {
      setEscalateMsg(err.response?.data?.message || 'Failed to escalate');
    } finally {
      setEscalating(false);
    }
  };

  const requestBackward = async (e) => {
    e.preventDefault();
    setBackSaving(true);
    setBackMsg('');
    try {
      await api.post('/status-requests', { complaintId: complaint._id, requestedStatus: backTarget, reason: backReason });
      setBackMsg('Request sent to Admin for approval.');
      setBackTarget('');
      setBackReason('');
      load();
    } catch (err) {
      setBackMsg(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setBackSaving(false);
    }
  };

  if (!complaint) return <DashboardLayout title="Complaint Details"><p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p></DashboardLayout>;

  const isAssignedToMe = user.role === 'officer' && complaint.assignedOfficer && String(complaint.assignedOfficer._id) === String(user._id);
  const canUpdate = isAdminTier || isAssignedToMe;

  // Forward-only options from the CURRENT status. Admin/Super Admin get the
  // same forward set via this endpoint — any backward move (by anyone) must
  // go through the approved Status Change Request flow instead.
  // The backend now tells us exactly what this user may do (role-aware), so
  // the dropdown can never offer something the server would refuse.
  const fallbackOptions = (FORWARD_TRANSITIONS[complaint.status] || []).filter((s) => user.role !== 'officer' || !['Rejected', 'Closed'].includes(s));
  const statusOptions = complaint.allowedNextStatuses || fallbackOptions;
  // BUG FIX: the old code kept the CURRENT status in state while the dropdown
  // only listed NEXT statuses, so "Save" re-sent the current status and the
  // server rejected it. Always submit what the dropdown actually shows.
  const chosenStatus = statusOptions.includes(status) ? status : statusOptions[0];

  // Earlier lifecycle stages an officer could request to roll back to.
  const currentIdx = LIFECYCLE.indexOf(complaint.status);
  const backwardOptions = currentIdx > 0 ? LIFECYCLE.slice(0, currentIdx) : [];
  const hasPendingBackRequest = complaint.history?.some?.((h) => h.actionType === 'StatusBackRequest' && !complaint.history.some((h2) => h2.requestId === h.requestId && ['StatusBackApproved', 'StatusBackRejected'].includes(h2.actionType)));

  return (
    <DashboardLayout title={complaint.complaintId} subtitle={complaint.title}>
      {complaint.needsAdminAttention && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <strong>Escalated for admin review:</strong> {complaint.escalationNote}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-3">
        <Link to={`/complaints/${complaint._id}/receipt`} className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
          🖨️ Print Receipt
        </Link>
        {isAdminTier && (
          <>
            <button onClick={() => setEditing((s) => !s)} className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
              {editing ? 'Cancel Edit' : '✏️ Edit Complaint'}
            </button>
            {user.role === 'super_admin' ? (
              <button onClick={deleteComplaint} className="rounded-lg border border-rose-300 dark:border-rose-800 px-4 py-2 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 transition">
                🗑️ Delete Permanently
              </button>
            ) : (
              <button onClick={() => setShowDeleteRequest((s) => !s)} className="rounded-lg border border-rose-300 dark:border-rose-800 px-4 py-2 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 transition">
                🗑️ Request Deletion
              </button>
            )}
          </>
        )}
      </div>

      {showDeleteRequest && user.role === 'admin' && (
        <form onSubmit={submitDeleteRequest} className="card mb-6 flex flex-col gap-3 border-rose-200 dark:border-rose-900">
          <p className="text-sm font-semibold text-navy-900 dark:text-white">Request deletion of {complaint.complaintId}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Only the Super Admin can perform the actual deletion. This sends a request for review.</p>
          {deleteRequestMsg && <p className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{deleteRequestMsg}</p>}
          <textarea required rows={2} placeholder="Reason for deletion..." value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} className="input" />
          <button type="submit" disabled={deleteRequestSaving} className="self-start rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition disabled:opacity-50">
            {deleteRequestSaving ? 'Sending...' : 'Submit Request'}
          </button>
        </form>
      )}

      {editing && isAdminTier && editForm && (
        <form onSubmit={saveEdit} className="card mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <p className="sm:col-span-2 text-xs text-slate-500 dark:text-slate-400">
            {user.role === 'super_admin'
              ? 'You can edit any field on any complaint, at any status. Every edit is recorded in the audit trail.'
              : 'You cannot edit a complaint directly — this proposes a change that the Super Admin must approve before it takes effect.'}
          </p>
          {editMsg && <p className="sm:col-span-2 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{editMsg}</p>}
          <div className="sm:col-span-2">
            <label className="label">Title</label>
            <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="input mt-1" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Description</label>
            <textarea rows={3} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="input mt-1" />
          </div>
          <div>
            <label className="label">Category</label>
            <input value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="input mt-1" />
          </div>
          <div>
            <label className="label">Priority</label>
            <select value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })} className="input mt-1">
              {['Low', 'Medium', 'High', 'Critical'].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <StateDistrictSelect
            state={editForm.state}
            district={editForm.district}
            onChange={({ state, district }) => setEditForm({ ...editForm, state, district })}
          />
          <div className="sm:col-span-2">
            <label className="label">Location</label>
            <input value={editForm.location || ''} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className="input mt-1" />
          </div>
          {user.role === 'admin' && (
            <div className="sm:col-span-2">
              <label className="label">Reason for this change *</label>
              <textarea required rows={2} value={editReason} onChange={(e) => setEditReason(e.target.value)} className="input mt-1" placeholder="e.g. Citizen called to correct the address" />
            </div>
          )}
          <button type="submit" disabled={editSaving} className="sm:col-span-2 rounded-lg bg-gradient-to-r from-purple-700 to-navy-900 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-50">
            {editSaving ? 'Saving...' : user.role === 'super_admin' ? 'Save Changes' : 'Submit for Super Admin Approval'}
          </button>
        </form>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="card">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-navy-900 dark:text-white">Complaint Overview</h2>
              <StatusBadge status={complaint.status} />
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{complaint.description}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm dark:text-slate-300">
              <p><span className="text-slate-400">Department:</span> {complaint.department?.name}</p>
              <p><span className="text-slate-400">Category:</span> {complaint.category}</p>
              <p><span className="text-slate-400">Priority:</span> {complaint.priority}</p>
              <p><span className="text-slate-400">Citizen:</span>{' '}
                {complaint.anonymous && user.role !== 'super_admin' ? 'Anonymous' : complaint.citizen?.name}
                {complaint.anonymous && user.role === 'super_admin' && (
                  <span className="ml-2 rounded-full bg-rose-100 dark:bg-rose-950 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:text-rose-300">
                    Filed anonymously — visible only to you
                  </span>
                )}
                {complaint.citizen?.phone && (isAdminTier || isAssignedToMe) && !complaint.anonymous && (
                  <span className="text-slate-400"> · {complaint.citizen.phone}</span>
                )}
              </p>
              <p><span className="text-slate-400">Location:</span> {complaint.location || '-'}, {complaint.district}, {complaint.state}</p>
              <p><span className="text-slate-400">Filed on:</span> {new Date(complaint.createdAt).toLocaleString()}</p>
              <p className="col-span-2">
                <span className="text-slate-400">Assigned Officer:</span>{' '}
                {complaint.assignedOfficer?.name ? (
                  <span className="font-semibold text-teal-700 dark:text-teal-300">{complaint.assignedOfficer.name} ({complaint.assignedOfficer.employeeId})</span>
                ) : (
                  <span className="italic text-slate-400">Not yet assigned</span>
                )}
              </p>
            </div>
            {complaint.images?.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Attached Files / Images</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {complaint.images.map((img, i) => (
                    <a key={i} href={img} target="_blank" rel="noreferrer">
                      <img src={img} alt="evidence" className="h-20 w-20 rounded-lg object-cover border border-slate-200 dark:border-slate-700 hover:opacity-80 transition" />
                    </a>
                  ))}
                </div>
              </div>
            )}
            {complaint.resolutionImages?.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Resolution Proof</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {complaint.resolutionImages.map((img, i) => (
                    <a key={i} href={img} target="_blank" rel="noreferrer">
                      <img src={img} alt="resolution" className="h-20 w-20 rounded-lg object-cover border border-slate-200 dark:border-slate-700 hover:opacity-80 transition" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Citizen: clean, non-confusing lifecycle only — never the raw internal history. */}
          {user.role === 'citizen' && complaint.citizenTimeline && (() => {
            const steps = complaint.citizenTimeline.steps;
            const doneCount = steps.filter((x) => x.done).length;
            const pct = complaint.citizenTimeline.currentStatus === 'Rejected' ? 100 : Math.round(((doneCount - 1) / (steps.length - 1)) * 100);
            return (
              <div className="card">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-bold text-navy-900 dark:text-white">Track your complaint</h2>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{pct}% complete</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div className={`h-full rounded-full transition-all ${complaint.status === 'Rejected' ? 'bg-rose-500' : 'bg-gradient-to-r from-accent-500 to-emerald-500'}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Filed {new Date(complaint.createdAt).toLocaleDateString()} · Last update {new Date(complaint.updatedAt).toLocaleString()}
                </p>
                {complaint.status === 'Resolved' && <div className="mt-4"><AutoCloseNotice autoCloseAt={complaint.autoCloseAt} hours={complaint.autoCloseHours} /></div>}
                {complaint.status === 'Closed' && complaint.autoClosed && (
                  <p className="mt-4 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">This complaint was closed automatically {complaint.autoCloseHours} hours after it was resolved.</p>
                )}
                <ol className="mt-5 flex flex-col gap-4 border-l border-slate-200 dark:border-slate-800 pl-4">
                  {steps.map((st, i) => (
                    <li key={i} className="relative">
                      <span className={`absolute -left-[21px] top-1 h-3 w-3 rounded-full ${st.done ? (st.isTerminalNegative ? 'bg-rose-500' : 'bg-accent-500') : 'bg-slate-300 dark:bg-slate-700'}`} />
                      <p className={`text-sm font-semibold ${st.done ? 'text-navy-900 dark:text-white' : 'text-slate-400'}`}>
                        {st.label} {st.current && <span className="ml-1 rounded-full bg-accent-100 dark:bg-accent-950 px-2 py-0.5 text-[10px] font-semibold text-accent-700 dark:text-accent-300">Current</span>}
                      </p>
                      {st.reachedAt && <p className="text-xs text-slate-400">{new Date(st.reachedAt).toLocaleString()}</p>}
                    </li>
                  ))}
                </ol>
              </div>
            );
          })()}

          {/* Officer / Admin: see the same auto-close countdown on resolved complaints. */}
          {user.role !== 'citizen' && complaint.status === 'Resolved' && (
            <AutoCloseNotice autoCloseAt={complaint.autoCloseAt} hours={complaint.autoCloseHours} audience="staff" />
          )}

          {/* Officer/Admin/Super Admin: full or trimmed internal audit history. */}
          {user.role !== 'citizen' && (
            <div className="card">
              <h2 className="font-display font-bold text-navy-900 dark:text-white">
                {isAdminTier ? 'Complete Internal History' : 'History'}
              </h2>
              <ol className="mt-4 flex flex-col gap-4 border-l border-slate-200 dark:border-slate-800 pl-4">
                {complaint.history?.map((h, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-accent-500" />
                    <p className="text-sm font-semibold text-navy-900 dark:text-white">
                      {actionTypeLabel[h.actionType] || h.status}
                      {h.previousStatus && h.actionType === 'StatusBackApproved' && (
                        <span className="ml-2 text-xs font-normal text-slate-400">{h.previousStatus} → {h.status}</span>
                      )}
                    </p>
                    {h.remarks && <p className="text-sm text-slate-500 dark:text-slate-400">{h.remarks}</p>}
                    {h.reason && <p className="text-xs text-slate-400 italic">Reason: {h.reason}</p>}
                    <p className="text-xs text-slate-400">
                      {h.updatedBy?.name ? `${h.updatedBy.name} (${h.updatedByRole})` : h.updatedByRole} · {new Date(h.updatedAt).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          {/* Citizen: two ways to get help — the handling officer, or the department helpline. */}
          {user.role === 'citizen' && <ComplaintHelpPanel complaint={complaint} />}

          {/* Assigned officer: report a fake / false complaint (goes to the admins). */}
          {isAssignedToMe && <ReportFalseComplaint complaint={complaint} onDone={load} />}
          {user.role !== 'citizen' && complaint.flaggedFalse && !isAssignedToMe && (
            <div className="rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950 px-4 py-3 text-sm text-rose-800 dark:text-rose-300">
              🚩 An officer reported this complaint as false / fake. {isAdminTier && <Link className="font-semibold underline" to={user.role === 'super_admin' ? '/super-admin/false-complaints' : '/admin/false-complaints'}>Review it →</Link>}
            </div>
          )}

          {/* The assigned officer (and admins, for oversight) talk to the citizen here. */}
          {(isAssignedToMe || isAdminTier) && complaint.assignedOfficer && (
            <ComplaintChat complaintId={complaint._id} title={isAssignedToMe ? 'Chat with citizen' : 'Citizen ↔ officer chat'} />
          )}

          {isAdminTier && (
            <div className="card h-fit">
              <h2 className="font-display font-bold text-navy-900 dark:text-white">Assign to Officer</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Officers can only act on complaints assigned to them — this power belongs to Admin/Super Admin only.
              </p>
              <p className="mt-2 rounded-lg bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                📍 Complaint location: <strong>{[complaint.district, complaint.state].filter(Boolean).join(', ') || 'not specified'}</strong>.
                Only officers of this department whose <strong>scope covers this location</strong> are listed.
              </p>
              <form onSubmit={assignOfficer} className="mt-4 flex flex-col gap-3">
                {assignMsg && <p className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{assignMsg}</p>}
                <select value={selectedOfficer} onChange={(e) => setSelectedOfficer(e.target.value)} className="input">
                  <option value="">{officers.length ? 'Select an officer in scope' : 'No officer in scope for this location'}</option>
                  {officers.map((o) => <option key={o._id} value={o._id}>{o.name} ({o.employeeId}) — {scopeLabel(o.scopeState, o.scopeDistrict)}</option>)}
                </select>
                {officers.length === 0 && (
                  <p className="rounded-lg bg-amber-50 dark:bg-amber-950 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                    No active officer covers {[complaint.district, complaint.state].filter(Boolean).join(', ') || 'this location'}. Widen an officer's scope (Officers → Edit scope) or add one for this area.
                  </p>
                )}
                <button type="submit" disabled={assigning || !selectedOfficer}
                  className="rounded-lg bg-gradient-to-r from-purple-700 to-navy-900 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-50">
                  {assigning ? 'Assigning...' : complaint.assignedOfficer ? 'Reassign Officer' : 'Assign Officer'}
                </button>
              </form>
            </div>
          )}

          {canUpdate ? (
            <div className="card h-fit">
              <h2 className="font-display font-bold text-navy-900 dark:text-white">Update Status</h2>
              {statusOptions.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                  {complaint.status === 'Pending' && !complaint.assignedOfficer
                    ? 'Assign an officer above to start processing this complaint.'
                    : `This complaint is at "${complaint.status}" — no further forward moves apply.`}
                </p>
              ) : (
                <form onSubmit={updateStatus} className="mt-4 flex flex-col gap-3">
                  {msg && <p className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{msg}</p>}
                  <div>
                    <label className="label">Move to</label>
                    <select value={chosenStatus} onChange={(e) => setStatus(e.target.value)} className="input mt-1">
                      {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <p className="mt-1 text-xs text-slate-400">
                      Currently <strong>{complaint.status}</strong>. {user.role === 'officer' ? 'Move it forward step by step; to go back, raise a Status Change Request below.' : 'Choose the next status and save.'}
                    </p>
                  </div>
                  <div>
                    <label className="label">Remarks</label>
                    <textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} className="input" />
                  </div>
                  <div>
                    <label className="label">Upload Proof (optional)</label>
                    <input type="file" accept="image/*" multiple onChange={(e) => setResolutionImages(Array.from(e.target.files).slice(0, 5))}
                      className="mt-1 w-full text-sm dark:text-slate-300" />
                  </div>
                  <button type="submit" disabled={saving}
                    className="mt-1 rounded-lg bg-navy-900 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 transition disabled:opacity-60">
                    {saving ? 'Saving...' : 'Save Update'}
                  </button>
                </form>
              )}
            </div>
          ) : user.role === 'officer' ? (
            <div className="card h-fit">
              <h2 className="font-display font-bold text-navy-900 dark:text-white">Update Status</h2>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                This complaint has not been assigned to you by the admin yet. You'll be able to act on it once assigned.
              </p>
            </div>
          ) : null}

          {user.role === 'officer' && isAssignedToMe && backwardOptions.length > 0 && (
            <div className="card h-fit">
              <h2 className="font-display font-bold text-navy-900 dark:text-white">Request Status Rollback</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Need to move this complaint back to an earlier stage (e.g. reopen a Resolved complaint)? Request it here — an Admin must approve it.
              </p>
              {!showBackRequest ? (
                <button onClick={() => setShowBackRequest(true)} disabled={hasPendingBackRequest}
                  className="mt-4 w-full rounded-lg border border-amber-400 text-amber-700 dark:text-amber-300 py-2.5 text-sm font-semibold hover:bg-amber-50 dark:hover:bg-amber-950 transition disabled:opacity-50">
                  {hasPendingBackRequest ? 'Request already pending' : '↩️ Request Backward Status Change'}
                </button>
              ) : (
                <form onSubmit={requestBackward} className="mt-4 flex flex-col gap-3">
                  {backMsg && <p className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{backMsg}</p>}
                  <select required value={backTarget} onChange={(e) => setBackTarget(e.target.value)} className="input">
                    <option value="">Move back to...</option>
                    {backwardOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <textarea required rows={2} placeholder="Reason for the rollback..." value={backReason} onChange={(e) => setBackReason(e.target.value)} className="input" />
                  <button type="submit" disabled={backSaving} className="rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition disabled:opacity-50">
                    {backSaving ? 'Sending...' : 'Send to Admin for Approval'}
                  </button>
                </form>
              )}
            </div>
          )}

          {user.role === 'officer' && isAssignedToMe && (
            <div className="card h-fit">
              <h2 className="font-display font-bold text-navy-900 dark:text-white">Escalate to Admin</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Need admin oversight — reassignment, rejection, or closure? Flag it here.
              </p>
              <form onSubmit={escalate} className="mt-4 flex flex-col gap-3">
                {escalateMsg && <p className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{escalateMsg}</p>}
                <textarea rows={2} required placeholder="Reason for escalation..." value={escalateNote} onChange={(e) => setEscalateNote(e.target.value)} className="input" />
                <button type="submit" disabled={escalating} className="rounded-lg border border-amber-400 text-amber-700 dark:text-amber-300 py-2.5 text-sm font-semibold hover:bg-amber-50 dark:hover:bg-amber-950 transition disabled:opacity-50">
                  {escalating ? 'Sending...' : '🚩 Escalate to Admin'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ComplaintDetails;
