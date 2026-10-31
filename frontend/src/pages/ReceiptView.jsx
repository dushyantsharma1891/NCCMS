import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import Logo from '../assets/Logo';
import Watermark from '../assets/Watermark';
import StatusBadge from '../components/StatusBadge';

// A standalone, print-optimized receipt — deliberately not wrapped in
// DashboardLayout so the navbar/sidebar never show up in a printout.
const ReceiptView = () => {
  const { id } = useParams();
  const [complaint, setComplaint] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/complaints/${id}`)
      .then((res) => setComplaint(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Unable to load complaint'));
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6 text-center">
        <div>
          <p className="text-rose-600 font-semibold">{error}</p>
          <Link to="/" className="mt-4 inline-block text-accent-500 hover:underline">Back to home</Link>
        </div>
      </div>
    );
  }

  if (!complaint) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Loading receipt...</div>;
  }

  const now = new Date();

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-3xl justify-between print:hidden">
        <Link to={`/complaints/${complaint._id}`} className="text-sm font-semibold text-slate-600 hover:underline">← Back to complaint</Link>
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-navy-900 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800 transition"
        >
          🖨️ Print Receipt
        </button>
      </div>

      <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border-2 border-navy-900 bg-white p-10 shadow-lg print:rounded-none print:border-black print:shadow-none">
        <Watermark className="absolute inset-0 h-full w-full text-navy-900" opacity={0.05} />

        <div className="relative">
          {/* Government-style header */}
          <div className="flex items-center justify-between border-b-2 border-navy-900 pb-4">
            <div className="flex items-center gap-3">
              <Logo size={54} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Government of India</p>
                <p className="font-display text-lg font-bold text-navy-900">Department of Public Grievances</p>
                <p className="text-xs text-slate-400">National Citizen Complaint Management System (NCCMS)</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Receipt generated</p>
              <p className="text-sm font-semibold text-navy-900">{now.toLocaleString()}</p>
            </div>
          </div>

          <h1 className="mt-6 text-center font-display text-xl font-bold uppercase tracking-wide text-navy-900">
            Complaint Acknowledgement Receipt
          </h1>

          <div className="mt-6 grid grid-cols-2 gap-y-3 text-sm">
            <p className="text-slate-500">Complaint ID</p>
            <p className="text-right font-mono font-bold text-navy-900">{complaint.complaintId}</p>

            <p className="text-slate-500">Title</p>
            <p className="text-right font-medium text-navy-900">{complaint.title}</p>

            <p className="text-slate-500">Department</p>
            <p className="text-right font-medium text-navy-900">{complaint.department?.name}</p>

            <p className="text-slate-500">Category</p>
            <p className="text-right font-medium text-navy-900">{complaint.category}</p>

            <p className="text-slate-500">Priority</p>
            <p className="text-right font-medium text-navy-900">{complaint.priority}</p>

            <p className="text-slate-500">Filed by</p>
            <p className="text-right font-medium text-navy-900">{complaint.anonymous ? 'Anonymous Citizen' : complaint.citizen?.name}</p>

            <p className="text-slate-500">Location</p>
            <p className="text-right font-medium text-navy-900">{complaint.location || '-'}, {complaint.district}, {complaint.state}</p>

            <p className="text-slate-500">Date Filed</p>
            <p className="text-right font-medium text-navy-900">{new Date(complaint.createdAt).toLocaleString()}</p>

            <p className="text-slate-500">Assigned Officer</p>
            <p className="text-right font-medium text-navy-900">{complaint.assignedOfficer?.name || 'Not yet assigned'}</p>

            <p className="text-slate-500">Current Status</p>
            <p className="text-right"><StatusBadge status={complaint.status} /></p>
          </div>

          <div className="mt-6 rounded-lg bg-slate-50 p-4 text-sm text-slate-600 print:bg-transparent print:border print:border-slate-300">
            <p className="font-semibold text-navy-900 mb-1">Description</p>
            {complaint.description}
          </div>

          {/* Digital signature / stamp block */}
          <div className="mt-10 flex items-end justify-between border-t border-dashed border-slate-300 pt-6">
            <div>
              <p className="text-xs text-slate-400">This is a system-generated receipt and does not require a physical signature.</p>
              <p className="mt-1 text-xs text-slate-400">Verify anytime at NCCMS → Track Complaint using the Complaint ID above.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-navy-900 text-navy-900">
                <Logo size={40} />
              </div>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-navy-900">Digitally Verified</p>
              <p className="text-[10px] text-slate-400">NCCMS · Dept. of Public Grievances</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptView;
