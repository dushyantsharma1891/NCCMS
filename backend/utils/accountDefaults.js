const crypto = require('crypto');

// When an Admin / Super Admin creates an account they should not be forced to
// invent a name, e-mail or password on the spot. Anything left blank gets a
// safe, unique default; the person is told exactly what was generated, and a
// generated password must be changed at first login.

const generateTempPassword = () => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '@#$%&*';
  const pick = (set) => set[crypto.randomInt(set.length)];
  const all = upper + lower + digits + symbols;
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  while (chars.length < 10) chars.push(pick(all));
  return chars.sort(() => crypto.randomInt(3) - 1).join('');
};

const clean = (v) => (typeof v === 'string' ? v.trim() : v);

// label: 'Officer' | 'Admin' | 'Citizen'; id: the auto-generated ID (POL-0001…)
const applyAccountDefaults = ({ name, email, password }, label, id) => {
  const out = { name: clean(name), email: clean(email), password: clean(password), generated: {} };
  if (!out.name) { out.name = `${label} ${id}`; out.generated.name = true; }
  if (!out.email) { out.email = `${String(id).toLowerCase()}@nccms.gov.in`; out.generated.email = true; }
  else out.email = out.email.toLowerCase();
  if (!out.password) { out.password = generateTempPassword(); out.generated.password = true; }
  return out;
};

module.exports = { generateTempPassword, applyAccountDefaults };
