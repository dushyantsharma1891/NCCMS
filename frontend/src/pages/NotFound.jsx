import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-center px-6 transition-colors">
    <p className="font-display text-6xl font-black text-navy-900 dark:text-white">404</p>
    <p className="mt-2 text-slate-500 dark:text-slate-400">The page you're looking for doesn't exist.</p>
    <Link to="/" className="mt-6 rounded-lg bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 transition">
      Back to Home
    </Link>
  </div>
);

export default NotFound;
