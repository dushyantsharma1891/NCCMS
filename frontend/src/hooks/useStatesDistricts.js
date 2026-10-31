import { useEffect, useState } from 'react';
import api from '../api/axios';

// Fetches the India states -> districts map once and caches it in memory
// so every form using dependent state/district dropdowns shares one source of truth.
let cache = null;

const useStatesDistricts = () => {
  const [data, setData] = useState(cache || {});
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) return;
    api.get('/meta/states-districts').then((res) => {
      cache = res.data;
      setData(res.data);
      setLoading(false);
    });
  }, []);

  const states = Object.keys(data).sort();
  const districtsFor = (state) => (data[state] ? [...data[state]].sort() : []);

  return { states, districtsFor, loading };
};

export default useStatesDistricts;
