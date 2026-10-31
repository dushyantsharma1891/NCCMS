const statesDistricts = require('../data/statesDistricts');

const norm = (v) => String(v || '').trim().toLowerCase();

// An officer's scope decides which complaints they may see, be assigned and
// act on, by where the complaint was filed:
//   no scope            -> the whole department (every state)
//   scopeState only     -> every complaint from that state
//   scopeState+District -> only complaints from that district of that state
// Example: a complaint from "New Delhi, Delhi" is NOT covered by an officer
// scoped to "Central Delhi", but IS covered by an officer scoped to the state
// of Delhi or to the whole department.
const officerCoversLocation = (officer, state, district) => {
  const sState = norm(officer.scopeState);
  const sDistrict = norm(officer.scopeDistrict);
  if (!sState && !sDistrict) return true;
  if (sDistrict) {
    // District names repeat across states, so the state must match too.
    if (sState && norm(state) !== sState) return false;
    return norm(district) === sDistrict;
  }
  return norm(state) === sState;
};

const officerCoversComplaint = (officer, complaint) =>
  officerCoversLocation(officer, complaint.state, complaint.district);

const describeScope = (obj) => {
  const st = obj.scopeState || obj.state;
  const di = obj.scopeDistrict || obj.district;
  if (obj.scopeDistrict) return `${obj.scopeDistrict}${obj.scopeState ? `, ${obj.scopeState}` : ''}`;
  if (obj.scopeState) return `${obj.scopeState} (state-wide)`;
  return st && di ? `${di}, ${st}` : (st || di || 'Whole department');
};

// Validates a scope chosen in a form. Returns { error } or { scopeState, scopeDistrict }.
const validateScope = (scopeState, scopeDistrict) => {
  const state = String(scopeState || '').trim();
  const district = String(scopeDistrict || '').trim();
  if (!state && !district) return { scopeState: '', scopeDistrict: '' };
  if (district && !state) return { error: 'Choose a state before choosing a district for the visibility scope' };
  const list = statesDistricts[state];
  if (!list) return { error: `"${state}" is not a recognised state` };
  if (district && !list.includes(district)) return { error: `"${district}" is not a district of ${state}` };
  return { scopeState: state, scopeDistrict: district };
};

module.exports = { officerCoversLocation, officerCoversComplaint, describeScope, validateScope };
