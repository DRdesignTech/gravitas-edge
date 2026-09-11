'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { GuestResumeInfo } from './types';
import { getGuestResume } from './services';

const TOKEN_KEY = 'guest-resume-token';
const INFO_KEY = 'guest-resume-info';

interface GuestResumeContextType {
  guestToken: string | null;
  guestResume: GuestResumeInfo | null;
  hydrated: boolean;
  setGuestResume: (token: string, resume: GuestResumeInfo) => void;
  clearGuestResume: () => void;
  refreshGuestResume: () => Promise<void>;
}

const GuestResumeContext = createContext<GuestResumeContextType | undefined>(undefined);

function readStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

function readStoredInfo(): GuestResumeInfo | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(INFO_KEY);
    return raw ? (JSON.parse(raw) as GuestResumeInfo) : null;
  } catch {
    return null;
  }
}

export function GuestResumeProvider({ children }: { children: React.ReactNode }) {
  const [guestToken, setToken] = useState<string | null>(null);
  const [guestResume, setResume] = useState<GuestResumeInfo | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setToken(readStoredToken());
    setResume(readStoredInfo());
    setHydrated(true);
  }, []);

  const persist = useCallback((token: string, resume: GuestResumeInfo) => {
    try {
      window.localStorage.setItem(TOKEN_KEY, token);
      window.localStorage.setItem(INFO_KEY, JSON.stringify(resume));
    } catch {
      // Storage unavailable — keep in memory only.
    }
  }, []);

  const setGuestResume = useCallback(
    (token: string, resume: GuestResumeInfo) => {
      setToken(token);
      setResume(resume);
      persist(token, resume);
    },
    [persist],
  );

  const clearGuestResume = useCallback(() => {
    setToken(null);
    setResume(null);
    try {
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(INFO_KEY);
    } catch {
      // Ignore storage errors during cleanup.
    }
  }, []);

  const refreshGuestResume = useCallback(async () => {
    const stored = readStoredToken();
    if (!stored) return;
    try {
      const { resume } = await getGuestResume(stored);
      setResume(resume);
      persist(stored, resume);
    } catch {
      // Token may have expired or been revoked on the server. Leave state as-is.
    }
  }, [persist]);

  return (
    <GuestResumeContext.Provider
      value={{
        guestToken,
        guestResume,
        hydrated,
        setGuestResume,
        clearGuestResume,
        refreshGuestResume,
      }}
    >
      {children}
    </GuestResumeContext.Provider>
  );
}

export function useGuestResume() {
  const context = useContext(GuestResumeContext);
  if (!context) throw new Error('useGuestResume must be used within a GuestResumeProvider');
  return context;
}
