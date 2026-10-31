import React from 'react';
import useStatesDistricts from '../hooks/useStatesDistricts';

// Visibility scope of an officer, chosen from dropdowns (never typed):
//   nothing selected          -> whole department
//   state only                -> every complaint from that state
//   state + district          -> only complaints from that district
// An officer is only offered a complaint — and can only see it — when their
// scope covers the place the complaint was filed from.
export const scopeLabel = (state, district) => {
  if (state && district) return `${district}, ${state}`;
  if (state) return `${state} (state-wide)`;
  return 'Whole department';
};

const ScopePicker = ({ scopeState, scopeDistrict, onChange, compact = false }) => {
  const { states, districtsFor, loading } = useStatesDistricts();
  const districts = districtsFor(scopeState);

  return (
    <div className="sm:col-span-2 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Visibility scope (optional)</p>
        {(scopeState || scopeDistrict) && (
          <button type="button" onClick={() => onChange({ scopeState: '', scopeDistrict: '' })} className="text-[11px] font-semibold text-accent-500 hover:underline">Clear → whole department</button>
        )}
      </div>
      <div className={`mt-2 grid gap-2 ${compact ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
        <select value={scopeState || ''} disabled={loading} onChange={(e) => onChange({ scopeState: e.target.value, scopeDistrict: '' })} className="input">
          <option value="">{loading ? 'Loading…' : 'Whole department (all states)'}</option>
          {states.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={scopeDistrict || ''} disabled={!scopeState} onChange={(e) => onChange({ scopeState, scopeDistrict: e.target.value })} className="input">
          <option value="">{scopeState ? `All districts of ${scopeState}` : 'Pick a state first'}</option>
          {districts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
        Scope: <strong>{scopeLabel(scopeState, scopeDistrict)}</strong>. The officer only sees, and is only offered, complaints from this area
        — e.g. an officer scoped to Central Delhi is not offered a complaint from New Delhi.
      </p>
    </div>
  );
};

export default ScopePicker;
