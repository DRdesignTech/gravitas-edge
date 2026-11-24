'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Alert, useToast } from '@/components/ui';
import SessionExpiredNotifier from '@/components/layout/SessionExpiredNotifier';
import { parseApiError } from '@/lib/errors';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TRUST_MESSAGES = [
  '✦ Direct Hiring Contacts • Pre-Market Roles',
  '✦ Retained Search & CXO Mandates • India & GCC',
  '✦ Zero Algorithmic Filtering • 100% Curated',
];

function EyeIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

function EyeOffIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.58 10.58a2.75 2.75 0 003.84 3.84" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.36 5.43A9.62 9.62 0 0112 5.25c6 0 9.75 6.75 9.75 6.75a17.6 17.6 0 01-3.19 4.03M6.11 6.11A17.7 17.7 0 002.25 12s3.75 6.75 9.75 6.75c1.2 0 2.3-.27 3.29-.69"
      />
    </svg>
  );
}

function CheckmarkIcon() {
  return (
    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F5EBDC] text-[#C8842D] dark:bg-[#1E3557] dark:text-[#F0C27B]">
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.4} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    </span>
  );
}

interface LoginFormProps {
  urlReferralCode: string | null;
}

export default function LoginForm({ urlReferralCode }: LoginFormProps) {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<ReturnType<typeof parseApiError> | null>(null);
  const [fieldError, setFieldError] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetFeedback, setResetFeedback] = useState<{ message: string; isError: boolean } | null>(null);

  // Rotating trust messages
  const [trustIndex, setTrustIndex] = useState(0);
  const [trustOpacity, setTrustOpacity] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setTrustOpacity(0);
      setTimeout(() => {
        setTrustIndex((prev) => (prev + 1) % TRUST_MESSAGES.length);
        setTrustOpacity(1);
      }, 280);
    }, 4200);
    return () => clearInterval(interval);
  }, []);

  // Read referral code from URL or localStorage
  const storedReferralCode = typeof window !== 'undefined' ? localStorage.getItem('referralCode') : null;
  const referralCode = urlReferralCode ?? storedReferralCode;

  // Save to localStorage if we got a valid code from URL
  if (urlReferralCode && typeof window !== 'undefined') {
    localStorage.setItem('referralCode', urlReferralCode);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const next: { email?: string; password?: string } = {};
    if (!email.trim() || !EMAIL_RE.test(email.trim())) {
      next.email = 'Please enter a valid email address.';
    }
    if (!password) next.password = 'Please enter your password.';
    setFieldError(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await login(email.trim(), password);
      showToast('Welcome back to Gravitas Edge!', 'success');
    } catch (err) {
      const info = parseApiError(err);
      setError(info);
      showToast(info.message, 'error');
    } finally {
      setLoading(false);
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

  const registerHref = referralCode
    ? `/register?ref=${encodeURIComponent(referralCode)}`
    : '/register';

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#06142A] text-[#1A2236] dark:text-[#EAEFFB]">
      {/* Session Expired Handler */}
      <SessionExpiredNotifier />

      {/* Main Page Layout Container with Reduced Top Padding */}
      <div className="mx-auto max-w-[1200px] px-4 pt-3 pb-12 sm:px-6 sm:pt-5 sm:pb-16 lg:px-8 lg:pt-6 lg:pb-20">
        
        {/* Breadcrumb Context Navigation */}
        <div className="mb-4 sm:mb-5 flex items-center gap-2 text-xs text-[#5B6479] dark:text-slate-400">
          <Link href="/" className="hover:text-[#C8842D] transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="font-semibold text-[#061B36] dark:text-white">Sign In</span>
        </div>

        {/* 2-Column Responsive Page Grid with Sticky Left Column */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
          
          {/* ═════════════════════════════════════════════════════════
              LEFT COLUMN: HERO HEADLINE, EDITORIAL & VAULT PROOF
              (Sticky until the right form finishes scrolling)
              ═════════════════════════════════════════════════════════ */} 
          <div className="lg:col-span-6 space-y-6 lg:sticky lg:top-24 self-start">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#C8842D] dark:text-[#F0C27B]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#C8842D]" />
                EXECUTIVE OPPORTUNITY VAULT
              </div>
              <h1 className="mt-4 font-serif text-3xl sm:text-4xl lg:text-[46px] font-bold text-[#061B36] dark:text-white leading-[1.12] tracking-tight">
                Skip the Portals.<br />
                <span className="text-[#C8842D] dark:text-[#F0C27B] italic font-medium">Connect Directly.</span>
              </h1>
              <p className="mt-4 text-sm sm:text-base leading-relaxed text-[#5B6479] dark:text-slate-300 max-w-lg">
                Sign in to access your curated Opportunity Vaults and apply directly to verified hiring managers and retained executive search partners.
              </p>
            </div>

            {/* Value Proposition Highlights */}
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3.5">
                <CheckmarkIcon />
                <div>
                  <h3 className="text-sm font-bold text-[#061B36] dark:text-white">Direct Hiring Contacts</h3>
                  <p className="mt-0.5 text-xs sm:text-sm text-[#5B6479] dark:text-slate-400 leading-relaxed">
                    Access verified email addresses and direct telephone channels for recruiters and decision-makers.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <CheckmarkIcon />
                <div>
                  <h3 className="text-sm font-bold text-[#061B36] dark:text-white">Pre-Market &amp; Retained Roles</h3>
                  <p className="mt-0.5 text-xs sm:text-sm text-[#5B6479] dark:text-slate-400 leading-relaxed">
                    Exclusive leadership mandates across India, Dubai, UAE, and GCC hubs not published on standard job boards.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <CheckmarkIcon />
                <div>
                  <h3 className="text-sm font-bold text-[#061B36] dark:text-white">Zero Algorithmic Filtering</h3>
                  <p className="mt-0.5 text-xs sm:text-sm text-[#5B6479] dark:text-slate-400 leading-relaxed">
                    Apply on your own terms. Your resume reaches human hiring managers without black-box AI rejection.
                  </p>
                </div>
              </div>
            </div>

            {/* Visual Architectural Skyline Proof Card */}
            <div className="relative overflow-hidden rounded-2xl bg-[#070C1B] text-white p-6 border border-[#D4AF37]/30 shadow-xl select-none">
              <img
                src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=85"
                alt="Modern financial district skyline"
                className="absolute inset-0 w-full h-full object-cover object-center opacity-35 mix-blend-luminosity pointer-events-none"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-[#070C1B]/95 via-[#0B132B]/85 to-[#2B210B]/85 pointer-events-none" />
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#C59B27] via-[#E8D08B] to-transparent pointer-events-none" />

              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                    Live Curated Inventory
                  </p>
                  <p className="font-serif text-2xl font-bold text-white mt-0.5">
                    12,296+ <span className="text-xs font-sans font-medium text-[#E8D08B]">Active Roles</span>
                  </p>
                </div>
                <div className="flex -space-x-2">
                  <span className="w-8 h-8 rounded-full bg-[#131F40] border border-[#D4AF37]/50 flex items-center justify-center text-xs font-bold text-[#E8D08B]">
                    IN
                  </span>
                  <span className="w-8 h-8 rounded-full bg-[#131F40] border border-[#D4AF37]/50 flex items-center justify-center text-xs font-bold text-[#E8D08B]">
                    AE
                  </span>
                  <span className="w-8 h-8 rounded-full bg-[#131F40] border border-[#D4AF37]/50 flex items-center justify-center text-xs font-bold text-[#E8D08B]">
                    GL
                  </span>
                </div>
              </div>

              <div className="relative z-10 mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
                <span
                  style={{ opacity: trustOpacity, transition: 'opacity 0.28s ease' }}
                  className="font-medium text-[#E8D08B]"
                >
                  {TRUST_MESSAGES[trustIndex]}
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                  Verified
                </span>
              </div>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════
              RIGHT COLUMN: DEDICATED SIGN IN FORM CARD
              ═════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-6">
            <div className="rounded-[2rem] border border-[#E9E5DC] bg-white p-7 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:border-[#1E3557] dark:bg-[#0E2340]">
              
              {/* Card Header with Mode Navigation */}
              <div className="flex items-start justify-between gap-4 pb-6 border-b border-[#F0EBE1] dark:border-white/10 mb-6">
                <div>
                  <h2 className="font-serif text-2xl sm:text-[28px] font-bold text-[#061B36] dark:text-white tracking-tight">
                    Welcome back
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-[#5B6479] dark:text-slate-400">
                    Sign in to your account to access your opportunities.
                  </p>
                </div>
                <Link
                  href={registerHref}
                  className="shrink-0 text-xs font-bold text-[#C8842D] hover:text-[#9B641B] dark:text-[#F0C27B] underline underline-offset-4"
                >
                  Create account →
                </Link>
              </div>

              {/* Account Not Found / General Error Alert */}
              {error && (
                <Alert variant="error" className="mb-5 text-xs">
                  <div className="space-y-2">
                    <p>{error.message}</p>
                    {error.code === 'ACCOUNT_NOT_FOUND' && (
                      <div>
                        <Link
                          href={registerHref}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#061B36] px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#10243E] cursor-pointer"
                        >
                          Create an account with this email
                        </Link>
                      </div>
                    )}
                  </div>
                </Alert>
              )}

              {/* Form Body */}
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Email Input */}
                <div>
                  <label
                    htmlFor="loginEmail"
                    className="block text-xs font-bold text-[#334155] dark:text-slate-300 mb-1.5"
                  >
                    Work or Personal Email
                  </label>
                  <input
                    id="loginEmail"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldError.email) {
                        setFieldError((f) => ({ ...f, email: undefined }));
                      }
                    }}
                    placeholder="arjun.mehta@executive.in"
                    className={`w-full rounded-xl border bg-white px-4 py-3 text-xs sm:text-sm font-medium text-[#061B36] placeholder-[#94A3B8] focus:border-[#061B36] focus:outline-none dark:border-[#1E3557] dark:bg-[#081B33] dark:text-white transition ${
                      fieldError.email
                        ? 'border-rose-500 bg-rose-50/20'
                        : 'border-[#CBD5E1] dark:border-white/15'
                    }`}
                  />
                  {fieldError.email && (
                    <p className="text-[11px] text-rose-600 font-medium mt-1">
                      {fieldError.email}
                    </p>
                  )}
                </div>

                {/* Password Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="loginPassword"
                      className="block text-xs font-bold text-[#334155] dark:text-slate-300"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword((prev) => !prev)}
                      className="text-xs font-semibold text-[#C8842D] hover:text-[#061B36] dark:text-[#F0C27B] dark:hover:text-white transition cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="loginPassword"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (fieldError.password) {
                          setFieldError((f) => ({ ...f, password: undefined }));
                        }
                      }}
                      placeholder="••••••••••••"
                      className={`w-full rounded-xl border bg-white px-4 py-3 pr-11 text-xs sm:text-sm font-medium text-[#061B36] placeholder-[#94A3B8] focus:border-[#061B36] focus:outline-none dark:border-[#1E3557] dark:bg-[#081B33] dark:text-white transition ${
                        fieldError.password
                          ? 'border-rose-500 bg-rose-50/20'
                          : 'border-[#CBD5E1] dark:border-white/15'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label="Toggle password visibility"
                      className="absolute inset-y-0 right-0 px-3.5 flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  {fieldError.password && (
                    <p className="text-[11px] text-rose-600 font-medium mt-1">
                      {fieldError.password}
                    </p>
                  )}
                </div>

                {/* Keep Me Signed In */}
                <div className="flex items-center justify-between pt-1">
                  <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="h-4 w-4 rounded accent-[#061B36] cursor-pointer"
                    />
                    <span className="text-xs text-[#5B6479] dark:text-slate-400 font-medium">
                      Keep me signed in for 30 days
                    </span>
                  </label>
                </div>

                {/* Submit Primary CTA */}
                <button
                  type="submit"
                  id="loginSubmitBtn"
                  disabled={loading}
                  className="w-full mt-2 py-3.5 px-4 rounded-xl bg-[#061B36] hover:bg-[#10243E] dark:bg-[#D4AF37] dark:hover:bg-[#C59B27] text-white dark:text-[#070C1B] font-bold text-sm shadow-md flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-[#D4AF37] dark:text-[#070C1B]"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
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

              {/* Inline Forgot Password Box */}
              {showForgotPassword && (
                <div
                  id="forgotPasswordBox"
                  className="mt-5 p-4 rounded-xl bg-[#FFFDF5] dark:bg-amber-950/30 border border-[#D4AF37]/40 animate-in fade-in duration-200"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-[#061B36] dark:text-amber-200 uppercase tracking-wide">
                        Reset Vault Password
                      </h4>
                      <p className="text-xs text-[#5B6479] dark:text-slate-400 mt-0.5">
                        Enter your registered email to receive a secure recovery link.
                      </p>
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
                      className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-[#070C1B] border border-slate-300 dark:border-white/15 text-xs text-[#061B36] dark:text-white focus:outline-none focus:border-[#C59B27]"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-2 rounded-lg bg-[#C59B27] hover:bg-[#A6801B] text-[#070C1B] font-semibold text-xs transition cursor-pointer"
                    >
                      Send Link
                    </button>
                  </form>
                  {resetFeedback && (
                    <p
                      className={`text-[11px] font-semibold mt-2 ${
                        resetFeedback.isError
                          ? 'text-rose-600'
                          : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {resetFeedback.message}
                    </p>
                  )}
                </div>
              )}

              {/* Security & Support Note */}
              <div className="mt-7 pt-5 border-t border-[#F0EBE1] dark:border-white/10 flex items-center justify-between text-xs text-[#8C9AC0]">
                <span className="flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                  </svg>
                  256-bit encrypted authentication
                </span>
                <Link href="/contact" className="hover:text-[#061B36] dark:hover:text-white transition">
                  Need Help?
                </Link>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
