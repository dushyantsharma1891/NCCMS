import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import api from '../api/axios';

const confidenceColor = {
  High: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  Medium: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  Low: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

const AIAssistant = () => {
  const [description, setDescription] = useState('');
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const analyze = async (e) => {
    e.preventDefault();
    setError('');
    setSuggestion(null);
    setLoading(true);
    try {
      const { data } = await api.post('/ai/suggest', { description });
      setSuggestion(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not analyze your description');
    } finally {
      setLoading(false);
    }
  };

  // The AI recommendation NEVER submits a complaint by itself — it only
  // hands off pre-filled values to the normal complaint form, where the
  // citizen must still review, edit and explicitly submit.
  const createWithSuggestion = () => {
    if (!suggestion) return;
    const params = new URLSearchParams({
      title: suggestion.suggestedTitle || '',
      description: suggestion.suggestedDescription || description,
      category: suggestion.recommendedCategory || '',
      priority: suggestion.recommendedPriority || 'Medium',
    });
    if (suggestion.recommendedDepartment?._id) {
      params.set('department', suggestion.recommendedDepartment._id);
      params.set('name', suggestion.recommendedDepartment.name);
    }
    navigate(`/complaints/new?${params.toString()}`);
  };

  return (
    <DashboardLayout title="AI Complaint Assistant" subtitle="Describe your problem in your own words — the assistant will suggest the right department, category and priority.">
      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={analyze} className="card h-fit">
          {error && <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">{error}</p>}
          <label className="label">What happened?</label>
          <textarea
            required rows={6} value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder='e.g. "Road outside my house has been damaged for three months and water collects there."'
            className="input mt-1"
          />
          <button type="submit" disabled={loading}
            className="mt-4 w-full rounded-lg bg-navy-900 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 transition disabled:opacity-60">
            {loading ? 'Analyzing...' : '✨ Analyze My Problem'}
          </button>
          <p className="mt-3 text-xs text-slate-400">
            This is an automated assistant, not a government officer, and cannot take official action or submit anything for you.
          </p>
        </form>

        <div className="card h-fit">
          <h2 className="font-display font-bold text-navy-900 dark:text-white">Recommendation</h2>
          {!suggestion ? (
            <p className="mt-3 text-sm text-slate-400">Your recommendation will appear here after you describe the problem.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                <p><span className="text-slate-400">Recommended Department:</span>{' '}
                  <span className="font-semibold text-navy-900 dark:text-white">{suggestion.recommendedDepartment?.name || 'Could not determine — please choose manually'}</span>
                </p>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${confidenceColor[suggestion.confidence]}`}>
                  Confidence: {suggestion.confidence}
                </span>
              </div>
              <p><span className="text-slate-400">Suggested Category:</span> <span className="font-semibold dark:text-slate-200">{suggestion.recommendedCategory}</span></p>
              <p><span className="text-slate-400">Suggested Priority:</span> <span className="font-semibold dark:text-slate-200">{suggestion.recommendedPriority}</span></p>
              <p><span className="text-slate-400">Suggested Title:</span> <span className="font-semibold dark:text-slate-200">{suggestion.suggestedTitle}</span></p>
              {suggestion.missingInfo?.length > 0 && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                  <p className="font-semibold">You might want to add:</p>
                  <ul className="mt-1 list-disc pl-4">
                    {suggestion.missingInfo.map((m) => <li key={m}>{m}</li>)}
                  </ul>
                </div>
              )}
              <p className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-500 dark:text-slate-400">{suggestion.disclaimer}</p>
              <button onClick={createWithSuggestion}
                className="mt-2 rounded-lg bg-accent-500 py-2.5 text-sm font-semibold text-white hover:bg-accent-600 transition">
                Create Complaint With This Suggestion →
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AIAssistant;
