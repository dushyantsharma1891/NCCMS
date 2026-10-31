import React, { useEffect, useRef, useState } from 'react';

const EyeIcon = ({ open }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    {open ? (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12S5.5 5 12 5s9.5 7 9.5 7-3 7-9.5 7S2.5 12 2.5 12z" />
        <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.3 5.3A9.9 9.9 0 0112 5c6.5 0 9.5 7 9.5 7a13.2 13.2 0 01-2.3 3.3M6.5 6.6C4 8.4 2.5 12 2.5 12a13.4 13.4 0 004.2 5.1A9.9 9.9 0 0012 19c1 0 1.9-.1 2.8-.4" />
    )}
  </svg>
);

// Drop-in replacement for <input type="password"> with a Show/Hide toggle.
// `customError` lets a parent block form submission with a native message
// (used for "passwords do not match").
const PasswordInput = ({ className = '', value, onChange, placeholder, required, autoComplete, id, name, minLength, customError = '' }) => {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) ref.current.setCustomValidity(customError || '');
  }, [customError, value]);

  return (
    <div className="relative">
      <input
        ref={ref}
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className={`${className} pr-16`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
        aria-label={visible ? 'Hide password' : 'Show password'}
        title={visible ? 'Hide password' : 'Show password'}
      >
        <EyeIcon open={visible} />
      </button>
    </div>
  );
};

const StrengthMeter = ({ value }) => {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
  const colors = ['bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500', 'bg-emerald-600'];
  return (
    <div className="mt-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => <span key={i} className={`h-1 flex-1 rounded-full ${i < score ? colors[score] : 'bg-slate-200 dark:bg-slate-700'}`} />)}
      </div>
      <p className="mt-1 text-[11px] text-slate-400">Strength: {labels[score]}</p>
    </div>
  );
};

// Password + "Re-enter password" pair, used on every form that CREATES or
// CHANGES a password. Blocks submission until both match.
export const PasswordPair = ({
  password, confirm, onPassword, onConfirm, required = true, label = 'Password',
  confirmLabel = 'Re-enter Password', hint, inputClass = 'input mt-1', wrapperClass = '',
}) => {
  const mismatch = confirm.length > 0 && password !== confirm;
  const needsConfirm = password.length > 0 && confirm !== password;
  return (
    <>
      <div className={wrapperClass}>
        <label className="label">{label}{required ? ' *' : ''}</label>
        <PasswordInput
          required={required} minLength={password ? 6 : undefined} value={password}
          onChange={(e) => onPassword(e.target.value)} className={inputClass} autoComplete="new-password"
          placeholder={required ? '' : 'Leave blank to auto-generate'}
        />
        {password.length > 0 && <StrengthMeter value={password} />}
        {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
      </div>
      <div className={wrapperClass}>
        <label className="label">{confirmLabel}{required ? ' *' : ''}</label>
        <PasswordInput
          required={required || password.length > 0} value={confirm} onChange={(e) => onConfirm(e.target.value)}
          className={inputClass} autoComplete="new-password"
          customError={needsConfirm ? 'Passwords do not match' : ''}
        />
        {confirm.length > 0 && (
          <p className={`mt-1 text-[11px] font-medium ${mismatch ? 'text-rose-500' : 'text-emerald-600'}`}>
            {mismatch ? '✗ Passwords do not match' : '✓ Passwords match'}
          </p>
        )}
      </div>
    </>
  );
};

// Shown once after an account is created with generated credentials.
export const GeneratedCredentials = ({ result, onDismiss }) => {
  if (!result) return null;
  const copy = (text) => navigator.clipboard?.writeText(text);
  const { id, name, email, tempPassword, generated = {} } = result;
  return (
    <div className="mb-6 rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950 dark:border-emerald-800 p-4 text-sm text-emerald-900 dark:text-emerald-200">
      <p className="font-semibold">Account created{id ? ` — ID ${id}` : ''}</p>
      <p className="mt-1">Name: <strong>{name}</strong>{generated.name && ' (auto-generated)'}</p>
      <p>Login email: <strong>{email}</strong>{generated.email && ' (auto-generated)'}</p>
      {tempPassword && (
        <p className="mt-1">
          Temporary password: <span className="font-mono font-bold">{tempPassword}</span>{' '}
          <button type="button" onClick={() => copy(tempPassword)} className="ml-1 rounded border border-emerald-400 px-2 py-0.5 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900">Copy</button>
          <span className="block text-xs opacity-80">Shown only once — share it securely. It must be changed at first login.</span>
        </p>
      )}
      <button type="button" onClick={onDismiss} className="mt-2 text-xs font-semibold underline">Dismiss</button>
    </div>
  );
};

export default PasswordInput;
