import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const raw = localStorage.getItem('nccms_user');
  if (raw) {
    const user = JSON.parse(raw);
    if (user?.token) config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isAuthEndpoint = err.config?.url?.includes('/auth/login') || err.config?.url?.includes('/auth/register');
    if (err.response?.status === 401 && !isAuthEndpoint) {
      // Only treat this as "your session expired" if we actually had a
      // session — a 401 here means an existing token was rejected, not that
      // a login attempt failed (that case is excluded above).
      localStorage.removeItem('nccms_user');
      const loginPaths = ['/login', '/authorized-administration', '/register'];
      if (!loginPaths.some((p) => window.location.pathname.startsWith(p))) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
