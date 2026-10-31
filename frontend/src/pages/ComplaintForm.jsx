import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import StateDistrictSelect from '../components/StateDistrictSelect';
import api from '../api/axios';

const ComplaintForm = () => {
  const [searchParams] = useSearchParams();
  const preselectedDept = searchParams.get('department') || '';
  const preselectedName = searchParams.get('name') || '';
  const aiTitle = searchParams.get('title') || '';
  const aiDescription = searchParams.get('description') || '';
  const aiCategory = searchParams.get('category') || '';
  const aiPriority = searchParams.get('priority') || '';
  const fromAI = !!(aiTitle || aiDescription);

  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    title: aiTitle, description: aiDescription, department: preselectedDept, category: aiCategory,
    priority: aiPriority || 'Medium',
    state: '', district: '', location: '', officeBranch: '', anonymous: false,
  });
  const [images, setImages] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/departments').then((res) => setDepartments(res.data));
    api.get('/departments/categories').then((res) => setCategories(res.data));
  }, []);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const selectedDept = departments.find((d) => d._id === form.department);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => data.append(k, v));
      images.forEach((img) => data.append('images', img));

      const { data: complaint } = await api.post('/complaints/create', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess(`Complaint submitted successfully. Your Complaint ID is ${complaint.complaintId}`);
      setTimeout(() => navigate(`/complaints/${complaint._id}`), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit complaint');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="File a Complaint" subtitle="Provide accurate details for faster resolution.">
      <form onSubmit={submit} className="card max-w-3xl grid grid-cols-1 gap-4 sm:grid-cols-2">
        {error && <p className="sm:col-span-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">{error}</p>}
        {success && <p className="sm:col-span-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{success}</p>}
        {preselectedName && !success && (
          <p className="sm:col-span-2 rounded-lg bg-blue-50 dark:bg-blue-950 px-3 py-2 text-sm text-blue-700 dark:text-blue-300">
            Filing against <strong>{preselectedName}</strong> — change the department below if needed.
          </p>
        )}
        {fromAI && !success && (
          <p className="sm:col-span-2 rounded-lg bg-violet-50 dark:bg-violet-950 px-3 py-2 text-sm text-violet-700 dark:text-violet-300">
            ✨ Pre-filled from the AI Complaint Assistant. Please review and edit anything before submitting — nothing has been sent yet.
          </p>
        )}

        <div className="sm:col-span-2">
          <label className="label">Complaint Title *</label>
          <input required value={form.title} onChange={update('title')} className="input mt-1" />
        </div>

        <div className="sm:col-span-2">
          <label className="label">Description *</label>
          <textarea required rows={4} value={form.description} onChange={update('description')} className="input mt-1" />
        </div>

        <div>
          <label className="label">Department *</label>
          <select required value={form.department} onChange={update('department')} className="input mt-1">
            <option value="">Select department</option>
            {departments.map((d) => <option key={d._id} value={d._id}>{d.name} ({d.type})</option>)}
          </select>
        </div>

        <div>
          <label className="label">Category *</label>
          <select required value={form.category} onChange={update('category')} className="input mt-1">
            <option value="">Select category</option>
            {categories.map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}
          </select>
        </div>

        {selectedDept?.hasMultipleOffices && (
          <div className="sm:col-span-2">
            <label className="label">Which branch / office? *</label>
            <input
              required value={form.officeBranch} onChange={update('officeBranch')} className="input mt-1"
              placeholder={`e.g. ${selectedDept.name} - MG Road Branch, Sector 14`}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              {selectedDept.name} has many branches/offices — tell us which one this complaint is about.
            </p>
          </div>
        )}

        <div>
          <label className="label">Priority</label>
          <select value={form.priority} onChange={update('priority')} className="input mt-1">
            {['Low', 'Medium', 'High', 'Critical'].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <StateDistrictSelect
          state={form.state}
          district={form.district}
          onChange={({ state, district }) => setForm({ ...form, state, district })}
        />

        <div className="sm:col-span-2">
          <label className="label">Location / Address</label>
          <input value={form.location} onChange={update('location')} className="input mt-1" />
        </div>

        <div className="sm:col-span-2">
          <label className="label">Upload Images (max 5)</label>
          <input type="file" accept="image/*" multiple onChange={(e) => setImages(Array.from(e.target.files).slice(0, 5))}
            className="mt-1 w-full text-sm dark:text-slate-300" />
        </div>

        <label className="sm:col-span-2 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" checked={form.anonymous} onChange={(e) => setForm({ ...form, anonymous: e.target.checked })} />
          Submit anonymously
        </label>

        <button type="submit" disabled={loading}
          className="sm:col-span-2 mt-2 rounded-lg bg-navy-900 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 transition disabled:opacity-60">
          {loading ? 'Submitting...' : 'Submit Complaint'}
        </button>
      </form>
    </DashboardLayout>
  );
};

export default ComplaintForm;
