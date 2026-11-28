'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/lib/auth';
import { useGuestResume } from '@/lib/guest-resume';
import { linkGuestResume } from '@/lib/services';
import { Alert, useToast } from '@/components/ui';
import { BRAND_LOGO_SRC } from '@/lib/brand';
import { BRAND_NAME } from '@/components/brand/BrandLogo';
import { parseApiError, getErrorMessage } from '@/lib/errors';
import { getPasswordError } from '@/lib/password';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REFERRAL_CODE_RE = /^REF-[A-Z2-9]{10}$/;

const TRUST_MESSAGES = [
  '✦ Price Lock Guarantee • Subscribe Once, Keep Your Rate Forever',
  '✦ Direct Hiring Contacts • Pre-Market Roles',
  '✦ Retained Search & CXO Mandates • India & GCC',
  '✦ Zero Algorithmic Filtering • 100% Curated',
];

interface FieldErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirm?: string;
  terms?: string;
  referralCode?: string;
}

export type AuthMode = 'signin' | 'signup';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = 'signin',
}: AuthModalProps) {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [trustIndex, setTrustIndex] = useState(0);
  const [trustOpacity, setTrustOpacity] = useState(1);

  // Rotating trust messages on the left panel
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setTrustOpacity(0);
      setTimeout(() => {
        setTrustIndex((prev) => (prev + 1) % TRUST_MESSAGES.length);
        setTrustOpacity(1);
      }, 280);
    }, 4200);
    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync mode whenever initialMode or isOpen changes
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode, isOpen]);

  // Handle escape key & body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Global event listener to open from anywhere
  useEffect(() => {
    const handleCustomOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ mode?: AuthMode }>;
      if (customEvent.detail?.mode) {
        setMode(customEvent.detail.mode);
      }
    };
    window.addEventListener('open-auth-modal', handleCustomOpen);
    return () => window.removeEventListener('open-auth-modal', handleCustomOpen);
  }, []);

  const { login, register } = useAuth();
  const { guestToken, guestResume, clearGuestResume } = useGuestResume();
  const { showToast } = useToast();

  // ─── Sign In State ──────────────────────────────────────────
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [signInError, setSignInError] = useState<ReturnType<typeof parseApiError> | null>(null);
  const [signInFieldError, setSignInFieldError] = useState<{ email?: string; password?: string }>({});
  const [signInLoading, setSignInLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetFeedback, setResetFeedback] = useState<{ message: string; isError: boolean } | null>(null);

  // ─── Sign Up State ──────────────────────────────────────────
  const [signUpFullName, setSignUpFullName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirm, setSignUpConfirm] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [signUpReferralCode, setSignUpReferralCode] = useState('');
  const [invalidReferralCode, setInvalidReferralCode] = useState(false);
  const [signUpError, setSignUpError] = useState('');
  const [signUpFieldErrors, setSignUpFieldErrors] = useState<FieldErrors>({});
  const [signUpLoading, setSignUpLoading] = useState(false);

  // Referral code & guest resume contact hydration
  useEffect(() => {
    if (guestResume?.fullName && !signUpFullName) setSignUpFullName(guestResume.fullName);
    if (guestResume?.email && !signUpEmail) setSignUpEmail(guestResume.email);
    if (guestResume?.phone && !signUpPhone) setSignUpPhone(guestResume.phone);
  }, [guestResume, signUpFullName, signUpEmail, signUpPhone]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const refParam = urlParams.get('ref');
      const validUrlRef = refParam && REFERRAL_CODE_RE.test(refParam) ? refParam : null;

      if (refParam && !validUrlRef) {
        setInvalidReferralCode(true);
      }

      const storedRef = localStorage.getItem('referralCode');
      const code = validUrlRef ?? storedRef ?? '';
      if (code) {
        setSignUpReferralCode(code);
      }
      if (validUrlRef) {
        localStorage.setItem('referralCode', validUrlRef);
      }
    } catch {
      // Ignore URL or storage parsing errors
    }
  }, []);

  // Live password validation
  const livePasswordError = signUpPassword.length > 0 ? getPasswordError(signUpPassword) : undefined;
  const passwordMessage = signUpFieldErrors.password ?? livePasswordError;
  const showPasswordMessage = !!passwordMessage;

  // Password strength calculation (0 to 4)
  const calculateStrength = (val: string): number => {
    let score = 0;
    if (val.length >= 6) score++;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val) && /[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    return score;
  };
  const passwordScore = calculateStrength(signUpPassword);
  const strengthLabels = ['Strength', 'Weak', 'Fair', 'Strong', 'Executive'];

  const clearSignUpField = useCallback((field: keyof FieldErrors) => {
    setSignUpFieldErrors((f) => ({ ...f, [field]: undefined }));
  }, []);

  // ─── Handle Sign In Submit ──────────────────────────────────
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError(null);
    const next: { email?: string; password?: string } = {};
    if (!signInEmail.trim() || !EMAIL_RE.test(signInEmail.trim())) {
      next.email = 'Please enter a valid email address.';
    }
    if (!signInPassword) next.password = 'Please enter your password.';
    setSignInFieldError(next);
    if (Object.keys(next).length) return;

    setSignInLoading(true);
    try {
      await login(signInEmail.trim(), signInPassword);
      showToast('Welcome back to Gravitas Edge!', 'success');
      onClose();
    } catch (err) {
      const info = parseApiError(err);
      setSignInError(info);
      showToast(info.message, 'error');
    } finally {
      setSignInLoading(false);
    }
  };

  // ─── Handle Sign Up Submit ──────────────────────────────────
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError('');
    const next: FieldErrors = {};
    if (!signUpFullName.trim()) next.fullName = 'Please enter your full name.';
    if (!EMAIL_RE.test(signUpEmail.trim())) next.email = 'Please enter a valid email.';
    if (signUpPhone.trim() && !/^\+?[0-9\s\-().]{7,20}$/.test(signUpPhone.trim())) {
      next.phone = 'Please enter a valid phone number.';
    }
    const passwordError = getPasswordError(signUpPassword);
    if (passwordError) next.password = passwordError;
    if (signUpConfirm !== signUpPassword) next.confirm = 'Passwords do not match.';
    if (!agreedTerms) {
      next.terms = 'Please accept the Candidate Privacy Notice and Terms of Engagement.';
    }
    if (signUpReferralCode.trim() && !REFERRAL_CODE_RE.test(signUpReferralCode.trim())) {
      next.referralCode = 'Invalid referral code format.';
    }
    setSignUpFieldErrors(next);
    if (Object.keys(next).length) return;

    setSignUpLoading(true);
    try {
      await register(
        signUpFullName.trim(),
        signUpEmail.trim(),
        signUpPassword,
        signUpReferralCode.trim() || undefined,
        {
          phone: signUpPhone.trim() || undefined,
          onBeforeRedirect: async () => {
            if (guestToken) {
              try {
                await linkGuestResume(guestToken);
                clearGuestResume();
                showToast('Your resume has been linked to your account.', 'success');
              } catch {
                // Best effort
              }
            }
          },
        },
      );

      if (typeof window !== 'undefined') {
        localStorage.removeItem('referralCode');
      }

      showToast(`Account created! Welcome to ${BRAND_NAME}.`, 'success');
      onClose();
    } catch (err) {
      const message = getErrorMessage(err);
      setSignUpError(message);
      showToast(message, 'error');
    } finally {
      setSignUpLoading(false);
    }
  };

  const handleSendReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim() || !EMAIL_RE.test(resetEmail.trim())) {
      setResetFeedback({ message: 'Please enter a valid registered email address.', isError: true });
      return;
    }
    setResetFeedback({
      message: `✓ Recovery link dispatched to ${resetEmail.trim()}. Check your inbox.`,
      isError: false,
    });
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      id="authModalBackdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modalHeading"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-[#070C1B]/80 backdrop-blur-md transition-opacity duration-300 overflow-y-auto font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Main Split-Screen Container (~940px wide, locked height on desktop) */}
      <div
        id="authModalCard"
        className="relative w-full max-w-[940px] md:h-[650px] max-h-[92vh] bg-white dark:bg-[#0B132B] rounded-2xl shadow-[0_32px_64px_-16px_rgba(7,12,27,0.55),0_0_0_1px_rgba(212,175,55,0.16)] overflow-hidden flex flex-col md:flex-row my-auto border border-slate-200/80 dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================================================================= */}
        {/* LEFT COLUMN: VISUAL & BRAND SHOWCASE PANEL (45% ON DESKTOP)        */}
        {/* ================================================================= */}
        <div className="relative w-full md:w-[45%] md:h-full min-h-[220px] bg-[#070C1B] text-white flex flex-col justify-between p-6 sm:p-8 overflow-hidden select-none shrink-0">
          {/* High-Resolution Architectural Skyline Photography */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=85"
            alt="Modern glass financial district skyline"
            className="absolute inset-0 w-full h-full object-cover object-center scale-105 opacity-45 mix-blend-luminosity pointer-events-none"
          />

          {/* Midnight Navy to Warm Champagne Gold Architectural Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#070C1B]/95 via-[#0B132B]/88 to-[#2B210B]/90 pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.22),transparent_60%)] pointer-events-none" />

          {/* Gold Hairline Accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#C59B27] via-[#E8D08B] to-transparent" />

          {/* Top: Gravitas Edge Logo & Brand Name */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 px-2.5 rounded-xl bg-white border border-[#D4AF37]/50 flex items-center justify-center shadow-lg shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={BRAND_LOGO_SRC}
                  alt="Gravitas Edge Consulting logo"
                  className="h-7 w-auto object-contain block"
                />
              </div>
              <div>
                <div className="font-serif text-lg font-bold tracking-wide text-white leading-tight">
                  GRAVITAS <span className="text-[#D4AF37]">EDGE</span>
                </div>
                <div className="text-[10px] font-semibold tracking-[0.26em] uppercase text-[#E8D08B]/80">
                  Consulting
                </div>
              </div>
            </div>

            {/* Mobile Close Button (Visible only on small screens) */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="md:hidden w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Center Editorial Value Proposition */}
          <div className="relative z-10 my-6 md:my-auto">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#E8D08B] text-[11px] font-semibold tracking-wider uppercase mb-3">
              <svg className="w-3.5 h-3.5 text-[#D4AF37]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Executive Opportunity Vault
            </div>

            <h2 className="font-serif text-2xl sm:text-[28px] font-semibold text-white leading-[1.22] tracking-tight">
              Skip the Portals.<br />
              <span className="text-[#E8D08B] italic font-medium">Connect Directly.</span>
            </h2>

            <p className="mt-3 text-xs sm:text-sm text-slate-300/95 leading-relaxed hidden sm:block">
              Curated executive &amp; leadership mandates with verified hiring manager and retained partner contacts across India, UAE, GCC &amp; global hubs.
            </p>
          </div>

          {/* Bottom Live Vault Proof Card & Rotating Trust Pill */}
          <div className="relative z-10 space-y-3 hidden sm:block">
            {mode === 'signup' && (
              <div className="rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/15 px-3.5 py-2.5 backdrop-blur-md">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#E8D08B]">
                  🔒 Lifetime Price Lock Guarantee
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-200">
                  Once you subscribe, lock in today&apos;s rate forever — no future renewal price hikes.
                </p>
              </div>
            )}
            <div className="p-4 rounded-xl bg-[#070C1B]/75 backdrop-blur-md border border-[#D4AF37]/25 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Live Curated Inventory</p>
                  <p className="font-serif text-xl font-bold text-white mt-0.5">
                    12,296+ <span className="text-xs font-sans font-medium text-[#E8D08B]">Active Roles</span>
                  </p>
                </div>
                <div className="flex -space-x-2">
                  <span className="w-7 h-7 rounded-full bg-[#131F40] border border-[#D4AF37]/50 flex items-center justify-center text-[10px] font-bold text-[#E8D08B]">IN</span>
                  <span className="w-7 h-7 rounded-full bg-[#131F40] border border-[#D4AF37]/50 flex items-center justify-center text-[10px] font-bold text-[#E8D08B]">AE</span>
                  <span className="w-7 h-7 rounded-full bg-[#131F40] border border-[#D4AF37]/50 flex items-center justify-center text-[10px] font-bold text-[#E8D08B]">GL</span>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
                <span
                  style={{ opacity: trustOpacity, transition: 'opacity 0.28s ease' }}
                  className="font-medium text-[#E8D08B]/90"
                >
                  {TRUST_MESSAGES[trustIndex]}
                </span>
                
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* RIGHT COLUMN: AUTHENTICATION FORM PANEL (55% ON DESKTOP)          */}
        {/* ================================================================= */}
        <div className="w-full md:w-[55%] md:h-full bg-[#F8FAFC] dark:bg-[#070C1B] flex flex-col justify-between overflow-hidden">
          {/* Top Bar: Segmented Tab Switcher + Desktop Close Button */}
          <div className="px-6 sm:px-8 pt-6 pb-4 bg-white dark:bg-[#0B132B] border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-4 shrink-0">
            {/* Segmented Tab Control */}
            <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 w-full max-w-[300px]" role="tablist">
              <button
                type="button"
                id="tabSignIn"
                role="tab"
                aria-selected={mode === 'signin'}
                onClick={() => {
                  setMode('signin');
                  setSignInError(null);
                  setShowForgotPassword(false);
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-[#0B132B] text-white shadow-sm dark:bg-[#D4AF37] dark:text-[#070C1B]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                id="tabRegister"
                role="tab"
                aria-selected={mode === 'signup'}
                onClick={() => {
                  setMode('signup');
                  setSignUpError('');
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-[#0B132B] text-white shadow-sm dark:bg-[#D4AF37] dark:text-[#070C1B]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Desktop Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close authentication modal"
              className="hidden md:flex w-9 h-9 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white items-center justify-center transition shrink-0 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable Form Content Area */}
          <div className="px-6 sm:px-8 py-6 overflow-y-auto flex-1">
            {/* ============================================================= */}
            {/* PANEL 1: SIGN IN VIEW                                         */}
            {/* ============================================================= */}
            {mode === 'signin' && (
              <div id="panelSignIn" className="animate-in fade-in duration-200">
                <div className="mb-5">
                  <h3 id="modalHeading" className="font-serif text-2xl font-semibold text-[#0B132B] dark:text-white">
                    Welcome back
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Access your Opportunity Vaults and direct hiring contacts.
                  </p>
                </div>

                {signInError && (
                  <Alert variant="error" className="mb-4 text-xs">
                    <div className="space-y-2">
                      <p>{signInError.message}</p>
                      {signInError.code === 'ACCOUNT_NOT_FOUND' && (
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              setMode('signup');
                              setSignUpEmail(signInEmail);
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B132B] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#131F40] cursor-pointer"
                          >
                            Create an account with this email
                          </button>
                        </div>
                      )}
                    </div>
                  </Alert>
                )}

                {/* Sign In Form */}
                <form onSubmit={handleSignInSubmit} className="space-y-4" noValidate>
                  {/* Email Input */}
                  <div>
                    <label htmlFor="loginEmail" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Work or Personal Email
                    </label>
                    <div className="relative">
                      <input
                        id="loginEmail"
                        type="email"
                        required
                        value={signInEmail}
                        onChange={(e) => {
                          setSignInEmail(e.target.value);
                          if (signInFieldError.email) {
                            setSignInFieldError((f) => ({ ...f, email: undefined }));
                          }
                        }}
                        placeholder="arjun.mehta@executive.in"
                        className={`w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#0B132B] border text-sm text-[#0B132B] dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#C59B27] focus:ring-2 focus:ring-[#D4AF37]/25 transition ${
                          signInFieldError.email
                            ? 'border-rose-500 bg-rose-50/20'
                            : 'border-slate-300 dark:border-white/15'
                        }`}
                      />
                    </div>
                    {signInFieldError.email && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1">
                        {signInFieldError.email}
                      </p>
                    )}
                  </div>

                  {/* Password Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="loginPassword" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword((prev) => !prev)}
                        className="text-xs font-semibold text-[#A6801B] hover:text-[#0B132B] dark:text-[#E8D08B] dark:hover:text-white transition cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        id="loginPassword"
                        type={showSignInPassword ? 'text' : 'password'}
                        required
                        value={signInPassword}
                        onChange={(e) => {
                          setSignInPassword(e.target.value);
                          if (signInFieldError.password) {
                            setSignInFieldError((f) => ({ ...f, password: undefined }));
                          }
                        }}
                        placeholder="••••••••••••"
                        className={`w-full px-3.5 py-2.5 pr-10 rounded-xl bg-white dark:bg-[#0B132B] border text-sm text-[#0B132B] dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#C59B27] focus:ring-2 focus:ring-[#D4AF37]/25 transition ${
                          signInFieldError.password
                            ? 'border-rose-500 bg-rose-50/20'
                            : 'border-slate-300 dark:border-white/15'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignInPassword((v) => !v)}
                        aria-label="Toggle password visibility"
                        className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          {showSignInPassword ? (
                            <>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10.58 10.58a2.75 2.75 0 003.84 3.84" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9.36 5.43A9.62 9.62 0 0112 5.25c6 0 9.75 6.75 9.75 6.75a17.6 17.6 0 01-3.19 4.03M6.11 6.11A17.7 17.7 0 002.25 12s3.75 6.75 9.75 6.75c1.2 0 2.3-.27 3.29-.69" />
                            </>
                          ) : (
                            <>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </>
                          )}
                        </svg>
                      </button>
                    </div>
                    {signInFieldError.password && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1">
                        {signInFieldError.password}
                      </p>
                    )}
                  </div>

                  {/* Remember Me */}
                  <div className="flex items-center justify-between pt-0.5">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-4 h-4 rounded border-slate-300 text-[#0B132B] focus:ring-[#D4AF37] cursor-pointer"
                      />
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Keep me signed in for 30 days</span>
                    </label>
                  </div>

                  {/* Submit CTA */}
                  <button
                    type="submit"
                    id="loginSubmitBtn"
                    disabled={signInLoading}
                    className="w-full py-3 px-4 rounded-xl bg-[#0B132B] hover:bg-[#131F40] dark:bg-[#D4AF37] dark:hover:bg-[#C59B27] text-white dark:text-[#070C1B] font-semibold text-sm shadow-lg shadow-[#0B132B]/15 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {signInLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-[#D4AF37] dark:text-[#070C1B]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span>Authenticating Vault Access...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In to Vault</span>
                        <span className="text-[#D4AF37] dark:text-[#070C1B] font-bold">→</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Inline Forgot Password Recovery Box */}
                {showForgotPassword && (
                  <div id="forgotPasswordBox" className="mt-4 p-4 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-[#D4AF37]/40 animate-in fade-in duration-200">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-[#0B132B] dark:text-amber-200 uppercase tracking-wide">Reset Vault Password</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Enter your registered email to receive a secure recovery link.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(false)}
                        className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                    <form onSubmit={handleSendReset} className="mt-3 flex gap-2">
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="name@company.com"
                        className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-[#070C1B] border border-slate-300 dark:border-white/15 text-xs text-[#0B132B] dark:text-white focus:outline-none focus:border-[#C59B27]"
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-2 rounded-lg bg-[#C59B27] hover:bg-[#A6801B] text-[#070C1B] font-semibold text-xs transition cursor-pointer"
                      >
                        Send Link
                      </button>
                    </form>
                    {resetFeedback && (
                      <p className={`text-[11px] font-semibold mt-2 ${resetFeedback.isError ? 'text-rose-600' : 'text-emerald-700 dark:text-emerald-400'}`}>
                        {resetFeedback.message}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ============================================================= */}
            {/* PANEL 2: CREATE ACCOUNT (REGISTRATION) VIEW                   */}
            {/* ============================================================= */}
            {mode === 'signup' && (
              <div id="panelRegister" className="animate-in fade-in duration-200">
                <div className="mb-4">
                  <h3 className="font-serif text-2xl font-semibold text-[#0B132B] dark:text-white">
                    Unlock Direct Access
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Create your free account to explore curated roles before choosing a vault.
                  </p>
                </div>

                {invalidReferralCode && (
                  <Alert variant="warning" className="mb-3 text-xs">
                    The referral link contained an invalid code. You can still create an account freely.
                  </Alert>
                )}

                {signUpReferralCode && (
                  <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200 flex items-center gap-2">
                    <span>✨</span>
                    <span>
                      Referred with code <strong className="font-mono">{signUpReferralCode}</strong>
                    </span>
                  </div>
                )}

                {guestResume && (
                  <div className="mb-3 rounded-xl border border-[#D4AF37]/30 bg-[#FFF3D9] px-3.5 py-2 text-xs text-[#7A5A1E] dark:border-[#D4AF37]/30 dark:bg-brand-950 dark:text-brand-200">
                    📄 You uploaded <strong>{guestResume.originalName}</strong> — it will be linked to your new account.
                  </div>
                )}

                {signUpError && (
                  <Alert variant="error" className="mb-3 text-xs">
                    {signUpError}
                  </Alert>
                )}

                <form onSubmit={handleSignUpSubmit} className="space-y-3.5" noValidate>
                  {/* Full Name */}
                  <div>
                    <label htmlFor="regName" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Full Name
                    </label>
                    <input
                      id="regName"
                      type="text"
                      required
                      value={signUpFullName}
                      onChange={(e) => {
                        setSignUpFullName(e.target.value);
                        clearSignUpField('fullName');
                      }}
                      placeholder="e.g., Priya Nair"
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#0B132B] border text-sm text-[#0B132B] dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#C59B27] focus:ring-2 focus:ring-[#D4AF37]/25 transition ${
                        signUpFieldErrors.fullName
                          ? 'border-rose-500 bg-rose-50/20'
                          : 'border-slate-300 dark:border-white/15'
                      }`}
                    />
                    {signUpFieldErrors.fullName && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1">
                        {signUpFieldErrors.fullName}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="regEmail" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Email Address
                    </label>
                    <input
                      id="regEmail"
                      type="email"
                      required
                      value={signUpEmail}
                      onChange={(e) => {
                        setSignUpEmail(e.target.value);
                        clearSignUpField('email');
                      }}
                      placeholder="priya@domain.com"
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#0B132B] border text-sm text-[#0B132B] dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#C59B27] focus:ring-2 focus:ring-[#D4AF37]/25 transition ${
                        signUpFieldErrors.email
                          ? 'border-rose-500 bg-rose-50/20'
                          : 'border-slate-300 dark:border-white/15'
                      }`}
                    />
                    {signUpFieldErrors.email && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1">
                        {signUpFieldErrors.email}
                      </p>
                    )}
                  </div>

                  {/* Phone (optional) */}
                  <div>
                    <label htmlFor="regPhone" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Phone / WhatsApp (Optional)
                    </label>
                    <input
                      id="regPhone"
                      type="tel"
                      autoComplete="tel"
                      value={signUpPhone}
                      onChange={(e) => {
                        setSignUpPhone(e.target.value);
                        clearSignUpField('phone');
                      }}
                      placeholder="+91 98765 43210"
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#0B132B] border text-sm text-[#0B132B] dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#C59B27] focus:ring-2 focus:ring-[#D4AF37]/25 transition ${
                        signUpFieldErrors.phone
                          ? 'border-rose-500 bg-rose-50/20'
                          : 'border-slate-300 dark:border-white/15'
                      }`}
                    />
                    {signUpFieldErrors.phone && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1">
                        {signUpFieldErrors.phone}
                      </p>
                    )}
                  </div>

                  {/* Password with Live Strength Indicator */}
                  <div>
                    <label htmlFor="regPassword" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Create Password
                    </label>
                    <div className="relative">
                      <input
                        id="regPassword"
                        type={showSignUpPassword ? 'text' : 'password'}
                        required
                        value={signUpPassword}
                        onChange={(e) => {
                          setSignUpPassword(e.target.value);
                          clearSignUpField('password');
                          clearSignUpField('confirm');
                        }}
                        placeholder="Min. 8 characters with number & symbol"
                        className={`w-full px-3.5 py-2.5 pr-10 rounded-xl bg-white dark:bg-[#0B132B] border text-sm text-[#0B132B] dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#C59B27] focus:ring-2 focus:ring-[#D4AF37]/25 transition ${
                          signUpFieldErrors.password
                            ? 'border-rose-500 bg-rose-50/20'
                            : 'border-slate-300 dark:border-white/15'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignUpPassword((v) => !v)}
                        aria-label="Toggle password visibility"
                        className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          {showSignUpPassword ? (
                            <>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10.58 10.58a2.75 2.75 0 003.84 3.84" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9.36 5.43A9.62 9.62 0 0112 5.25c6 0 9.75 6.75 9.75 6.75a17.6 17.6 0 01-3.19 4.03M6.11 6.11A17.7 17.7 0 002.25 12s3.75 6.75 9.75 6.75c1.2 0 2.3-.27 3.29-.69" />
                            </>
                          ) : (
                            <>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </>
                          )}
                        </svg>
                      </button>
                    </div>

                    {/* Strength Meter Bars */}
                    <div className="mt-2 flex items-center gap-1.5">
                      <div className={`h-1 flex-1 rounded-full transition-colors ${passwordScore >= 1 ? 'bg-rose-500' : 'bg-slate-200 dark:bg-white/10'}`} />
                      <div className={`h-1 flex-1 rounded-full transition-colors ${passwordScore >= 2 ? 'bg-amber-500' : 'bg-slate-200 dark:bg-white/10'}`} />
                      <div className={`h-1 flex-1 rounded-full transition-colors ${passwordScore >= 3 ? 'bg-[#C59B27]' : 'bg-slate-200 dark:bg-white/10'}`} />
                      <div className={`h-1 flex-1 rounded-full transition-colors ${passwordScore >= 4 ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-white/10'}`} />
                      <span className={`text-[10px] font-semibold ml-1 min-w-[52px] text-right ${passwordScore >= 3 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                        {signUpPassword.length === 0 ? 'Strength' : strengthLabels[passwordScore]}
                      </span>
                    </div>

                    {showPasswordMessage && (
                      <p className="mt-1 text-[11px] leading-tight text-red-600 dark:text-red-400 font-medium">
                        {passwordMessage}
                      </p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label htmlFor="regConfirm" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Confirm Password
                    </label>
                    <input
                      id="regConfirm"
                      type={showSignUpPassword ? 'text' : 'password'}
                      required
                      value={signUpConfirm}
                      onChange={(e) => {
                        setSignUpConfirm(e.target.value);
                        clearSignUpField('confirm');
                      }}
                      placeholder="Re-enter your password"
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#0B132B] border text-sm text-[#0B132B] dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#C59B27] focus:ring-2 focus:ring-[#D4AF37]/25 transition ${
                        signUpFieldErrors.confirm
                          ? 'border-rose-500 bg-rose-50/20'
                          : 'border-slate-300 dark:border-white/15'
                      }`}
                    />
                    {signUpFieldErrors.confirm && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1">
                        {signUpFieldErrors.confirm}
                      </p>
                    )}
                  </div>

                  {/* Referral Code (optional) */}
                  <div>
                    <label htmlFor="regReferral" className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Referral Code (Optional)
                    </label>
                    <input
                      id="regReferral"
                      type="text"
                      autoComplete="off"
                      value={signUpReferralCode}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setSignUpReferralCode(val);
                        clearSignUpField('referralCode');
                      }}
                      placeholder="REF-XXXXXXXXXX"
                      maxLength={14}
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#0B132B] border border-slate-300 dark:border-white/15 text-xs sm:text-sm font-mono uppercase text-[#0B132B] dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#C59B27] focus:ring-2 focus:ring-[#D4AF37]/25 transition"
                    />
                    {signUpFieldErrors.referralCode && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1">
                        {signUpFieldErrors.referralCode}
                      </p>
                    )}
                  </div>

                  {/* Candidate Privacy & Terms Consent */}
                  <div className="pt-1">
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        id="regConsent"
                        type="checkbox"
                        required
                        checked={agreedTerms}
                        onChange={(e) => {
                          setAgreedTerms(e.target.checked);
                          clearSignUpField('terms');
                        }}
                        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#0B132B] focus:ring-[#D4AF37] cursor-pointer"
                      />
                      <span className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                        I agree to Gravitas Edge Consulting’s{' '}
                        <Link
                          href="/terms-and-conditions"
                          onClick={onClose}
                          className="font-semibold text-[#0B132B] dark:text-[#E8D08B] underline decoration-[#C59B27]"
                        >
                          Terms of Engagement
                        </Link>{' '}
                        &amp;{' '}
                        <Link
                          href="/privacy-policy"
                          onClick={onClose}
                          className="font-semibold text-[#0B132B] dark:text-[#E8D08B] underline decoration-[#C59B27]"
                        >
                          Candidate Privacy Notice
                        </Link>
                        .
                      </span>
                    </label>
                    {signUpFieldErrors.terms && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1">
                        {signUpFieldErrors.terms}
                      </p>
                    )}
                  </div>

                  {/* Primary CTA */}
                  <button
                    type="submit"
                    id="regSubmitBtn"
                    disabled={signUpLoading}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#0B132B] via-[#131F40] to-[#0B132B] dark:from-[#D4AF37] dark:via-[#C59B27] dark:to-[#D4AF37] hover:brightness-110 text-white dark:text-[#070C1B] font-semibold text-sm shadow-lg shadow-[#0B132B]/15 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {signUpLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-[#D4AF37] dark:text-[#070C1B]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <>
                        <span>Create Free Account</span>
                        <span className="text-[#D4AF37] dark:text-[#070C1B] font-bold">→</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>

          
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

/**
 * Dedicated helper components if the caller prefers separate modal wrappers.
 */
export function SignInModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return <AuthModal isOpen={isOpen} onClose={onClose} initialMode="signin" />;
}

export function SignUpModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return <AuthModal isOpen={isOpen} onClose={onClose} initialMode="signup" />;
}
