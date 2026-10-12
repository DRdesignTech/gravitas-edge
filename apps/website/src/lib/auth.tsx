'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';
import { fetchMyActiveSubscriptions } from './services';
import { User } from './types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  /** Whether the signed-in user has at least one active Vault subscription.
   *  `null` means it has not been resolved yet (still loading). */
  hasVaultAccess: boolean | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, referralCode?: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  /** Re-fetch Vault entitlement (e.g. right after a successful purchase). */
  refreshAccess: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasVaultAccess, setHasVaultAccess] = useState<boolean | null>(null);
  const router = useRouter();

  /**
   * Resolve whether the current user can access the dashboard. A user is
   * entitled as long as they have at least one active Vault subscription;
   * otherwise they must purchase a Vault before the dashboard unlocks.
   */
  const loadAccess = useCallback(async (): Promise<boolean> => {
    try {
      const subs = await fetchMyActiveSubscriptions();
      const has = Array.isArray(subs) && subs.length > 0;
      setHasVaultAccess(has);
      return has;
    } catch {
      setHasVaultAccess(false);
      return false;
    }
  }, []);

  const loadUser = useCallback(
    async (tok: string) => {
      try {
        const me = await api.get<User>('/auth/me');
        setUser(me);
        setToken(tok);
        await loadAccess();
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setToken(null);
        setHasVaultAccess(null);
      }
    },
    [loadAccess],
  );

  /**
   * Persist a fresh session. The login/register responses only carry basic
   * fields (no profile), so we enrich the session with the full `/auth/me`
   * payload so the header can show the user's name right away. Returns whether
   * the user already has Vault access so callers can route accordingly.
   */
  const persistSession = useCallback(
    async (accessToken: string, baseUser: User): Promise<boolean> => {
      localStorage.setItem('token', accessToken);
      const user = await api.get<User>('/auth/me').catch(() => baseUser);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      setToken(accessToken);
      return loadAccess();
    },
    [loadAccess],
  );

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
    const hasAccess = await persistSession(token, res.user);
    router.push(hasAccess ? '/dashboard' : '/plans');
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
    const hasAccess = await persistSession(token, res.user);
    router.push(hasAccess ? '/dashboard' : '/plans');
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    setHasVaultAccess(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        hasVaultAccess,
        login,
        register,
        logout,
        setUser,
        refreshAccess: loadAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
