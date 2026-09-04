'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';
import { User } from './types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  admin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState(false);
  const router = useRouter();

  const loadUser = useCallback(async (tok: string) => {
    try {
      const me = await api.get<User>('/auth/me');
      setUser(me);
      setToken(tok);
      setAdmin(Array.isArray(me.roles) && me.roles.includes('ADMIN'));
    } catch {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      setUser(null);
      setToken(null);
      setAdmin(false);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('admin_token');
    if (stored) {
      loadUser(stored).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [loadUser]);

  const login = async (email: string, password: string) => {
    const res = await api.post<{ accessToken: string; user: User }>('/auth/login', {
      email,
      password,
    });
    const token = res.accessToken ?? (res as any).access_token;
    const isAdmin = Array.isArray(res.user.roles) && res.user.roles.includes('ADMIN');
    if (!isAdmin) {
      throw new Error('This account does not have administrator access');
    }
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_user', JSON.stringify(res.user));
    setUser(res.user);
    setToken(token);
    setAdmin(true);
    router.push('/');
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setUser(null);
    setToken(null);
    setAdmin(false);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, admin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
