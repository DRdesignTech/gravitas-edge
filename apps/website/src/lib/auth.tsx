'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';
import { fetchMyActiveSubscriptions, fetchRvaAccess } from './services';
import { AccessFlags, combineAccess, resolvePostLoginRoute, hasActiveSubscription } from './access-routing';
import { User } from './types';

export interface RegisterExtraFields {
  phone?: string;
  location?: string;
  yearsExperience?: number;
  monthsExperience?: number;
  currentJobTitle?: string;
  currentCompany?: string;
  skills?: string[];
  onBeforeRedirect?: () => Promise<void>;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  /** Whether the signed-in user has at least one active Opportunity Vault
   *  subscription. `null` means it has not been resolved yet (still loading or errored). */
  hasVaultAccess: boolean | null;
  /** Whether the signed-in user has an active Recruitment Vendor Access
   *  subscription. `null` means it has not been resolved yet. */
  hasRvaAccess: boolean | null;
  /** Vault OR RVA — any active plan. `null` while either side resolves or errored. */
  hasAnyAccess: boolean | null;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    referralCode?: string,
    extra?: RegisterExtraFields,
  ) => Promise<void>;
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
   * a failure on either side degrades to "unknown (null)" instead of "no access"
   * to avoid incorrectly redirecting users to /plans on transient API failures.
   */
  const loadAccess = useCallback(async (): Promise<AccessFlags> => {
    let vaultSubs: unknown = null;
    let rva: unknown = null;
    let vaultError = false;
    let rvaError = false;

    try {
      vaultSubs = await fetchMyActiveSubscriptions();
    } catch {
      vaultError = true;
    }

    try {
      rva = await fetchRvaAccess();
    } catch {
      rvaError = true;
    }

    // If either fetch errored, keep that side as null (unknown) rather than false
    // This prevents redirecting to /plans on transient API failures
    const hasVaultAccess: boolean | null = vaultError
      ? null
      : Array.isArray(vaultSubs) && vaultSubs.length > 0;
    const hasRvaAccess: boolean | null = rvaError
      ? null
      : Boolean(rva && typeof rva === 'object' && 'hasAccess' in rva && (rva as { hasAccess: boolean }).hasAccess === true);

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

  const linkPendingGuestResume = async () => {
    if (typeof window === 'undefined') return;
    const guestToken = window.localStorage.getItem('guest-resume-token');
    if (!guestToken) return;
    try {
      await api.post(`/resumes/guest/${encodeURIComponent(guestToken)}/link`);
      window.localStorage.removeItem('guest-resume-token');
      window.localStorage.removeItem('guest-resume-info');
      window.dispatchEvent(new CustomEvent('guest-resume-cleared'));
    } catch {
      // Best-effort — keep guest token intact if linking failed temporarily
    }
  };

  const login = async (email: string, password: string) => {
    const res = await api.post<{ accessToken: string; user: User }>('/auth/login', {
      email,
      password,
    });
    const token = res.accessToken ?? (res as any).access_token;
    const flags = await persistSession(token, res.user);
    await linkPendingGuestResume();
    router.push(resolvePostLoginRoute(flags));
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    referralCode?: string,
    extra?: RegisterExtraFields,
  ) => {
    const body: Record<string, any> = {
      fullName: name,
      email,
      password,
    };
    if (referralCode) body.referralCode = referralCode;
    if (extra?.phone?.trim()) body.phone = extra.phone.trim();
    if (extra?.location?.trim()) body.location = extra.location.trim();
    if (extra?.yearsExperience != null && !Number.isNaN(extra.yearsExperience)) {
      body.yearsExperience = extra.yearsExperience;
    }
    if (extra?.monthsExperience != null && !Number.isNaN(extra.monthsExperience)) {
      body.monthsExperience = extra.monthsExperience;
    }
    if (extra?.currentJobTitle?.trim()) body.currentJobTitle = extra.currentJobTitle.trim();
    if (extra?.currentCompany?.trim()) body.currentCompany = extra.currentCompany.trim();
    if (extra?.skills && extra.skills.length > 0) body.skills = extra.skills;

    const res = await api.post<{ accessToken: string; user: User }>('/auth/register', body);
    const token = res.accessToken ?? (res as any).access_token;
    const flags = await persistSession(token, res.user);
    if (extra?.onBeforeRedirect) {
      await extra.onBeforeRedirect();
      // Refresh cached user/profile in case linking a resume backfilled fields
      await loadUser(token);
    }
    router.push(resolvePostLoginRoute(flags));
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('is_logging_out', '1');
      } catch {
        // ignore storage errors
      }
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    setAccessFlags({ hasVaultAccess: null, hasRvaAccess: null });
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    } else {
      router.push('/');
    }
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
