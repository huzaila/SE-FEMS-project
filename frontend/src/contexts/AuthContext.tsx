import React, { createContext, useState, useEffect } from 'react';
import api from '@/services/api';

interface User {
  id: number;
  email: string;
  role: 'customer' | 'vendor';
  full_name?: string;
  phone?: string;
  is_email_verified?: boolean;
  vendor_id?: number;
  vendor_name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  register: (email: string, password: string, profileData?: any) => Promise<any>;
  verifyEmail: (email: string, code: string) => Promise<any>;
  completeProfile: (data: any) => Promise<any>;
  login: (email: string, password: string) => Promise<any>;
  logout: () => void;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(!!localStorage.getItem('token')); // Start as true if token exists

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setLoading(false); // No token, stop loading
    }
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/profile');
      setUser(response.data.user);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, profileData?: any) => {
    try {
      const response = await api.post('/register', { 
        email, 
        password,
        ...(profileData || {})
      });
      return response.data;
    } catch (error: any) {
      console.error('Register error:', error);
      // Check for connection errors
      if (error.code === 'ECONNREFUSED' || 
          error.code === 'ERR_NETWORK' ||
          error.message?.includes('Network Error') ||
          error.message?.includes('Failed to fetch')) {
        throw new Error('Cannot connect to server. Please make sure the backend is running on port 5002.');
      }
      // Check for timeout
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new Error('Request timed out. Please check if the backend is running.');
      }
      throw error;
    }
  };

  const verifyEmail = async (email: string, code: string) => {
    try {
      const response = await api.post('/verify-email', { email, code });

      // Store token if provided (for complete-profile step)
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        setToken(response.data.token);
      }

      setUser(response.data.user);
      return response.data;
    } catch (error: any) {
      console.error('Verify email error:', error);
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        throw new Error('Cannot connect to server. Please make sure the backend is running.');
      }
      throw error;
    }
  };

  const completeProfile = async (data: any) => {
    try {
      const response = await api.post('/complete-profile', data);
      setUser(response.data.user);
      return response.data;
    } catch (error: any) {
      console.error('Complete profile error:', error);
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        throw new Error('Cannot connect to server. Please make sure the backend is running.');
      }
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/login', { email, password });
      const newToken = response.data.token;
      
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(response.data.user);
      
      return response.data;
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        throw new Error('Cannot connect to server. Please make sure the backend is running.');
      }
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    register,
    verifyEmail,
    completeProfile,
    login,
    logout,
    isAuthenticated: !!token && !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
