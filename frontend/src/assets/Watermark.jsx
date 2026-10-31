import React from 'react';

// A generic domed-government-building silhouette + faint wheel motif, drawn
// as SVG so it renders as a subtle background watermark with zero external
// image dependencies (works fully offline, no copyright concerns).
const Watermark = ({ opacity = 0.06, className = '' }) => (
  <svg
    viewBox="0 0 800 300"
    className={`pointer-events-none select-none ${className}`}
    style={{ opacity }}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Central dome */}
    <circle cx="400" cy="120" r="55" fill="currentColor" />
    <rect x="380" y="60" width="40" height="40" fill="none" />
    <rect x="392" y="40" width="16" height="30" fill="currentColor" />
    <circle cx="400" cy="35" r="6" fill="currentColor" />
    {/* Base building */}
    <rect x="150" y="150" width="500" height="110" fill="currentColor" />
    {/* Columns */}
    {Array.from({ length: 14 }).map((_, i) => (
      <rect key={i} x={170 + i * 34} y="160" width="12" height="90" fill="#ffffff" opacity="0.5" />
    ))}
    {/* Side domes */}
    <circle cx="230" cy="145" r="28" fill="currentColor" />
    <circle cx="570" cy="145" r="28" fill="currentColor" />
    {/* Steps */}
    <rect x="120" y="260" width="560" height="14" fill="currentColor" />
    <rect x="100" y="274" width="600" height="14" fill="currentColor" />
    {/* Wheel motif beneath */}
    <g transform="translate(400,120)" stroke="currentColor" strokeWidth="1.5" opacity="0.4">
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i * 360) / 24;
        const rad = (angle * Math.PI) / 180;
        const x1 = 16 * Math.cos(rad);
        const y1 = 16 * Math.sin(rad);
        const x2 = 26 * Math.cos(rad);
        const y2 = 26 * Math.sin(rad);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}
    </g>
  </svg>
);

export default Watermark;
