import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Synchronize authentication on startup
  useEffect(() => {
    const token = localStorage.getItem('hirescheduler_token');
    const storedUser = localStorage.getItem('hirescheduler_user');
    
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        logout();
      }
    }
    setLoading(false);
  }, []);

  // Admin Credentials-based Login
  const adminLogin = async (email, password) => {
    try {
      const response = await api.post('/api/auth/admin-login', { email, password });
      const { token, user: userData } = response.data.data;
      
      localStorage.setItem('hirescheduler_token', token);
      localStorage.setItem('hirescheduler_user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    } catch (error) {
      throw error.response?.data?.message || 'Admin login failed. Please verify credentials.';
    }
  };

  // Interviewer credentials-free login (Name, Email, Phone)
  const interviewerLogin = async (name, email, phoneNumber) => {
    try {
      const response = await api.post('/api/auth/interviewer-login', { 
        name, 
        email, 
        phone_number: phoneNumber 
      });
      const { token, user: userData } = response.data.data;
      
      localStorage.setItem('hirescheduler_token', token);
      localStorage.setItem('hirescheduler_user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    } catch (error) {
      throw error.response?.data?.message || 'Interviewer login failed.';
    }
  };

  // Sign out user session
  const logout = () => {
    localStorage.removeItem('hirescheduler_token');
    localStorage.removeItem('hirescheduler_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, adminLogin, interviewerLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be consumed within an AuthProvider.');
  }
  return context;
};
