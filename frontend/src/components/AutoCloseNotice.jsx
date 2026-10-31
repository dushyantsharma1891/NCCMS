import React, { useEffect, useState } from 'react';

const fmt = (ms) => {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${m}m`;
};

// "Auto-closes in 41h 12m" banner for a Resolved complaint.
const AutoCloseNotice = ({ autoCloseAt, hours = 42, audience = 'citizen' }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  if (!autoCloseAt) return null;
  const left = new Date(autoCloseAt).getTime() - now;
  return (
    <div className="rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-200">
      <p className="font-semibold">✅ Marked as resolved</p>
      <p className="mt-0.5 text-xs">
        {left > 0
          ? <>It will close automatically in <strong>{fmt(left)}</strong> ({hours} hours after resolution). {audience === 'citizen' ? 'If the problem is not actually fixed, tell the officer in the chat before then.' : 'Citizens can still reply until then.'}</>
          : 'This complaint is due to be closed automatically any moment now.'}
      </p>
    </div>
  );
};

export default AutoCloseNotice;
