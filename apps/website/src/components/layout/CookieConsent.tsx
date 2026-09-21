'use client';

import { useEffect, useState } from 'react';
import { Button, Modal } from '@/components/ui';

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
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-content">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-content-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60 ${
          checked ? 'bg-brand-600' : 'bg-line'
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
      {visible && (
        <div
          role="dialog"
          aria-label="Cookie consent"
          aria-modal="false"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface px-4 py-5 shadow-pop dark:bg-surface-elevated sm:px-6"
        >
          <div className="mx-auto flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-center">
            <p className="flex-1 text-sm leading-relaxed text-content-muted">
              We use essential technologies to keep this website working and secure. Where you allow
              it, we also use non-essential cookies to understand and improve how the website is
              used. You can choose what to allow.
            </p>
            <div className="flex flex-shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
              <Button onClick={acceptAll}>Accept All</Button>
              <Button variant="outline" onClick={rejectNonEssential}>
                Reject Non-Essential
              </Button>
              <Button variant="ghost" onClick={() => setManageOpen(true)}>
                Manage Preferences
              </Button>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={manageOpen}
        onClose={() => setManageOpen(false)}
        title="Manage Preferences"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setManageOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveCustom}>Save Preferences</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <ToggleRow
            label="Strictly necessary"
            description="Required for login, account/session management, security and core site functionality."
            checked
            disabled
          />
          <ToggleRow
            label="Analytics"
            description="Helps us understand how the website is used so we can improve it. Not activated before consent."
            checked={analytics}
            onChange={setAnalytics}
          />
          <ToggleRow
            label="Advertising / Marketing"
            description="If you allow it, helps show content more relevant to you. Not used before you agree."
            checked={marketing}
            onChange={setMarketing}
          />
        </div>
      </Modal>
    </>
  );
}
