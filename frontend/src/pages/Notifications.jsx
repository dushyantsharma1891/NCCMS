import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import api from '../api/axios';

const Notifications = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => api.get('/notifications').then((res) => setItems(res.data)).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    load();
  };

  return (
    <DashboardLayout title="Notifications" subtitle="Stay updated on your complaint activity.">
      <div className="mb-4 flex justify-end">
        <button onClick={markAllRead} className="text-sm font-semibold text-accent-500 hover:underline">Mark all as read</button>
      </div>
      <div className="card">
        {loading ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p> : items.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">No notifications yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((n) => (
              <li key={n._id} className={`py-3 ${!n.read ? 'bg-blue-50/40 -mx-5 px-5' : ''}`}>
                <p className="text-sm font-semibold text-navy-900 dark:text-white">{n.title}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{n.message}</p>
                <p className="mt-1 text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Notifications;
