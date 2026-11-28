'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Country, State, City } from 'country-state-city';
import {
  HiOutlineBuildingOffice2,
  HiOutlineDocumentText,
  HiOutlineUserGroup,
  HiOutlineBriefcase,
  HiOutlineShieldCheck,
  HiOutlineArrowRight,
  HiOutlineEnvelope,
  HiOutlinePhone,
  HiCheckCircle,
  HiOutlineSparkles,
  HiOutlineClipboardDocumentCheck,
  HiOutlineChatBubbleBottomCenterText,
  HiChevronDown,
  HiXMark,
  HiCheck,
} from 'react-icons/hi2';
import Eyebrow from '@/components/marketing/Eyebrow';
import HowItWorks, { type HowItWorksStep } from '@/components/marketing/HowItWorks';
import ScrollReveal from '@/components/marketing/ScrollReveal';
import { Button, useToast } from '@/components/ui';

// ══════════════════════════════════════════════════════════════════════════════════
// 1. VENDOR SERVICES & SOLUTIONS ARCHITECTURE
// ══════════════════════════════════════════════════════════════════════════════════
const VENDOR_SERVICES = [
  {
    icon: <HiOutlineBuildingOffice2 className="w-6 h-6 text-[#D6952F]" />,
    title: 'Enterprise Vendor Empanelment',
    tag: 'Procurement VMS',
    description:
      'Direct gateway for recruitment firms to get registered and onboarded into enterprise Vendor Management Systems (VMS) across Fortune 500s and tech GCCs.',
    benefits: [
      'Official vendor onboarding drives',
      'Direct procurement manager details',
      'Clear compliance & eligibility criteria',
    ],
  },
  {
    icon: <HiOutlineDocumentText className="w-6 h-6 text-[#D6952F]" />,
    title: 'RFP & Tender Mandates',
    tag: 'Bidding Pipeline',
    description:
      'Early access to commercial staffing tenders, requests for proposal (RFPs), and expressions of interest (EOIs) before public bidding portals close.',
    benefits: [
      'Full project scope & budget brackets',
      'Procurement submission deadlines',
      'Direct email disclosure for bids',
    ],
  },
  {
    icon: <HiOutlineUserGroup className="w-6 h-6 text-[#D6952F]" />,
    title: 'Contingent Staffing & RPO',
    tag: 'Volume Scale',
    description:
      'Volume requisitions and master vendor sub-contracts for contingent workforce management, contract-to-hire staffing, and dedicated RPO delivery.',
    benefits: [
      'High-velocity tech & operations roles',
      'Flexible payroll & contracting terms',
      'Continuous pipeline of active mandates',
    ],
  },
  {
    icon: <HiOutlineBriefcase className="w-6 h-6 text-[#D6952F]" />,
    title: 'Retained Executive Search',
    tag: 'C-Suite & Board',
    description:
      'Confidential leadership searches directly authorized by corporate boards and CHROs seeking specialized boutique executive search agencies.',
    benefits: [
      'Exclusive CXO & Director level mandates',
      'Zero intermediary agency markups',
      'Direct client interview coordination',
    ],
  },
];

