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
  register: (name: string, email: string, password: string, referralCode?: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
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

  /**
   * Persist a fresh session. The login/register responses only carry basic
   * fields (no profile), so we enrich the session with the full `/auth/me`
   * payload so the header can show the user's name right away.
   */
  const persistSession = useCallback(async (accessToken: string, baseUser: User) => {
    localStorage.setItem('token', accessToken);
    const user = await api.get<User>('/auth/me').catch(() => baseUser);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    setToken(accessToken);
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
    await persistSession(token, res.user);
    router.push('/dashboard');
  };

  const register = async (name: string, email: string, password: string, referralCode?: string) => {
    const body: Record<string, string> = {
      fullName: name,
      email,
      password,
    };
    if (referralCode) body.referralCode = referralCode;
    const res = await api.post<{ accessToken: string; user: User }>('/auth/register', body);
    const token = res.accessToken ?? (res as any).access_token;
    await persistSession(token, res.user);
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
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
