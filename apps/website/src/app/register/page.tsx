'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useGuestResume } from '@/lib/guest-resume';
import { linkGuestResume } from '@/lib/services';
import { Alert, useToast } from '@/components/ui';
import { BRAND_NAME } from '@/components/brand/BrandLogo';
import { getErrorMessage } from '@/lib/errors';
import { getPasswordError } from '@/lib/password';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REFERRAL_CODE_RE = /^REF-[A-Z2-9]{10}$/;

const TRUST_MESSAGES = [
  '✦ Direct Hiring Contacts • Pre-Market Roles',
  '✦ Retained Search & CXO Mandates • India & GCC',
  '✦ Zero Algorithmic Filtering • 100% Curated',
];

interface FieldErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirm?: string;
  terms?: string;
  referralCode?: string;
}

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

function RegisterForm() {
  const searchParams = useSearchParams();
  const refParam = searchParams.get('ref');
  const urlReferralCode = refParam && REFERRAL_CODE_RE.test(refParam) ? refParam : null;
  const invalidReferralCode = refParam && !urlReferralCode;

  // Persist referral code in localStorage for cross-page navigation
  const storedReferralCode =
    typeof window !== 'undefined' ? localStorage.getItem('referralCode') : null;
  const initialReferralCode = urlReferralCode ?? storedReferralCode ?? '';

  // Save to localStorage if we got a valid code from URL
  if (urlReferralCode && typeof window !== 'undefined') {
    localStorage.setItem('referralCode', urlReferralCode);
  }

  const { register } = useAuth();
  const { guestToken, guestResume, clearGuestResume } = useGuestResume();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [referralCode, setReferralCode] = useState(initialReferralCode);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

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

  // Live password validation
  const livePasswordError = password.length > 0 ? getPasswordError(password) : undefined;
  const passwordMessage = fieldErrors.password ?? livePasswordError;
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
  const passwordScore = calculateStrength(password);
  const strengthLabels = ['Strength', 'Weak', 'Fair', 'Strong', 'Executive'];

  const clearField = useCallback((field: keyof FieldErrors) => {
    setFieldErrors((f) => ({ ...f, [field]: undefined }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const next: FieldErrors = {};
    if (!fullName.trim()) next.fullName = 'Please enter your full name.';
    if (!EMAIL_RE.test(email.trim())) next.email = 'Please enter a valid email.';
    const passwordError = getPasswordError(password);
    if (passwordError) next.password = passwordError;
    if (confirm !== password) next.confirm = 'Passwords do not match.';
    if (!agreedTerms) {
      next.terms = 'Please accept the Candidate Privacy Notice and Terms of Engagement.';
    }
    if (referralCode.trim() && !REFERRAL_CODE_RE.test(referralCode.trim())) {
      next.referralCode = 'Invalid referral code format.';
    }
    setFieldErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await register(
        fullName.trim(),
        email.trim(),
        password,
        referralCode.trim() || undefined,
      );

      if (typeof window !== 'undefined') {
        localStorage.removeItem('referralCode');
      }

      if (guestToken) {
        try {
          await linkGuestResume(guestToken);
          clearGuestResume();
          showToast('Your resume has been linked to your account.', 'success');
        } catch {
          // Best effort
        }
      }

      showToast(`Account created! Welcome to ${BRAND_NAME}.`, 'success');
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#06142A] text-[#1A2236] dark:text-[#EAEFFB]">
      {/* Main Page Layout Container with Reduced Top Padding */}
      <div className="mx-auto max-w-[1200px] px-4 pt-3 pb-12 sm:px-6 sm:pt-5 sm:pb-16 lg:px-8 lg:pt-6 lg:pb-20">
        
        {/* Breadcrumb Navigation */}
        <div className="mb-4 sm:mb-5 flex items-center gap-2 text-xs text-[#5B6479] dark:text-slate-400">
          <Link href="/" className="hover:text-[#C8842D] transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="font-semibold text-[#061B36] dark:text-white">Create Account</span>
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
                MEMBER REGISTRATION · OPPORTUNITY VAULT
              </div>
              <h1 className="mt-4 font-serif text-3xl sm:text-4xl lg:text-[46px] font-bold text-[#061B36] dark:text-white leading-[1.12] tracking-tight">
                Unlock Direct Access.<br />
                <span className="text-[#C8842D] dark:text-[#F0C27B] italic font-medium">Explore Pre-Market Roles.</span>
              </h1>
              <p className="mt-4 text-sm sm:text-base leading-relaxed text-[#5B6479] dark:text-slate-300 max-w-lg">
                Create your free account to explore curated executive mandates, preview opportunities, and apply directly to verified decision-makers.
              </p>
            </div>

            {/* Value Proposition Highlights */}
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3.5">
                <CheckmarkIcon />
                <div>
                  <h3 className="text-sm font-bold text-[#061B36] dark:text-white">Direct Recruiter &amp; CXO Contacts</h3>
                  <p className="mt-0.5 text-xs sm:text-sm text-[#5B6479] dark:text-slate-400 leading-relaxed">
                    Skip anonymous applicant tracking systems. Reach verified hiring managers directly by email and phone.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <CheckmarkIcon />
                <div>
                  <h3 className="text-sm font-bold text-[#061B36] dark:text-white">Executive Tier Segmentation</h3>
                  <p className="mt-0.5 text-xs sm:text-sm text-[#5B6479] dark:text-slate-400 leading-relaxed">
                    Opportunity Vaults categorized by leadership tenure: Career, Professional, Leadership, Executive &amp; Global Access.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <CheckmarkIcon />
                <div>
                  <h3 className="text-sm font-bold text-[#061B36] dark:text-white">Automatic Resume Linking</h3>
                  <p className="mt-0.5 text-xs sm:text-sm text-[#5B6479] dark:text-slate-400 leading-relaxed">
                    Any resume uploaded prior to registration is instantly linked to your new profile — ready for matching.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <CheckmarkIcon />
                <div>
                  <h3 className="text-sm font-bold text-[#061B36] dark:text-white">Zero Third-Party Data Selling</h3>
                  <p className="mt-0.5 text-xs sm:text-sm text-[#5B6479] dark:text-slate-400 leading-relaxed">
                    Your candidate data is strictly guarded under comprehensive candidate privacy and confidentiality standards.
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
              RIGHT COLUMN: DEDICATED REGISTRATION FORM CARD
              ═════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-6">
            <div className="rounded-[2rem] border border-[#E9E5DC] bg-white p-7 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:border-[#1E3557] dark:bg-[#0E2340]">
              
              {/* Card Header with Mode Navigation */}
              <div className="flex items-start justify-between gap-4 pb-6 border-b border-[#F0EBE1] dark:border-white/10 mb-6">
                <div>
                  <h2 className="font-serif text-2xl sm:text-[28px] font-bold text-[#061B36] dark:text-white tracking-tight">
                    Create your account
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-[#5B6479] dark:text-slate-400">
                    No payment required to create an account and explore.
                  </p>
                </div>
                <Link
                  href="/login"
                  className="shrink-0 text-xs font-bold text-[#C8842D] hover:text-[#9B641B] dark:text-[#F0C27B] underline underline-offset-4"
                >
                  Sign in →
                </Link>
              </div>

              {/* Status & Feedback Alerts */}
              {invalidReferralCode && (
                <Alert variant="warning" className="mb-4 text-xs">
                  The referral link contained an invalid code. You can still create an account freely.
                </Alert>
              )}

              {referralCode && (
                <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200 flex items-center gap-2">
                  <span>✨</span>
                  <span>
                    Referred with code <strong className="font-mono">{referralCode}</strong>
                  </span>
                </div>
              )}

              {guestResume && (
                <div className="mb-4 rounded-xl border border-[#D4AF37]/30 bg-[#FFF3D9] px-3.5 py-2.5 text-xs text-[#7A5A1E] dark:border-[#D4AF37]/30 dark:bg-brand-950 dark:text-brand-200">
                  📄 You uploaded <strong>{guestResume.originalName}</strong> — it will be linked to your new account automatically.
                </div>
              )}

              {error && (
                <Alert variant="error" className="mb-4 text-xs">
                  {error}
                </Alert>
              )}

              {/* Form Body */}
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Full Name */}
                <div>
                  <label
                    htmlFor="regName"
                    className="block text-xs font-bold text-[#334155] dark:text-slate-300 mb-1.5"
                  >
                    Full Name *
                  </label>
                  <input
                    id="regName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      clearField('fullName');
                    }}
                    placeholder="e.g., Priya Nair"
                    className={`w-full rounded-xl border bg-white px-4 py-3 text-xs sm:text-sm font-medium text-[#061B36] placeholder-[#94A3B8] focus:border-[#061B36] focus:outline-none dark:border-[#1E3557] dark:bg-[#081B33] dark:text-white transition ${
                      fieldErrors.fullName
                        ? 'border-rose-500 bg-rose-50/20'
                        : 'border-[#CBD5E1] dark:border-white/15'
                    }`}
                  />
                  {fieldErrors.fullName && (
                    <p className="text-[11px] text-rose-600 font-medium mt-1">
                      {fieldErrors.fullName}
                    </p>
                  )}
                </div>

                {/* Email Address */}
                <div>
                  <label
                    htmlFor="regEmail"
                    className="block text-xs font-bold text-[#334155] dark:text-slate-300 mb-1.5"
                  >
                    Email Address *
                  </label>
                  <input
                    id="regEmail"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearField('email');
                    }}
                    placeholder="priya@domain.com"
                    className={`w-full rounded-xl border bg-white px-4 py-3 text-xs sm:text-sm font-medium text-[#061B36] placeholder-[#94A3B8] focus:border-[#061B36] focus:outline-none dark:border-[#1E3557] dark:bg-[#081B33] dark:text-white transition ${
                      fieldErrors.email
                        ? 'border-rose-500 bg-rose-50/20'
                        : 'border-[#CBD5E1] dark:border-white/15'
                    }`}
                  />
                  {fieldErrors.email && (
                    <p className="text-[11px] text-rose-600 font-medium mt-1">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                {/* Password with Live Strength Indicator */}
                <div>
                  <label
                    htmlFor="regPassword"
                    className="block text-xs font-bold text-[#334155] dark:text-slate-300 mb-1.5"
                  >
                    Create Password *
                  </label>
                  <div className="relative">
                    <input
                      id="regPassword"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearField('password');
                        clearField('confirm');
                      }}
                      placeholder="Min. 8 characters with number & symbol"
                      className={`w-full rounded-xl border bg-white px-4 py-3 pr-11 text-xs sm:text-sm font-medium text-[#061B36] placeholder-[#94A3B8] focus:border-[#061B36] focus:outline-none dark:border-[#1E3557] dark:bg-[#081B33] dark:text-white transition ${
                        fieldErrors.password
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

                  {/* Password Strength Meter Bars */}
                  <div className="mt-2 flex items-center gap-1.5">
                    <div
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        passwordScore >= 1 ? 'bg-rose-500' : 'bg-slate-200 dark:bg-white/10'
                      }`}
                    />
                    <div
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        passwordScore >= 2 ? 'bg-amber-500' : 'bg-slate-200 dark:bg-white/10'
                      }`}
                    />
                    <div
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        passwordScore >= 3 ? 'bg-[#C59B27]' : 'bg-slate-200 dark:bg-white/10'
                      }`}
                    />
                    <div
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        passwordScore >= 4 ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-white/10'
                      }`}
                    />
                    <span
                      className={`text-[10px] font-semibold ml-1 min-w-[54px] text-right ${
                        passwordScore >= 3
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {password.length === 0 ? 'Strength' : strengthLabels[passwordScore]}
                    </span>
                  </div>

                  {showPasswordMessage && (
                    <p className="mt-1 text-[11px] leading-tight text-rose-600 dark:text-rose-400 font-medium">
                      {passwordMessage}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="regConfirm"
                    className="block text-xs font-bold text-[#334155] dark:text-slate-300 mb-1.5"
                  >
                    Confirm Password *
                  </label>
                  <input
                    id="regConfirm"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirm}
                    onChange={(e) => {
                      setConfirm(e.target.value);
                      clearField('confirm');
                    }}
                    placeholder="Re-enter your password"
                    className={`w-full rounded-xl border bg-white px-4 py-3 text-xs sm:text-sm font-medium text-[#061B36] placeholder-[#94A3B8] focus:border-[#061B36] focus:outline-none dark:border-[#1E3557] dark:bg-[#081B33] dark:text-white transition ${
                      fieldErrors.confirm
                        ? 'border-rose-500 bg-rose-50/20'
                        : 'border-[#CBD5E1] dark:border-white/15'
                    }`}
                  />
                  {fieldErrors.confirm && (
                    <p className="text-[11px] text-rose-600 font-medium mt-1">
                      {fieldErrors.confirm}
                    </p>
                  )}
                </div>

                {/* Referral Code (optional) */}
                <div>
                  <label
                    htmlFor="regReferral"
                    className="block text-xs font-bold text-[#334155] dark:text-slate-300 mb-1.5"
                  >
                    Referral Code (Optional)
                  </label>
                  <input
                    id="regReferral"
                    type="text"
                    autoComplete="off"
                    value={referralCode}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setReferralCode(val);
                      clearField('referralCode');
                    }}
                    placeholder="REF-XXXXXXXXXX"
                    maxLength={14}
                    className="w-full rounded-xl border border-[#CBD5E1] bg-white px-4 py-2.5 text-xs sm:text-sm font-mono uppercase text-[#061B36] placeholder-[#94A3B8] focus:border-[#061B36] focus:outline-none dark:border-[#1E3557] dark:bg-[#081B33] dark:text-white transition"
                  />
                  {fieldErrors.referralCode && (
                    <p className="text-[11px] text-rose-600 font-medium mt-1">
                      {fieldErrors.referralCode}
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
                        clearField('terms');
                      }}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[#061B36] cursor-pointer"
                    />
                    <span className="text-xs leading-relaxed text-[#5B6479] dark:text-slate-400">
                      I agree to Gravitas Edge Consulting’s{' '}
                      <Link
                        href="/terms-and-conditions"
                        className="font-medium text-[#061B36] dark:text-[#E8D08B] underline decoration-[#C8842D] hover:text-[#C8842D]"
                      >
                        Terms of Engagement
                      </Link>{' '}
                      &amp;{' '}
                      <Link
                        href="/privacy-policy"
                        className="font-medium text-[#061B36] dark:text-[#E8D08B] underline decoration-[#C8842D] hover:text-[#C8842D]"
                      >
                        Candidate Privacy Notice
                      </Link>
                      .
                    </span>
                  </label>
                  {fieldErrors.terms && (
                    <p className="text-[11px] text-rose-600 font-medium mt-1">
                      {fieldErrors.terms}
                    </p>
                  )}
                </div>

                {/* Submit Primary CTA */}
                <button
                  type="submit"
                  id="regSubmitBtn"
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

              {/* Security & Support Note */}
              <div className="mt-7 pt-5 border-t border-[#F0EBE1] dark:border-white/10 flex items-center justify-between text-xs text-[#8C9AC0]">
                <span className="flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                  </svg>
                  256-bit encrypted security
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

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center text-sm text-slate-500">
          Loading...
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
