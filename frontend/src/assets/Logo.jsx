import React from 'react';

// A self-contained SVG emblem for the portal — a laurel-ringed 24-spoke wheel,
// echoing the wheel motif on the national flag, drawn from scratch (not a
// reproduction of any copyrighted artwork/photograph) so the whole app works
// fully offline with no external image dependency.
const Logo = ({ size = 36, className = '' }) => {
  const spokes = Array.from({ length: 24 });
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="47" fill="#0f2044" stroke="#c9a227" strokeWidth="2" />
      <circle cx="50" cy="50" r="40" fill="none" stroke="#c9a227" strokeWidth="1.2" opacity="0.6" />
      <g stroke="#c9a227" strokeWidth="1.4">
        {spokes.map((_, i) => {
          const angle = (i * 360) / 24;
          const rad = (angle * Math.PI) / 180;
          const x1 = 50 + 8 * Math.cos(rad);
          const y1 = 50 + 8 * Math.sin(rad);
          const x2 = 50 + 33 * Math.cos(rad);
          const y2 = 50 + 33 * Math.sin(rad);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
      </g>
      <circle cx="50" cy="50" r="8" fill="#c9a227" />
      <circle cx="50" cy="50" r="33" fill="none" stroke="#c9a227" strokeWidth="1.6" />
    </svg>
  );
};

export default Logo;
