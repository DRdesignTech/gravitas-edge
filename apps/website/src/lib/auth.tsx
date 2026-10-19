'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';
import { fetchMyActiveSubscriptions, fetchRvaAccess } from './services';
import { AccessFlags, combineAccess, resolvePostLoginRoute } from './access-routing';
import { User } from './types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  /** Whether the signed-in user has at least one active Opportunity Vault
   *  subscription. `null` means it has not been resolved yet (still loading). */
  hasVaultAccess: boolean | null;
  /** Whether the signed-in user has an active Recruitment Vendor Access
   *  subscription. `null` means it has not been resolved yet. */
  hasRvaAccess: boolean | null;
  /** Vault OR RVA — any active plan. `null` while either side resolves. */
  hasAnyAccess: boolean | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, referralCode?: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  /** Re-fetch entitlements (e.g. right after a successful purchase). */
  refreshAccess: () => Promise<AccessFlags>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessFlags, setAccessFlags] = useState<AccessFlags>({
    hasVaultAccess: null,
    hasRvaAccess: null,
  });
  const router = useRouter();

  /**
   * Resolve both entitlements in one pass. Vault and RVA are independent
   * products backed by separate tables, so each side is fetched on its own and
   * a failure on either side degrades to "no access for that product" instead
   * of hiding the other one.
   */
  const loadAccess = useCallback(async (): Promise<AccessFlags> => {
    const [vaultSubs, rva] = await Promise.all([
      fetchMyActiveSubscriptions().catch(() => null),
      fetchRvaAccess().catch(() => null),
    ]);
    const hasVaultAccess = Array.isArray(vaultSubs) && vaultSubs.length > 0;
    const hasRvaAccess = rva?.hasAccess === true;
    const flags: AccessFlags = { hasVaultAccess, hasRvaAccess };
    setAccessFlags(flags);
    return flags;
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
        setAccessFlags({ hasVaultAccess: null, hasRvaAccess: null });
      }
    },
    [loadAccess],
  );

  /**
   * Persist a fresh session. The login/register responses only carry basic
   * fields (no profile), so we enrich the session with the full `/auth/me`
   * payload so the header can show the user's name right away. Returns the
   * freshly resolved entitlement flags so callers can route accordingly.
   */
  const persistSession = useCallback(
    async (accessToken: string, baseUser: User): Promise<AccessFlags> => {
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
    const flags = await persistSession(token, res.user);
    router.push(resolvePostLoginRoute(flags));
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
    const flags = await persistSession(token, res.user);
    router.push(resolvePostLoginRoute(flags));
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    setAccessFlags({ hasVaultAccess: null, hasRvaAccess: null });
    router.push('/');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        hasVaultAccess: accessFlags.hasVaultAccess,
        hasRvaAccess: accessFlags.hasRvaAccess,
        hasAnyAccess: combineAccess(accessFlags.hasVaultAccess, accessFlags.hasRvaAccess),
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