export function VendorServicesSection() {
  return (
    <section
      id="vendor-services"
      className="relative bg-surface py-16 sm:py-24 border-t border-line overflow-hidden"
    >
      {/* Subtle decorative background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[350px] bg-brand-400/5 blur-[120px] rounded-full"
      />

      <div className="relative mx-auto max-w-[1320px] px-5">
        <ScrollReveal className="mx-auto max-w-2xl text-center mb-12 sm:mb-16">
          <Eyebrow>VENDOR SOLUTIONS</Eyebrow>
          <h2 className="mt-3 font-serif-heading text-3xl font-bold leading-tight text-content sm:text-4xl">
            Recruitment Vendor &amp; Staffing Services
          </h2>
          <p className="mt-4 text-base leading-relaxed text-content-muted">
            Whether you operate as a boutique search firm, a high-volume staffing agency, or an
            enterprise RPO provider, Gravitas Edge connects you directly with organizations seeking
            recruitment partners.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {VENDOR_SERVICES.map((s, idx) => (
            <ScrollReveal key={idx} delay={idx * 90} className="h-full">
              <div className="group relative flex h-full flex-col justify-between rounded-3xl p-6 sm:p-7 transition-all duration-300 hover:-translate-y-1.5 border border-line bg-surface dark:bg-surface-elevated hover:border-[#D6952F]/60 shadow-[0_4px_20px_-4px_rgba(6,27,54,0.06)] hover:shadow-[0_20px_35px_-10px_rgba(214,149,47,0.18)] dark:hover:shadow-[0_20px_35px_-10px_rgba(0,0,0,0.5)] overflow-hidden">
                {/* Top Accent Gradient Line on Hover */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#D6952F] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Ambient radial glow in card corner */}
                <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#D6952F]/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative z-10">
                  {/* Header row with Icon and Pill Badge */}
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#061B36] to-[#0A254A] text-[#D6952F] ring-1 ring-inset ring-[#C8943E]/30 shadow-md group-hover:scale-110 group-hover:shadow-[0_8px_20px_-4px_rgba(214,149,47,0.35)] transition-all duration-300">
                      {s.icon}
                    </div>
                    <span className="text-[0.66rem] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full bg-gradient-to-r from-brand-50 to-amber-100/60 text-[#B87A24] dark:from-brand-950/80 dark:to-amber-950/40 dark:text-[#E9B566] border border-[#C8943E]/25 shadow-xs">
                      {s.tag}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-content leading-snug mb-2.5 group-hover:text-[#D6952F] transition-colors">
                    {s.title}
                  </h3>
                  <p className="text-[0.88rem] leading-relaxed text-content-muted mb-5">
                    {s.description}
                  </p>
                </div>

                <div className="relative z-10 pt-4 border-t border-line/60">
                  <span className="block text-[0.68rem] font-bold uppercase tracking-wider text-content-faint mb-2.5">
                    Key Mandate Highlights:
                  </span>
                  <ul className="space-y-2">
                    {s.benefits.map((b, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 text-[0.8rem] text-content-muted leading-tight"
                      >
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 text-[0.65rem] font-black mt-0.5 shadow-2xs">
                          ✓
                        </span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Subtle explore link on card bottom */}
                  <div className="mt-5 pt-3 flex items-center justify-between text-xs font-semibold text-[#D6952F] opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0 transition-all duration-300">
                    <span>Explore opportunities</span>
                    <HiOutlineArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════════
// 2. VENDOR ONBOARDING & EMPANELMENT 4-STEP PROCESS
// ══════════════════════════════════════════════════════════════════════════════════
const ONBOARDING_STEPS: HowItWorksStep[] = [
  {
    num: '01',
    tag: 'Mandate Discovery',
    title: 'Discover Active Mandates',
    description:
      'Browse live corporate empanelment notices, staffing tenders, and RFP opportunities filtered by industry and geography.',
  },
  {
    num: '02',
    tag: 'Direct Contacts',
    title: 'Unlock Direct Contacts',
    description:
      'Subscribe to access unmasked procurement manager emails, official submission instructions, and full budget specifications.',
  },
  {
    num: '03',
    tag: 'Zero Commission',
    title: 'Submit Agency Proposals',
    description:
      'Engage directly with corporate talent acquisition heads and procurement committees with zero platform commissions or markups.',
  },
  {
    num: '04',
    tag: 'MSA & Execution',
    title: 'Empanel & Execute',
    description:
      'Finalize master service agreements (MSAs) or SLA vendor terms and start supplying qualified talent directly to hiring leaders.',
  },
];

export function VendorProcessSection() {
  return (
    <HowItWorks
      id="vendor-process"
      eyebrow="HOW IT WORKS"
      title="The Vendor Empanelment Process"
      subtitle="A frictionless pathway for staffing agencies to bypass traditional gatekeepers and secure verified corporate vendor agreements."
      steps={ONBOARDING_STEPS}
      showBackwardsAnchor={false}
    />
  );
}

// ══════════════════════════════════════════════════════════════════════════════════
// 3. VENDOR VALUE COMPARISON (TRADITIONAL VS GRAVITAS EDGE)
// ══════════════════════════════════════════════════════════════════════════════════
const TRADITIONAL_POINTS = [
  'Hundreds of cold LinkedIn InMails and emails with sub-2% response rates.',
  'Gatekept by junior recruiters who already have locked vendor lists.',
  'Missing public RFP/tender deadlines due to lack of consolidated notice boards.',
  'Hefty intermediary brokerage cuts and platform placement fees.',
];

const GRAVITAS_POINTS = [
  {
    lead: 'Funded Corporate Mandates:',
    text: 'Reach companies actively running vendor onboarding and RFP drives.',
  },
  {
    lead: 'Unmasked Procurement Contacts:',
    text: 'Direct email and phone coordinates for corporate decision-makers.',
  },
  {
    lead: 'Zero Placement Cuts:',
    text: 'Keep 100% of your billings and client placement revenue.',
  },
  {
    lead: 'Multi-Region Scope:',
    text: 'Coverage across India, UAE & GCC, UK, and Global multinational corridors.',
  },
];

function ComparisonCard3D({
  variant,
  children,
}: {
  variant: 'traditional' | 'gravitas';
  children: React.ReactNode;
}) {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, mx: 50, my: 50, hovering: false });
  const isGravitas = variant === 'gravitas';

  return (
    <div
      className="group relative h-full select-none"
      style={{ perspective: '1100px' }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        setTilt({
          rx: (0.5 - py) * 12,
          ry: (px - 0.5) * 12,
          mx: px * 100,
          my: py * 100,
          hovering: true,
        });
      }}
      onMouseLeave={() => {
        setTilt({ rx: 0, ry: 0, mx: 50, my: 50, hovering: false });
      }}
    >
      <div
        className={`relative flex h-full flex-col justify-between overflow-hidden rounded-3xl p-6 sm:p-8 ${
          isGravitas
            ? 'border-2 border-[#D6952F]/70 bg-gradient-to-br from-[#061B36] via-[#0A2548] to-[#081C38] text-white shadow-[0_22px_50px_-18px_rgba(6,27,54,0.45)] group-hover:border-[#F0C27B] group-hover:shadow-[0_28px_60px_-15px_rgba(214,149,47,0.35)]'
            : 'border border-line bg-surface-muted/65 text-content-muted shadow-sm group-hover:border-red-300/60 dark:group-hover:border-red-500/35 group-hover:shadow-lg'
        }`}
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(${
            tilt.hovering ? 1.02 : 1
          })`,
          transition: tilt.hovering
            ? 'transform 110ms ease-out, border-color 300ms, box-shadow 300ms'
            : 'transform 520ms cubic-bezier(0.22, 1, 0.36, 1), border-color 300ms, box-shadow 300ms',
        }}
      >
        {/* Cursor-tracking 3D spotlight */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-3xl transition-opacity duration-300"
          style={{
            opacity: tilt.hovering ? 1 : 0,
            background: isGravitas
              ? `radial-gradient(300px circle at ${tilt.mx}% ${tilt.my}%, rgba(214, 149, 47, 0.24), transparent 70%)`
              : `radial-gradient(280px circle at ${tilt.mx}% ${tilt.my}%, rgba(239, 68, 68, 0.08), transparent 70%)`,
          }}
        />

        {children}
      </div>
    </div>
  );
}

export function VendorComparisonSection() {
  return (
    <section className="relative bg-surface py-16 sm:py-24 border-t border-line">
      <div className="mx-auto max-w-[1320px] px-5">
        <ScrollReveal className="mx-auto max-w-2xl text-center mb-12">
          <Eyebrow>AGENCY ADVANTAGE</Eyebrow>
          <h2 className="mt-3 font-serif-heading text-3xl font-bold leading-tight text-content sm:text-4xl">
            Why Staffing Agencies Choose Gravitas Edge
          </h2>
          <p className="mt-4 text-base leading-relaxed text-content-muted">
            Eliminate endless cold business development outreach and get direct visibility into
            companies with funded recruitment budgets.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Traditional BD */}
          <ScrollReveal direction="left" delay={80} className="h-full">
            <ComparisonCard3D variant="traditional">
              <div style={{ transformStyle: 'preserve-3d' }}>
                <div
                  className="mb-5 flex items-center justify-between gap-2"
                  style={{ transform: 'translateZ(24px)' }}
                >
                  <h3 className="text-lg font-bold text-content-muted flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 text-red-500 text-sm font-bold">
                      ✕
                    </span>
                    <span>Traditional Business Development</span>
                  </h3>
                  <span className="shrink-0 rounded-full bg-red-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                    Low Yield
                  </span>
                </div>

                <ul className="space-y-2.5 text-sm" style={{ transform: 'translateZ(14px)' }}>
                  {TRADITIONAL_POINTS.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-content-muted transition-all duration-200 hover:bg-red-500/[0.08] hover:text-content hover:translate-x-1 hover:ring-1 hover:ring-red-500/20"
                    >
                      <span className="text-red-500 shrink-0 font-bold mt-0.5">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </ComparisonCard3D>
          </ScrollReveal>

          {/* Gravitas Edge Vendor Access */}
          <ScrollReveal direction="right" delay={140} className="h-full">
            <ComparisonCard3D variant="gravitas">
              <div className="flex h-full flex-col justify-between" style={{ transformStyle: 'preserve-3d' }}>
                <div>
                  <div
                    className="mb-5 flex items-center justify-between gap-2"
                    style={{ transform: 'translateZ(26px)' }}
                  >
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-bold ring-1 ring-emerald-400/30">
                        ✓
                      </span>
                      <span>Gravitas Edge Vendor Access</span>
                    </h3>
                    <span className="shrink-0 rounded-full bg-[#D6952F] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#061B36] shadow-sm">
                      Recommended
                    </span>
                  </div>

                  <ul className="space-y-2.5 text-sm text-[#E2E8F5]" style={{ transform: 'translateZ(16px)' }}>
                    {GRAVITAS_POINTS.map((point) => (
                      <li
                        key={point.lead}
                        className="flex items-start gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2.5 transition-all duration-200 hover:bg-[#D6952F]/20 hover:text-white hover:translate-x-1 hover:ring-1 hover:ring-[#F0C27B]/45 hover:shadow-sm"
                      >
                        <span className="text-emerald-400 shrink-0 font-bold mt-0.5">✓</span>
                        <span>
                          <strong className="text-[#F6D58A]">{point.lead}</strong>{' '}
                          {point.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div
                  className="mt-5 flex items-center justify-between border-t border-white/10 pt-4"
                  style={{ transform: 'translateZ(22px)' }}
                >
                  <span className="text-xs font-medium text-[#9FB0CC]">
                    100% direct procurement routing
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('plans');
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#D6952F] px-3.5 py-1.5 text-xs font-bold text-[#061B36] shadow-sm transition hover:bg-[#F0C27B]"
                  >
                    <span>View Vendor Plans</span>
                    <HiOutlineArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </ComparisonCard3D>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

interface SelectOption {
  value: string;
  label: string;
}

/** Custom searchable combobox: single input acts as both selected display and live search bar. */
function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Search or select...',
  disabled = false,
  allowClear = false,
  required = false,
}: {
  options: SelectOption[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value) || null,
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const inputValue = open ? query : selectedOption?.label || '';
  const inputPlaceholder = open
    ? selectedOption
      ? `Search (current: ${selectedOption.label})...`
      : placeholder
    : placeholder;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          required={required && !value}
          value={inputValue}
          placeholder={inputPlaceholder}
          onFocus={() => {
            if (disabled) return;
            setOpen(true);
            setQuery('');
          }}
          onClick={() => {
            if (disabled) return;
            if (!open) {
              setOpen(true);
              setQuery('');
            }
          }}
          onChange={(e) => {
            if (!open) setOpen(true);
            setQuery(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
              setQuery('');
            } else if (e.key === 'Enter' && open && filteredOptions.length > 0) {
              e.preventDefault();
              onChange(filteredOptions[0].value);
              setOpen(false);
              setQuery('');
            }
          }}
          className={`w-full rounded-xl border bg-surface px-4 py-3 text-sm text-content placeholder:text-hint transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-surface disabled:cursor-not-allowed disabled:opacity-50 ${
            allowClear && value ? 'pr-16' : 'pr-10'
          } ${open ? 'border-[#D6952F] ring-2 ring-[#D6952F]/20' : 'border-line'}`}
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {allowClear && value && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setQuery('');
              }}
              aria-label="Clear selection"
              className="rounded-md p-1 text-content-muted hover:bg-surface-muted hover:text-content transition-colors"
            >
              <HiXMark className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              setOpen((prev) => !prev);
              setQuery('');
            }}
            aria-label="Toggle dropdown"
            className="rounded-md p-1 text-content-muted hover:text-content transition-colors disabled:pointer-events-none"
          >
            <HiChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180 text-[#D6952F]' : ''}`}
            />
          </button>
        </div>
      </div>

      {open && !disabled && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1.5 max-h-60 w-full overflow-y-auto scrollbar-navy-gold rounded-xl border border-line bg-surface p-1.5 shadow-xl dark:border-[#1E3557] dark:bg-[#0C1E38]"
        >
          {filteredOptions.length === 0 ? (
            <li className="px-3 py-2.5 text-center text-xs text-content-muted">
              No matching results
            </li>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <li key={opt.value} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onChange(opt.value);
                      setOpen(false);
                      setQuery('');
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      isSelected
                        ? 'bg-[#D6952F]/15 font-semibold text-[#9C6424] dark:text-[#F0C27B]'
                        : 'text-content hover:bg-surface-muted dark:hover:bg-white/5'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <HiCheck className="h-4 w-4 shrink-0 text-[#D6952F]" />}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════════
// 4. DEDICATED VENDOR PARTNERSHIP ENQUIRY FORM
// ══════════════════════════════════════════════════════════════════════════════════
export function VendorEnquirySection() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    agencyName: '',
    contactName: '',
    workEmail: '',
    phone: '',
    specialization: 'TECH_STAFFING',
    countryCode: 'IN',
    stateCode: '',
    cityName: '',
    message: '',
  });

  const countries = useMemo(() => Country.getAllCountries(), []);
  const states = useMemo(
    () => (formData.countryCode ? State.getStatesOfCountry(formData.countryCode) : []),
    [formData.countryCode],
  );
  const cities = useMemo(
    () =>
      formData.countryCode && formData.stateCode
        ? City.getCitiesOfState(formData.countryCode, formData.stateCode)
        : [],
    [formData.countryCode, formData.stateCode],
  );

  const SPECIALIZATION_LABELS: Record<string, string> = {
    TECH_STAFFING: 'IT & Technology Staffing',
    EXECUTIVE_SEARCH: 'Retained Executive Search',
    BFSI_FINANCE: 'BFSI & Corporate Finance',
    HEALTHCARE_PHARMA: 'Healthcare & Life Sciences',
    ENGINEERING_MANUF: 'Engineering & Manufacturing',
    GENERAL_RPO: 'General Staffing & RPO',
  };

  const buildEnquiryMessage = () => {
    const specText = SPECIALIZATION_LABELS[formData.specialization] || formData.specialization;
    const countryName =
      Country.getCountryByCode(formData.countryCode)?.name || formData.countryCode;
    const stateName = formData.stateCode
      ? State.getStateByCodeAndCountry(formData.stateCode, formData.countryCode)?.name
      : '';

    return [
      `*RECRUITMENT VENDOR PARTNERSHIP ENQUIRY*`,
      `Gravitas Edge Consulting`,
      `----------------------------------------`,
      `Dear Team,`,
      ``,
      `I am writing to enquire about a recruitment vendor partnership with Gravitas Edge Consulting. Please find our details below.`,
      ``,
      `*Agency Name:* ${formData.agencyName.trim()}`,
      `*Contact Person:* ${formData.contactName.trim()}`,
      `*Work Email:* ${formData.workEmail.trim()}`,
      `*Phone / WhatsApp:* ${formData.phone.trim() || 'Not specified'}`,
      `*Specialization:* ${specText}`,
      `*Country:* ${countryName || 'Not specified'}`,
      `*State:* ${stateName || 'Not specified'}`,
      `*City:* ${formData.cityName || 'Not specified'}`,
      formData.message.trim() ? `*Partnership Note:* ${formData.message.trim()}` : null,
      ``,
      `We look forward to your response and the opportunity to work together.`,
      ``,
      `Regards,`,
      `${formData.contactName.trim()}`,
      `${formData.agencyName.trim()}`,
      `----------------------------------------`,
      `Sent via Recruitment Vendor Portal`,
    ]
      .filter((line) => line !== null)
      .join('\n');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.agencyName || !formData.contactName || !formData.workEmail) {
      showToast('Please fill out all required fields.', 'error');
      return;
    }

    setLoading(true);
    try {
      // 1. Format clean, formal corporate WhatsApp message
      const waMessage = buildEnquiryMessage();

      // 2. Automatically copy message to clipboard as safe backup
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.writeText(waMessage);
        }
      } catch {
        // clipboard access might be restricted in some iframes, safe to ignore
      }

      // 3. Detect mobile vs desktop:
      // On desktop, directly loading web.whatsapp.com/send pre-populates the input without
      // the api.whatsapp.com redirect stripping the text parameter.
      const isMobile =
        typeof window !== 'undefined' &&
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      const encoded = encodeURIComponent(waMessage);
      const whatsappUrl = isMobile
        ? `https://wa.me/918448714760?text=${encoded}`
        : `https://web.whatsapp.com/send?phone=918448714760&text=${encoded}`;

      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

      setSubmitted(true);
      showToast('Opening WhatsApp with your enquiry...', 'success');
    } catch {
      showToast('Failed to open WhatsApp. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id="vendor-enquiry"
      className="relative bg-surface-muted py-16 sm:py-24 border-t border-line scroll-mt-16"
    >
      <div className="mx-auto max-w-[1320px] px-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left Column: Static Content & Partnership Highlights */}
          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <ScrollReveal direction="left">
              <Eyebrow>PARTNER ENQUIRY</Eyebrow>
              <h2 className="mt-3 font-serif-heading text-3xl font-bold leading-tight text-content sm:text-4xl">
                Recruitment Vendor &amp; Partner Enquiry
              </h2>
              <p className="mt-4 text-base leading-relaxed text-content-muted">
                Looking for tailored enterprise vendor access, agency bulk accounts, or custom
                mandate alerts? Submit your agency details and our partnership team will connect
                with you directly.
              </p>

              {/* Key Partnership Highlights */}
              <div className="mt-8 space-y-4">
                {[
                  {
                    icon: <HiOutlineBuildingOffice2 className="h-5 w-5 text-[#D6952F]" />,
                    title: 'Enterprise & Bulk Agency Access',
                    desc: 'Multi-seat team plans and dedicated account support for staffing firms.',
                  },
                  {
                    icon: <HiOutlineShieldCheck className="h-5 w-5 text-[#D6952F]" />,
                    title: 'Verified VMS & RFP Mandates',
                    desc: 'Direct corporate empanelment notices across India, UAE/GCC, and UK.',
                  },
                  {
                    icon: (
                      <HiOutlineChatBubbleBottomCenterText className="h-5 w-5 text-[#D6952F]" />
                    ),
                    title: 'Instant WhatsApp Partnership Desk',
                    desc: 'Submitting sends your structured agency brief directly to our onboarding team.',
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex items-start gap-3.5 rounded-2xl border border-line bg-surface p-4 shadow-sm dark:bg-surface-elevated"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#061B36] ring-1 ring-[#D6952F]/30">
                      {item.icon}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-content">{item.title}</h3>
                      <p className="mt-0.5 text-xs leading-relaxed text-content-muted">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Direct Desk Metadata Strip */}
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-[#D6952F]/25 bg-[#D6952F]/10 px-4 py-3 text-xs font-medium text-content">
                <span className="inline-flex items-center gap-1.5">
                  <HiOutlinePhone className="h-4 w-4 text-[#D6952F]" />
                  <span>WhatsApp Desk: +91 84487 14760</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <HiCheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Response SLA: Under 24 Hours</span>
                </span>
              </div>
            </ScrollReveal>
          </div>

          {/* Right Column: Enquiry Form Card */}
          <div className="lg:col-span-7">
            <ScrollReveal direction="right" delay={100}>
              <div className="rounded-2xl border border-line bg-surface p-6 sm:p-10 shadow-card dark:bg-surface-elevated">
                {submitted ? (
                  <div className="text-center py-8">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 mb-4">
                      <HiCheckCircle className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold text-content mb-2">
                      Thank you for your enquiry!
                    </h3>
                    <p className="text-content-muted max-w-md mx-auto text-sm leading-relaxed mb-6">
                      We have prepared your agency details for{' '}
                      <strong>{formData.agencyName}</strong>. If WhatsApp did not open
                      automatically, click below to open your chat.
                    </p>

                    <div className="flex flex-wrap justify-center gap-3 mb-6">
                      <a
                        href={`https://web.whatsapp.com/send?phone=918448714760&text=${encodeURIComponent(
                          buildEnquiryMessage(),
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-sm font-bold shadow-md transition-colors"
                      >
                        <HiOutlineChatBubbleBottomCenterText className="h-4 w-4" />
                        <span>Open WhatsApp Web</span>
                      </a>

                      <a
                        href={`https://wa.me/918448714760?text=${encodeURIComponent(
                          buildEnquiryMessage(),
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-[#061B36] hover:bg-[#0A2548] text-white px-5 py-2.5 text-sm font-semibold border border-white/10 transition-colors"
                      >
                        <HiOutlinePhone className="h-4 w-4" />
                        <span>Open WhatsApp Mobile / App</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(buildEnquiryMessage());
                          showToast('Enquiry message copied to clipboard!', 'success');
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-surface hover:bg-surface-muted text-content border border-line px-5 py-2.5 text-sm font-semibold transition-colors"
                      >
                        <HiOutlineClipboardDocumentCheck className="h-4 w-4" />
                        <span>Copy Message</span>
                      </button>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => {
                        setSubmitted(false);
                        setFormData({
                          agencyName: '',
                          contactName: '',
                          workEmail: '',
                          phone: '',
                          specialization: 'TECH_STAFFING',
                          countryCode: 'IN',
                          stateCode: '',
                          cityName: '',
                          message: '',
                        });
                      }}
                    >
                      Submit Another Enquiry
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-content-muted mb-1.5">
                          Agency / Firm Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Apex Talent Partners"
                          value={formData.agencyName}
                          onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                          className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-content placeholder:text-hint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-surface"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-content-muted mb-1.5">
                          Contact Person *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Rahul Sharma"
                          value={formData.contactName}
                          onChange={(e) =>
                            setFormData({ ...formData, contactName: e.target.value })
                          }
                          className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-content placeholder:text-hint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-surface"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-content-muted mb-1.5">
                          Corporate Work Email *
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="rahul@apextalent.com"
                          value={formData.workEmail}
                          onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
                          className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-content placeholder:text-hint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-surface"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-content-muted mb-1.5">
                          Phone / WhatsApp (Optional)
                        </label>
                        <input
                          type="tel"
                          placeholder="+91 98765 43210"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-content placeholder:text-hint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-surface"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-content-muted mb-1.5">
                          Primary Specialization
                        </label>
                        <SearchableSelect
                          value={formData.specialization}
                          onChange={(val) =>
                            setFormData({ ...formData, specialization: val || 'TECH_STAFFING' })
                          }
                          placeholder="Search specialization..."
                          options={Object.entries(SPECIALIZATION_LABELS).map(([val, label]) => ({
                            value: val,
                            label,
                          }))}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-content-muted mb-1.5">
                          Target Country *
                        </label>
                        <SearchableSelect
                          required
                          value={formData.countryCode}
                          onChange={(val) =>
                            setFormData({
                              ...formData,
                              countryCode: val,
                              stateCode: '',
                              cityName: '',
                            })
                          }
                          placeholder="Search country..."
                          options={countries.map((c) => ({
                            value: c.isoCode,
                            label: c.name,
                          }))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-content-muted mb-1.5">
                          State
                        </label>
                        <SearchableSelect
                          allowClear
                          disabled={states.length === 0}
                          value={formData.stateCode}
                          onChange={(val) =>
                            setFormData({
                              ...formData,
                              stateCode: val,
                              cityName: '',
                            })
                          }
                          placeholder={
                            states.length === 0
                              ? 'No states available'
                              : 'Search or select state (optional)'
                          }
                          options={states.map((s) => ({
                            value: s.isoCode,
                            label: s.name,
                          }))}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-content-muted mb-1.5">
                          City
                        </label>
                        <SearchableSelect
                          allowClear
                          disabled={cities.length === 0}
                          value={formData.cityName}
                          onChange={(val) => setFormData({ ...formData, cityName: val })}
                          placeholder={
                            !formData.stateCode
                              ? 'Select state first'
                              : cities.length === 0
                                ? 'No cities available'
                                : 'Search or select city (optional)'
                          }
                          options={cities.map((city) => ({
                            value: city.name,
                            label: city.name,
                          }))}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-content-muted mb-1.5">
                        Partnership Note or Mandate Requirement
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Tell us about your agency size, key client sectors, or specific corporate empanelment needs..."
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-content placeholder:text-hint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-surface resize-none"
                      />
                    </div>

                    <div className="pt-2">
                      <Button
                        type="submit"
                        className="w-full !py-3.5 text-base font-bold !bg-emerald-600 hover:!bg-emerald-700 !text-white shadow-md flex items-center justify-center gap-2"
                        loading={loading}
                      >
                        <span>Send Enquiry on WhatsApp</span>
                        <HiOutlineChatBubbleBottomCenterText className="h-5 w-5" />
                      </Button>
                      <p className="text-center text-xs text-content-muted mt-2">
                        Submitting will format your agency details and connect directly with our
                        WhatsApp partnership desk.
                      </p>
                    </div>
                  </form>
                )}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
