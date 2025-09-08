import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';
import { requestNotificationPermission } from '../firebase';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    if (token && userId) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      api
        .get('/auth/me')
        .then((res) => {
          setUser(res.data);
          setLoading(false);
        })
        .catch((err) => {
          console.error('AuthContext useEffect error:', err.message, err.stack);
          if (err.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('userId');
            delete api.defaults.headers.common['Authorization'];
            setUser(null);
          }
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async ({ email, password }) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('userId', user._id);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);

      // Request FCM token
      const fcmToken = await requestNotificationPermission();
      if (fcmToken) {
        await api.put('/user/profile', { fcmToken });
      }
    } catch (err) {
      console.error('Login error:', err.message, err.stack);
      throw err;
    }
  };

  const signup = async ({ name, username, email, password }) => {
    try {
      const res = await api.post('/auth/register', { name, username, email, password });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('userId', user._id);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);

      // Request FCM token
      const fcmToken = await requestNotificationPermission();
      if (fcmToken) {
        await api.put('/user/profile', { fcmToken });
      }
    } catch (err) {
      console.error('Signup error:', err.message, err.stack);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};