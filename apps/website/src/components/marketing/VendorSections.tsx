'use client';

import React, { useState } from 'react';
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
} from 'react-icons/hi2';
import Eyebrow from '@/components/marketing/Eyebrow';
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
        <div className="mx-auto max-w-2xl text-center mb-12 sm:mb-16">
          <Eyebrow>VENDOR SOLUTIONS</Eyebrow>
          <h2 className="mt-3 font-serif-heading text-3xl font-bold leading-tight text-content sm:text-4xl">
            Recruitment Vendor &amp; Staffing Services
          </h2>
          <p className="mt-4 text-base leading-relaxed text-content-muted">
            Whether you operate as a boutique search firm, a high-volume staffing agency, or an
            enterprise RPO provider, Gravitas Edge connects you directly with organizations seeking
            recruitment partners.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {VENDOR_SERVICES.map((s, idx) => (
            <div
              key={idx}
              className="group relative flex flex-col justify-between rounded-3xl p-6 sm:p-7 transition-all duration-300 hover:-translate-y-1.5 border border-line bg-surface dark:bg-surface-elevated hover:border-[#D6952F]/60 shadow-[0_4px_20px_-4px_rgba(6,27,54,0.06)] hover:shadow-[0_20px_35px_-10px_rgba(214,149,47,0.18)] dark:hover:shadow-[0_20px_35px_-10px_rgba(0,0,0,0.5)] overflow-hidden"
            >
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
          ))}
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════════
// 2. VENDOR ONBOARDING & EMPANELMENT 4-STEP PROCESS
// ══════════════════════════════════════════════════════════════════════════════════
const ONBOARDING_STEPS = [
  {
    step: '01',
    title: 'Discover Active Mandates',
    description:
      'Browse live corporate empanelment notices, staffing tenders, and RFP opportunities filtered by industry and geography.',
  },
  {
    step: '02',
    title: 'Unlock Direct Contacts',
    description:
      'Subscribe to access unmasked procurement manager emails, official submission instructions, and full budget specifications.',
  },
  {
    step: '03',
    title: 'Submit Agency Proposals',
    description:
      'Engage directly with corporate talent acquisition heads and procurement committees with zero platform commissions or markups.',
  },
  {
    step: '04',
    title: 'Empanel & Execute',
    description:
      'Finalize master service agreements (MSAs) or SLA vendor terms and start supplying qualified talent directly to hiring leaders.',
  },
];

