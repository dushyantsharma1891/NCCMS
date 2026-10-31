import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ChatAssistant from '../components/ChatAssistant';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const Departments = () => {
  const [departments, setDepartments] = useState([]);
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    api.get('/departments', { params: type ? { type } : {} })
      .then((res) => setDepartments(res.data))
      .finally(() => setLoading(false));
  }, [type]);

  const types = ['Central Government', 'State Government', 'Public Sector', 'Private Sector'];

  // Clicking a department card takes the citizen straight into the complaint
  // form with that department already selected. Non-citizens are routed to
  // login first (officers/admins don't file complaints).
  const handleSelect = (dept) => {
    if (!user) {
      navigate('/login', { state: { redirectTo: `/complaints/new?department=${dept._id}` } });
      return;
    }
    if (user.role !== 'citizen') return;
    navigate(`/complaints/new?department=${dept._id}&name=${encodeURIComponent(dept.name)}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <Navbar />
      <div className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="font-display text-2xl font-bold text-navy-900 dark:text-white">{t('dept.heading')}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('dept.sub')}</p>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => setType('')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${!type ? 'bg-navy-900 text-white' : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}
          >
            {t('dept.all')}
          </button>
          {types.map((tp) => (
            <button
              key={tp}
              onClick={() => setType(tp)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${type === tp ? 'bg-navy-900 text-white' : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}
            >
              {tp}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">{t('common.loading')}</p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {departments.map((d) => (
              <div key={d._id} className="card hover:shadow-md hover:-translate-y-0.5 transition">
                <div className="flex items-center gap-3">
                  {d.logo ? (
                    <img src={d.logo} alt={d.name} className="h-12 w-12 rounded-lg object-contain" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg font-bold text-slate-400">
                      {d.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-accent-500">{d.type}</p>
                    <h3 className="font-display font-bold text-navy-900 dark:text-white leading-tight">{d.name}</h3>
                  </div>
                </div>
                {d.sector && <p className="mt-2 text-xs text-slate-400">{d.sector}</p>}
                <div className="mt-3 flex items-center gap-4">
                  <button onClick={() => navigate(`/departments/${d._id}`)} className="text-xs font-semibold text-slate-500 hover:text-navy-900 dark:hover:text-white">
                    View Details →
                  </button>
                  {(!user || user.role === 'citizen') && (
                    <button onClick={() => handleSelect(d)} className="text-xs font-semibold text-accent-500 hover:underline">
                      File a complaint here →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <ChatAssistant />
    </div>
  );
};

export default Departments;
