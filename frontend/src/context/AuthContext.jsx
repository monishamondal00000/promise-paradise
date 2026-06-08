import React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API = axios.create({ baseURL: '/api' });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('pp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('pp_token');
    if (token) {
      API.get('/auth/me')
        .then(res => setUser(res.data))
        .catch(() => { localStorage.removeItem('pp_token'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await API.post('/auth/login', { email, password });
    localStorage.setItem('pp_token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const register = async (name, email, phone, password, otp) => {
    const res = await API.post('/auth/register', { name, email, phone, password, otp });
    localStorage.setItem('pp_token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('pp_token');
    setUser(null);
  };

  const refreshUser = async () => {
    const res = await API.get('/auth/me');
    setUser(res.data);
    return res.data;
  };

  const updateUserLocal = (patch) => {
    setUser(prev => prev ? { ...prev, ...patch } : prev);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, API, refreshUser, updateUserLocal }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export { API };