export function VendorProcessSection() {
  return (
    <section
      id="vendor-process"
      className="relative bg-surface-muted py-16 sm:py-24 border-t border-line"
    >
      <div className="mx-auto max-w-[1320px] px-5">
        <div className="mx-auto max-w-2xl text-center mb-12 sm:mb-16">
          <Eyebrow>HOW IT WORKS</Eyebrow>
          <h2 className="mt-3 font-serif-heading text-3xl font-bold leading-tight text-content sm:text-4xl">
            The Vendor Empanelment Process
          </h2>
          <p className="mt-4 text-base leading-relaxed text-content-muted">
            A frictionless pathway for staffing agencies to bypass traditional gatekeepers and
            secure verified corporate vendor agreements.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {ONBOARDING_STEPS.map((step) => (
            <div
              key={step.step}
              className="relative card-static flex flex-col rounded-2xl p-6 bg-surface dark:bg-surface-elevated border border-line"
            >
              <div className="text-3xl font-extrabold text-[#D6952F] font-sans leading-none mb-3">
                {step.step}
              </div>
              <h3 className="text-base font-bold text-content leading-snug mb-2">{step.title}</h3>
              <p className="text-sm leading-relaxed text-content-muted flex-1">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════════
// 3. VENDOR VALUE COMPARISON (TRADITIONAL VS GRAVITAS EDGE)
// ══════════════════════════════════════════════════════════════════════════════════
export function VendorComparisonSection() {
  return (
    <section className="relative bg-surface py-16 sm:py-24 border-t border-line">
      <div className="mx-auto max-w-[1320px] px-5">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <Eyebrow>AGENCY ADVANTAGE</Eyebrow>
          <h2 className="mt-3 font-serif-heading text-3xl font-bold leading-tight text-content sm:text-4xl">
            Why Staffing Agencies Choose Gravitas Edge
          </h2>
          <p className="mt-4 text-base leading-relaxed text-content-muted">
            Eliminate endless cold business development outreach and get direct visibility into
            companies with funded recruitment budgets.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Traditional BD */}
          <div className="rounded-2xl border border-line bg-surface-muted/50 p-6 sm:p-8">
            <h3 className="text-lg font-bold text-content-muted flex items-center gap-2 mb-4">
              <span className="text-red-500 font-bold">✕</span> Traditional Business Development
            </h3>
            <ul className="space-y-3.5 text-sm text-content-muted">
              <li className="flex items-start gap-2.5">
                <span className="text-red-500 shrink-0 font-bold mt-0.5">•</span>
                <span>
                  Hundreds of cold LinkedIn InMails and emails with sub-2% response rates.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-red-500 shrink-0 font-bold mt-0.5">•</span>
                <span>Gatekept by junior recruiters who already have locked vendor lists.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-red-500 shrink-0 font-bold mt-0.5">•</span>
                <span>
                  Missing public RFP/tender deadlines due to lack of consolidated notice boards.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-red-500 shrink-0 font-bold mt-0.5">•</span>
                <span>Hefty intermediary brokerage cuts and platform placement fees.</span>
              </li>
            </ul>
          </div>

          {/* Gravitas Edge Vendor Access */}
          <div className="rounded-2xl border-2 border-[#D6952F]/70 bg-gradient-to-b from-[#FFF3D9]/40 to-surface dark:from-brand-950/40 dark:to-surface-elevated p-6 sm:p-8 shadow-card">
            <h3 className="text-lg font-bold text-content flex items-center gap-2 mb-4">
              <span className="text-emerald-500 font-bold">✓</span> Gravitas Edge Vendor Access
            </h3>
            <ul className="space-y-3.5 text-sm text-content">
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-500 shrink-0 font-bold mt-0.5">✓</span>
                <span>
                  <strong>Funded Corporate Mandates:</strong> Reach companies actively running
                  vendor onboarding and RFP drives.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-500 shrink-0 font-bold mt-0.5">✓</span>
                <span>
                  <strong>Unmasked Procurement Contacts:</strong> Direct email and phone coordinates
                  for corporate decision-makers.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-500 shrink-0 font-bold mt-0.5">✓</span>
                <span>
                  <strong>Zero Placement Cuts:</strong> Keep 100% of your billings and client
                  placement revenue.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-500 shrink-0 font-bold mt-0.5">✓</span>
                <span>
                  <strong>Multi-Region Scope:</strong> Coverage across India, UAE &amp; GCC, UK, and
                  Global multinational corridors.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
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
    targetMarket: 'INDIA_GCC',
    message: '',
  });

  const SPECIALIZATION_LABELS: Record<string, string> = {
    TECH_STAFFING: 'IT & Technology Staffing',
    EXECUTIVE_SEARCH: 'Retained Executive Search',
    BFSI_FINANCE: 'BFSI & Corporate Finance',
    HEALTHCARE_PHARMA: 'Healthcare & Life Sciences',
    ENGINEERING_MANUF: 'Engineering & Manufacturing',
    GENERAL_RPO: 'General Staffing & RPO',
  };

  const GEOGRAPHY_LABELS: Record<string, string> = {
    INDIA_GCC: 'India & UAE/GCC',
    INDIA_ONLY: 'India Domestic',
    GCC_ONLY: 'UAE & Middle East',
    GLOBAL: 'UK, Europe & Global Hubs',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.agencyName || !formData.contactName || !formData.workEmail) {
      showToast('Please fill out all required fields.', 'error');
      return;
    }

    setLoading(true);
    try {
      // 1. Format clean, formal corporate WhatsApp message (exact structure requested)
      const specText = SPECIALIZATION_LABELS[formData.specialization] || formData.specialization;
      const geoText = GEOGRAPHY_LABELS[formData.targetMarket] || formData.targetMarket;

      const waMessage = [
        '*New Recruitment Vendor Partnership Enquiry*',
        '',
        `*Agency Name:* ${formData.agencyName.trim()}`,
        `*Contact Person:* ${formData.contactName.trim()}`,
        `*Work Email:* ${formData.workEmail.trim()}`,
        `*Phone / WhatsApp:* ${formData.phone.trim() || 'Not specified'}`,
        `*Specialization:* ${specText}`,
        `*Target Market:* ${geoText}`,
        formData.message.trim() ? `*Note:* ${formData.message.trim()}` : null,
        '',
        '_Submitted via Gravitas Edge Recruitment Vendor Portal_',
      ]
        .filter(Boolean)
        .join('\n');

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
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-10">
            <Eyebrow>PARTNER ENQUIRY</Eyebrow>
            <h2 className="mt-3 font-serif-heading text-3xl font-bold leading-tight text-content sm:text-4xl">
              Recruitment Vendor &amp; Partner Enquiry
            </h2>
            <p className="mt-3 text-base text-content-muted">
              Looking for tailored enterprise vendor access, agency bulk accounts, or custom mandate
              alerts? Submit your agency details and our partnership team will reach out.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-6 sm:p-10 shadow-card dark:bg-surface-elevated">
            {submitted ? (
              <div className="text-center py-8">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 mb-4">
                  <HiCheckCircle className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-content mb-2">Thank you for your enquiry!</h3>
                <p className="text-content-muted max-w-md mx-auto text-sm leading-relaxed mb-6">
                  We have prepared your agency details for <strong>{formData.agencyName}</strong>. If WhatsApp did not open automatically, click below to open your chat.
                </p>

                <div className="flex flex-wrap justify-center gap-3 mb-6">
                  <a
                    href={`https://web.whatsapp.com/send?phone=918448714760&text=${encodeURIComponent(
                      [
                        '*New Recruitment Vendor Partnership Enquiry*',
                        '',
                        `*Agency Name:* ${formData.agencyName.trim()}`,
                        `*Contact Person:* ${formData.contactName.trim()}`,
                        `*Work Email:* ${formData.workEmail.trim()}`,
                        `*Phone / WhatsApp:* ${formData.phone.trim() || 'Not specified'}`,
                        `*Specialization:* ${SPECIALIZATION_LABELS[formData.specialization] || formData.specialization}`,
                        `*Target Market:* ${GEOGRAPHY_LABELS[formData.targetMarket] || formData.targetMarket}`,
                        formData.message.trim() ? `*Note:* ${formData.message.trim()}` : null,
                        '',
                        '_Submitted via Gravitas Edge Recruitment Vendor Portal_',
                      ]
                        .filter(Boolean)
                        .join('\n')
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-sm font-bold shadow-md transition-colors"
                  >
                    <span>💬 Open WhatsApp Web</span>
                  </a>

                  <a
                    href={`https://wa.me/918448714760?text=${encodeURIComponent(
                      [
                        '*New Recruitment Vendor Partnership Enquiry*',
                        '',
                        `*Agency Name:* ${formData.agencyName.trim()}`,
                        `*Contact Person:* ${formData.contactName.trim()}`,
                        `*Work Email:* ${formData.workEmail.trim()}`,
                        `*Phone / WhatsApp:* ${formData.phone.trim() || 'Not specified'}`,
                        `*Specialization:* ${SPECIALIZATION_LABELS[formData.specialization] || formData.specialization}`,
                        `*Target Market:* ${GEOGRAPHY_LABELS[formData.targetMarket] || formData.targetMarket}`,
                        formData.message.trim() ? `*Note:* ${formData.message.trim()}` : null,
                        '',
                        '_Submitted via Gravitas Edge Recruitment Vendor Portal_',
                      ]
                        .filter(Boolean)
                        .join('\n')
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#061B36] hover:bg-[#0A2548] text-white px-5 py-2.5 text-sm font-semibold border border-white/10 transition-colors"
                  >
                    <span>📱 Open WhatsApp Mobile / App</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      const msg = [
                        '*New Recruitment Vendor Partnership Enquiry*',
                        '',
                        `*Agency Name:* ${formData.agencyName.trim()}`,
                        `*Contact Person:* ${formData.contactName.trim()}`,
                        `*Work Email:* ${formData.workEmail.trim()}`,
                        `*Phone / WhatsApp:* ${formData.phone.trim() || 'Not specified'}`,
                        `*Specialization:* ${SPECIALIZATION_LABELS[formData.specialization] || formData.specialization}`,
                        `*Target Market:* ${GEOGRAPHY_LABELS[formData.targetMarket] || formData.targetMarket}`,
                        formData.message.trim() ? `*Note:* ${formData.message.trim()}` : null,
                        '',
                        '_Submitted via Gravitas Edge Recruitment Vendor Portal_',
                      ]
                        .filter(Boolean)
                        .join('\n');
                      navigator.clipboard.writeText(msg);
                      showToast('Enquiry message copied to clipboard!', 'success');
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-surface hover:bg-surface-muted text-content border border-line px-5 py-2.5 text-sm font-semibold transition-colors"
                  >
                    <span>📋 Copy Message</span>
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
                      targetMarket: 'INDIA_GCC',
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
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
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
                    <select
                      value={formData.specialization}
                      onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                      className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-content focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-surface cursor-pointer"
                    >
                      <option value="TECH_STAFFING">IT &amp; Technology Staffing</option>
                      <option value="EXECUTIVE_SEARCH">Retained Executive Search</option>
                      <option value="BFSI_FINANCE">BFSI &amp; Corporate Finance</option>
                      <option value="HEALTHCARE_PHARMA">Healthcare &amp; Life Sciences</option>
                      <option value="ENGINEERING_MANUF">Engineering &amp; Manufacturing</option>
                      <option value="GENERAL_RPO">General Staffing &amp; RPO</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-content-muted mb-1.5">
                      Target Placement Geography
                    </label>
                    <select
                      value={formData.targetMarket}
                      onChange={(e) => setFormData({ ...formData, targetMarket: e.target.value })}
                      className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-content focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-surface cursor-pointer"
                    >
                      <option value="INDIA_GCC">India &amp; UAE/GCC</option>
                      <option value="INDIA_ONLY">India Domestic</option>
                      <option value="GCC_ONLY">UAE &amp; Middle East</option>
                      <option value="GLOBAL">UK, Europe &amp; Global Hubs</option>
                    </select>
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
                    <span className="text-xl">💬</span>
                  </Button>
                  <p className="text-center text-xs text-content-muted mt-2">
                    💬 Submitting will format your agency details and connect directly with our
                    WhatsApp partnership desk.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
