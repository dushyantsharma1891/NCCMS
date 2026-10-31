import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('nccms_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);

  // Refresh rank/department once per page load so changes made by an admin
  // (e.g. being made Complaint Head) show up without logging in again.
  useEffect(() => {
    if (!user?.token) return;
    api.get('/auth/me').then(({ data }) => {
      setUser((prev) => (prev ? { ...prev, isComplaintHead: !!data.isComplaintHead, department: data.department || prev.department, name: data.name || prev.name } : prev));
    }).catch(() => {});
  }, []); // eslint-disable-line

  useEffect(() => {
    if (user) localStorage.setItem('nccms_user', JSON.stringify(user));
    else localStorage.removeItem('nccms_user');
  }, [user]);

  const login = async (email, password, loginType) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password, loginType });
      setUser(data);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', payload);
      setUser(data);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
