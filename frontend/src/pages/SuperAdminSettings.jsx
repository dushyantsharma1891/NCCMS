import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import api from '../api/axios';
import useStatesDistricts from '../hooks/useStatesDistricts';

const SuperAdminSettings = () => {
  const { states } = useStatesDistricts();
  const [settings, setSettings] = useState(null);
  const [president, setPresident] = useState({});
  const [pm, setPm] = useState({});
  const [cs, setCs] = useState({});
  const [officials, setOfficials] = useState([]);
  const [centralEmblem, setCentralEmblem] = useState('');
  const [stateEmblems, setStateEmblems] = useState({});
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/settings').then((res) => {
      setSettings(res.data);
      setPresident(res.data.president || {});
      setPm(res.data.primeMinister || {});
      setCs(res.data.cabinetSecretary || {});
      setOfficials((res.data.officials || []).map((o) => ({ ...o })));
      setCentralEmblem(res.data.centralEmblem || '');
      setStateEmblems(res.data.stateEmblems || {});
    });
  }, []);

  const saveLeadership = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await api.put('/settings', { president, primeMinister: pm, cabinetSecretary: cs, officials });
      setMsg('National leadership and senior officials updated. Visible on the public About page, in rank order.');
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const saveEmblems = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await api.put('/settings', { centralEmblem, stateEmblems });
      setMsg('Emblem branding updated. New/updated departments without a custom logo will use these automatically.');
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <DashboardLayout title="Settings"><p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p></DashboardLayout>;

  return (
    <DashboardLayout title="Platform Settings" subtitle="National leadership shown on the public About page, and the emblem logos used to auto-brand departments.">
      {msg && <p className="mb-6 rounded-lg bg-slate-100 dark:bg-slate-900 px-3 py-2 text-sm text-slate-600 dark:text-slate-300">{msg}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={saveLeadership} className="card flex flex-col gap-4">
          <h2 className="font-display font-bold text-navy-900 dark:text-white">National Leadership</h2>

          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">President of India</p>
          <input placeholder="Name" value={president.name || ''} onChange={(e) => setPresident({ ...president, name: e.target.value })} className="input" />
          <input placeholder="Photo URL" value={president.photo || ''} onChange={(e) => setPresident({ ...president, photo: e.target.value })} className="input" />
          <input type="date" value={president.since ? president.since.slice(0, 10) : ''} onChange={(e) => setPresident({ ...president, since: e.target.value })} className="input" />

          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mt-2">Prime Minister of India</p>
          <input placeholder="Name" value={pm.name || ''} onChange={(e) => setPm({ ...pm, name: e.target.value })} className="input" />
          <input placeholder="Photo URL" value={pm.photo || ''} onChange={(e) => setPm({ ...pm, photo: e.target.value })} className="input" />
          <input type="date" value={pm.since ? pm.since.slice(0, 10) : ''} onChange={(e) => setPm({ ...pm, since: e.target.value })} className="input" />

          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mt-2">Cabinet Secretary — head of the civil services (IAS)</p>
          <input placeholder="Name" value={cs.name || ''} onChange={(e) => setCs({ ...cs, name: e.target.value })} className="input" />
          <input placeholder="Designation (e.g. Cabinet Secretary)" value={cs.designation || ''} onChange={(e) => setCs({ ...cs, designation: e.target.value })} className="input" />
          <div className="grid grid-cols-3 gap-2">
            <input placeholder="Service (IAS)" value={cs.service || ''} onChange={(e) => setCs({ ...cs, service: e.target.value })} className="input" />
            <input placeholder="Batch (1987 batch)" value={cs.batch || ''} onChange={(e) => setCs({ ...cs, batch: e.target.value })} className="input" />
            <input placeholder="Cadre" value={cs.cadre || ''} onChange={(e) => setCs({ ...cs, cadre: e.target.value })} className="input" />
          </div>
          <input placeholder="Photo URL" value={cs.photo || ''} onChange={(e) => setCs({ ...cs, photo: e.target.value })} className="input" />
          <input type="date" value={cs.since ? String(cs.since).slice(0, 10) : ''} onChange={(e) => setCs({ ...cs, since: e.target.value })} className="input" />
          <textarea rows={2} placeholder="Short description of the role" value={cs.about || ''} onChange={(e) => setCs({ ...cs, about: e.target.value })} className="input" />

          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mt-2">Other senior officials (shown below the Cabinet Secretary, by rank number)</p>
          {officials.map((o, i) => (
            <div key={i} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 flex flex-col gap-2">
              <div className="grid grid-cols-[1fr_5rem] gap-2">
                <input placeholder="Name" value={o.name || ''} onChange={(e) => setOfficials(officials.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} className="input" />
                <input type="number" min={4} placeholder="Rank" value={o.rank ?? ''} onChange={(e) => setOfficials(officials.map((x, k) => (k === i ? { ...x, rank: e.target.value } : x)))} className="input" />
              </div>
              <input placeholder="Designation (e.g. Union Home Secretary)" value={o.designation || ''} onChange={(e) => setOfficials(officials.map((x, k) => (k === i ? { ...x, designation: e.target.value } : x)))} className="input" />
              <div className="grid grid-cols-3 gap-2">
                <input placeholder="Service (IAS)" value={o.service || ''} onChange={(e) => setOfficials(officials.map((x, k) => (k === i ? { ...x, service: e.target.value } : x)))} className="input" />
                <input placeholder="Batch" value={o.batch || ''} onChange={(e) => setOfficials(officials.map((x, k) => (k === i ? { ...x, batch: e.target.value } : x)))} className="input" />
                <input placeholder="Cadre" value={o.cadre || ''} onChange={(e) => setOfficials(officials.map((x, k) => (k === i ? { ...x, cadre: e.target.value } : x)))} className="input" />
              </div>
              <input placeholder="Photo URL" value={o.photo || ''} onChange={(e) => setOfficials(officials.map((x, k) => (k === i ? { ...x, photo: e.target.value } : x)))} className="input" />
              <input type="date" value={o.since ? String(o.since).slice(0, 10) : ''} onChange={(e) => setOfficials(officials.map((x, k) => (k === i ? { ...x, since: e.target.value } : x)))} className="input" />
              <textarea rows={2} placeholder="Short description" value={o.about || ''} onChange={(e) => setOfficials(officials.map((x, k) => (k === i ? { ...x, about: e.target.value } : x)))} className="input" />
              <button type="button" onClick={() => setOfficials(officials.filter((_, k) => k !== i))} className="self-end text-xs font-semibold text-rose-500 hover:underline">Remove</button>
            </div>
          ))}
          <button type="button" onClick={() => setOfficials([...officials, { name: '', designation: '', service: 'IAS', rank: officials.length + 4 }])} className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900">
            + Add senior official
          </button>

          <button type="submit" disabled={saving} className="mt-2 rounded-lg bg-gradient-to-r from-rose-700 to-navy-900 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-60">
            Save Leadership
          </button>
        </form>

        <form onSubmit={saveEmblems} className="card flex flex-col gap-4">
          <h2 className="font-display font-bold text-navy-900 dark:text-white">Emblem Branding</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Departments without a custom logo automatically use these: the Central emblem for Central Government
            departments, and the matching state's emblem for State Government departments.
          </p>
          <div>
            <label className="label">Central Emblem URL (e.g. National Emblem of India)</label>
            <input value={centralEmblem} onChange={(e) => setCentralEmblem(e.target.value)} className="input mt-1" placeholder="https://..." />
            {centralEmblem && <img src={centralEmblem} alt="central emblem" className="mt-2 h-14 w-14 object-contain" />}
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mt-2">Per-State Emblems</p>
          <div className="max-h-80 overflow-y-auto flex flex-col gap-2 pr-1">
            {states.map((s) => (
              <div key={s} className="flex items-center gap-2">
                <span className="w-40 shrink-0 text-xs text-slate-600 dark:text-slate-300">{s}</span>
                <input
                  value={stateEmblems[s] || ''}
                  onChange={(e) => setStateEmblems({ ...stateEmblems, [s]: e.target.value })}
                  placeholder="Emblem URL"
                  className="input flex-1 text-xs"
                />
                {stateEmblems[s] && <img src={stateEmblems[s]} alt="" className="h-8 w-8 object-contain shrink-0" />}
              </div>
            ))}
          </div>

          <button type="submit" disabled={saving} className="mt-2 rounded-lg bg-gradient-to-r from-rose-700 to-navy-900 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-60">
            Save Emblems
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminSettings;
