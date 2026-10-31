import React from 'react';
import useStatesDistricts from '../hooks/useStatesDistricts';

// Dependent State -> District dropdown pair. Selecting a state filters the
// district list to only that state's districts (and clears district if it
// no longer belongs to the new state).
const StateDistrictSelect = ({ state, district, onChange, required }) => {
  const { states, districtsFor, loading } = useStatesDistricts();
  const districts = districtsFor(state);

  const handleState = (e) => {
    const nextState = e.target.value;
    onChange({ state: nextState, district: '' });
  };

  const handleDistrict = (e) => onChange({ state, district: e.target.value });

  return (
    <>
      <div>
        <label className="label">State{required && ' *'}</label>
        <select required={required} value={state || ''} onChange={handleState} className="input mt-1" disabled={loading}>
          <option value="">{loading ? 'Loading...' : 'Select state'}</option>
          {states.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className="label">District{required && ' *'}</label>
        <select required={required} value={district || ''} onChange={handleDistrict} className="input mt-1" disabled={!state}>
          <option value="">{state ? 'Select district' : 'Select state first'}</option>
          {districts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
    </>
  );
};

export default StateDistrictSelect;
