import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User, UserRole } from '../types';
import api from '../lib/api';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (name: string, email: string, password: string, role: UserRole, phone?: string, institutionId?: string) => Promise<any>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('smartqueue_current_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, ...userData } = response.data;

      const formattedUser: User = {
        id: userData._id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        phone: userData.phone,
        institutionId: userData.institutionId,
        createdAt: userData.createdAt || new Date(),
      };

      localStorage.setItem('smartqueue_token', token);
      localStorage.setItem('smartqueue_current_user', JSON.stringify(formattedUser));

      setUser(formattedUser);
      return formattedUser;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      throw error;
    }
  }, []);

  const register = useCallback(async (
    name: string,
    email: string,
    password: string,
    role: UserRole,
    phone?: string,
    institutionId?: string
  ) => {
    try {
      const response = await api.post('/auth/register', {
        name,
        email,
        password,
        role,
        phone,
        institutionId
      });

      const { token, ...userData } = response.data;

      const formattedUser: User = {
        id: userData._id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        phone: userData.phone,
        institutionId: userData.institutionId,
        createdAt: userData.createdAt || new Date(),
      };

      localStorage.setItem('smartqueue_token', token);
      localStorage.setItem('smartqueue_current_user', JSON.stringify(formattedUser));

      setUser(formattedUser);
      return formattedUser;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('smartqueue_token');
    localStorage.removeItem('smartqueue_current_user');
    setUser(null);
    toast.info('Dole me sukses');
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
