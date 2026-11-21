'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui';

export interface CookiePreferences {
  decision: 'accept-all' | 'reject-non-essential' | 'custom';
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
}

const STORAGE_KEY = 'gravitasedge-cookie-consent';

interface ToggleRowProps {
  label: string;
  description: string;
  checked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}

function ToggleRow({
  label,
  description,
  checked = false,
  disabled = false,
  onChange,
}: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-[#E9E5DC] bg-[#FAF8F5] p-4 transition-colors dark:border-[#1E3557] dark:bg-[#081B33]">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-[#061B36] dark:text-white">{label}</p>
          {disabled ? (
            <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-300">
              Always Active
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7E889E] dark:text-slate-400">
              {checked ? 'Enabled' : 'Optional'}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-[#5B6479] dark:text-slate-300">{description}</p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6952F] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${
          checked ? 'bg-[#D6952F]' : 'bg-[#CBD5E1] dark:bg-slate-700'
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export default function CookieConsent() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setVisible(true);
        return;
      }
      const prefs = JSON.parse(raw) as CookiePreferences;
      setAnalytics(!!prefs.analytics);
      setMarketing(!!prefs.marketing);
    } catch {
      setVisible(true);
    }
  }, []);

  const persist = (prefs: Omit<CookiePreferences, 'updatedAt'>) => {
    const full: CookiePreferences = { ...prefs, updatedAt: new Date().toISOString() };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
    } catch {
      /* storage unavailable — treat as session-only choice */
    }
    setVisible(false);
    setManageOpen(false);
  };

  const acceptAll = () => {
    setAnalytics(true);
    setMarketing(true);
    persist({ decision: 'accept-all', analytics: true, marketing: true });
  };

  const rejectNonEssential = () => {
    setAnalytics(false);
    setMarketing(false);
    persist({ decision: 'reject-non-essential', analytics: false, marketing: false });
  };

  const saveCustom = () => {
    persist({ decision: 'custom', analytics, marketing });
  };

  if (!mounted) return null;

  return (
    <>
      {/* FLOATING EXECUTIVE COOKIE CONSENT CARD */}
      {visible && (
        <div
          role="dialog"
          aria-label="Cookie consent"
          aria-modal="false"
          className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-4xl animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
          <div className="relative overflow-hidden rounded-3xl border border-[#D6952F]/40 bg-white/95 p-5 sm:p-6 shadow-[0_20px_50px_-15px_rgba(6,27,54,0.35)] backdrop-blur-md dark:bg-[#07172B]/95 dark:border-[#D6952F]/30 dark:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.7)]">
            {/* Subtle decorative watermark glow */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[#FAF0DC]/50 dark:bg-[#D6952F]/10 blur-2xl"
            />

            <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="flex items-start gap-3.5 max-w-2xl">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#061B36] text-[#F0C27B] border border-[#D6952F]/40 shadow-xs dark:bg-[#0A2645]">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#C8943E] dark:text-[#F0C27B]">
                      Privacy &amp; Data Transparency
                    </span>
                    <span className="h-1 w-1 rounded-full bg-[#D6952F]" />
                    <span className="text-[10px] text-[#7E889E] dark:text-slate-400">Gravitas Edge</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-[#061B36] dark:text-white">
                    We value your executive privacy
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#5B6479] dark:text-slate-300">
                    We use essential security technologies to maintain platform integrity. With your permission, we also use analytical tools to measure search relevance and improve opportunity curation across international corridors.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0 self-end lg:self-center">
                <button
                  type="button"
                  onClick={() => setManageOpen(true)}
                  className="text-xs font-semibold text-[#8A6524] hover:text-[#5B3E12] dark:text-[#F0C27B] dark:hover:text-white underline underline-offset-4 px-2 py-1.5 transition-colors cursor-pointer"
                >
                  Manage Choices
                </button>

                <button
                  type="button"
                  onClick={rejectNonEssential}
                  className="rounded-xl border border-[#E9E5DC] bg-white px-4 py-2.5 text-xs font-semibold text-[#061B36] shadow-xs hover:bg-[#FAF8F5] dark:border-[#1E3557] dark:bg-[#081B33] dark:text-white dark:hover:bg-[#0B2342] transition cursor-pointer"
                >
                  Reject Non-Essential
                </button>

                <button
                  type="button"
                  onClick={acceptAll}
                  className="rounded-xl bg-gradient-to-r from-[#D6952F] via-[#C8943E] to-[#B37E28] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:brightness-105 hover:shadow-md transition cursor-pointer"
                >
                  Accept All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MANAGE PREFERENCES MODAL */}
      <Modal
        isOpen={manageOpen}
        onClose={() => setManageOpen(false)}
        title="Manage Cookie Preferences"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              type="button"
              onClick={() => setManageOpen(false)}
              className="rounded-xl border border-[#E9E5DC] bg-white px-4 py-2.5 text-xs font-semibold text-[#061B36] hover:bg-[#FAF8F5] dark:border-[#1E3557] dark:bg-[#081B33] dark:text-white transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveCustom}
              className="rounded-xl bg-gradient-to-r from-[#D6952F] via-[#C8943E] to-[#B37E28] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:brightness-105 transition cursor-pointer"
            >
              Save Preferences
            </button>
          </div>
        }
      >
        <div className="space-y-3.5">
          <p className="text-xs text-[#5B6479] dark:text-slate-300 mb-2">
            Control which technologies Gravitas Edge may use to store information on your device. Strictly necessary technologies are required for platform security and cannot be disabled.
          </p>

          <ToggleRow
            label="Strictly Necessary"
            description="Required for authentication, session integrity, security encryption and core platform navigation."
            checked
            disabled
          />
          <ToggleRow
            label="Analytics & Relevance"
            description="Helps us understand how executive candidates interact with opportunity vaults and search filters to improve curation."
            checked={analytics}
            onChange={setAnalytics}
          />
          <ToggleRow
            label="Advertising & Tailored Content"
            description="Allows customized communication and announcements regarding newly opened executive mandates in your target market."
            checked={marketing}
            onChange={setMarketing}
          />
        </div>
      </Modal>
    </>
  );
}
