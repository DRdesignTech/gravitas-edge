'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';
import { User } from './types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadUser = useCallback(async (tok: string) => {
    try {
      const me = await api.get<User>('/auth/me');
      setUser(me);
      setToken(tok);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setToken(null);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('token');
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
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(res.user));
    setUser(res.user);
    setToken(token);
    router.push('/dashboard');
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await api.post<{ accessToken: string; user: User }>('/auth/register', {
      fullName: name,
      email,
      password,
    });
    const token = res.accessToken ?? (res as any).access_token;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(res.user));
    setUser(res.user);
    setToken(token);
    router.push('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
