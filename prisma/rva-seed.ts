// =============================================================================
// RECRUITMENT VENDOR ACCESS (RVA) — DEVELOPMENT / DEMO SEED ONLY.
//
// Seeds a self-contained set of Recruitment Vendor Access reference data:
//   - 3 demo access plans (1 / 3 / 6 months)
//   - ~10 demo opportunities across all RVA categories
//   - 6 demo FAQs
//
// IMPORTANT
//   - The plan PRICES below are PLACEHOLDERS for local development. No approved
//     RVA pricing exists yet, so these must be reviewed and set from the admin
//     panel before any production launch.
//   - This seed NEVER creates users, payments, subscriptions or entitlements.
//   - It is IDEMPOTENT: re-running it creates records only when missing and
//     never overwrites an existing plan (admin edits are preserved) or deletes
//     any data.
//   - It is GUARDED against production: it exits without writing unless run in
//     a non-production environment or explicitly allowed with
//     ALLOW_RVA_SEED=true.
//
// Run with:  npm run db:seed:rva      (from the repo root)
// =============================================================================

import {
  PrismaClient,
  RecruitmentVendorCategory,
  RecruitmentVendorOpportunityStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_TAG = '[DEMO]';

/** Deterministic day offset (past/future) so re-seeding produces stable dates. */
function daysFromNow(days: number, hour = 10): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 30, 0, 0);
  return d;
}

interface SeedPlan {
  name: string;
  description: string;
  price: number;
  regularPrice: number;
  discountPercentage: number;
  currency: string;
  durationDays: number;
  sortOrder: number;
}

// -----------------------------------------------------------------------------
// DEMO PLANS — placeholder pricing, NOT approved. Names are stable so the seed
// is idempotent (unique on `name`).
// -----------------------------------------------------------------------------
const PLANS: SeedPlan[] = [
  {
    name: 'Recruitment Vendor Access – 1 Month',
    description: `${DEMO_TAG} Demo placeholder price — confirm RVA pricing in admin before launch. 1 month of full access to the Recruitment Vendor Access vault.`,
    price: 999,
    regularPrice: 1499,
    discountPercentage: 33,
    currency: 'INR',
    durationDays: 30,
    sortOrder: 1,
  },
  {
    name: 'Recruitment Vendor Access – 3 Months',
    description: `${DEMO_TAG} Demo placeholder price — confirm RVA pricing in admin before launch. 3 months of full access to the Recruitment Vendor Access vault.`,
    price: 2499,
    regularPrice: 3499,
    discountPercentage: 29,
    currency: 'INR',
    durationDays: 90,
    sortOrder: 2,
  },
  {
    name: 'Recruitment Vendor Access – 6 Months',
    description: `${DEMO_TAG} Demo placeholder price — confirm RVA pricing in admin before launch. 6 months of full access to the Recruitment Vendor Access vault.`,
    price: 4499,
    regularPrice: 6999,
    discountPercentage: 36,
    currency: 'INR',
    durationDays: 180,
    sortOrder: 3,
  },
];

interface SeedFaq {
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
}

const FAQS: SeedFaq[] = [
  {
    question: 'What is Recruitment Vendor Access?',
    answer:
      'It is a subscription vault that lists recruitment, staffing and vendor opportunities — such as empanelment drives, RFPs/EOIs and partner requirements — shared by companies and organisations looking for recruitment partners.',
    category: 'Overview',
    sortOrder: 1,
  },
  {
    question: 'Who is this for?',
    answer:
      'Recruitment agencies, staffing firms, RPO providers, executive search consultants and independent recruiters who want early visibility of vendor and partner opportunities across key markets.',
    category: 'Overview',
    sortOrder: 2,
  },
  {
    question: 'What do I get with a plan?',
    answer:
      'Full access to the Recruitment Vendor Access vault for the duration of your plan, including opportunity details such as category, sector, geography and the commercial or contact information where provided.',
    category: 'Plans',
    sortOrder: 3,
  },
  {
    question: 'Can I preview opportunities before subscribing?',
    answer:
      'Yes. The free preview shows recent opportunities with the sensitive commercial and contact fields masked. Full details are unlocked once you subscribe.',
    category: 'Access',
    sortOrder: 4,
  },
  {
    question: 'How does activation work?',
    answer:
      'Access is activated automatically after your payment is successfully verified. You can then view full opportunity details from the Recruitment Vendor Access vault.',
    category: 'Billing',
    sortOrder: 5,
  },
  {
    question: 'Is this the same as the Opportunity Vault?',
    answer:
      'No. Recruitment Vendor Access is a separate vault with its own opportunities, plans and access. A subscription to one does not unlock the other.',
    category: 'Overview',
    sortOrder: 6,
  },
];

interface SeedOpportunity {
  referenceId: string;
  jobId: string;
  title: string;
  role: string;
  category: RecruitmentVendorCategory;
  sector: string;
  company: string;
  organization: string;
  budget: string;
  location: string;
  geography: string;
  country: string | null;
  experienceText: string;
  minExperience: number;
  maxExperience: number | null;
  eligibility: string;
  qualification: string;
  requirements: string;
  otherDetails: string;
  howToApply: string;
  applicationContact: string;
  source: string;
  publishedDaysAgo: number;
  expiresInDays: number | null;
  status: RecruitmentVendorOpportunityStatus;
}

// -----------------------------------------------------------------------------
// DEMO OPPORTUNITIES — all fictional companies/contacts. Stable referenceId is
// the idempotency key.
// -----------------------------------------------------------------------------
const OPPORTUNITIES: SeedOpportunity[] = [
  {
    referenceId: 'RVA-DEMO-001',
    jobId: 'RVA-DEMO-001',
    title: 'Recruitment Partner Empanelment – Global IT Services',
    role: 'Recruitment Partner / Empanelment',
    category: 'VENDOR_ENABLEMENT',
    sector: 'Information Technology',
    company: 'Northwind Technologies (Demo)',
    organization: 'Northwind Technologies',
    budget: 'Retainer negotiable based on volume',
    location: 'Bengaluru, India',
    geography: 'India',
    country: 'India',
    experienceText: '5+ years in IT recruitment',
    minExperience: 5,
    maxExperience: null,
    eligibility:
      'Recruitment firms with proven delivery in software engineering and cloud hiring.',
    qualification: 'Registered recruitment agency with GST and a minimum 3 years of operations.',
    requirements:
      'Ability to hire across full-stack, data and DevOps roles on contingent or retained mandates.',
    otherDetails:
      'Empanelment covers permanent and contract hiring across India delivery centres.',
    howToApply: 'Email your company profile to vendor.demo@northwind.example.',
    applicationContact: 'vendor.demo@northwind.example',
    source: 'Vendor engagement programme',
    publishedDaysAgo: 3,
    expiresInDays: 45,
    status: 'PUBLISHED',
  },
  {
    referenceId: 'RVA-DEMO-002',
    jobId: 'RVA-DEMO-002',
    title: 'Staffing Vendor Registration – Manufacturing Group',
    role: 'Staffing Vendor',
    category: 'VENDOR_ENABLEMENT',
    sector: 'Manufacturing',
    company: 'Helix Manufacturing (Demo)',
    organization: 'Helix Manufacturing',
    budget: 'Per-hire commercial model',
    location: 'Pune, India',
    geography: 'India',
    country: 'India',
    experienceText: '3+ years in industrial staffing',
    minExperience: 3,
    maxExperience: null,
    eligibility: 'Vendors with experience supplying plant, production and maintenance manpower.',
    qualification: 'Labour licence and statutory compliance documentation required.',
    requirements:
      'Capability to staff blue-collar and technical roles across multiple plant locations.',
    otherDetails: 'Annual vendor registration with quarterly performance review.',
    howToApply: 'Submit registration details to staffing.demo@helixmfg.example.',
    applicationContact: 'staffing.demo@helixmfg.example',
    source: 'Procurement vendor portal',
    publishedDaysAgo: 6,
    expiresInDays: 60,
    status: 'PUBLISHED',
  },
  {
    referenceId: 'RVA-DEMO-003',
    jobId: 'RVA-DEMO-003',
    title: 'Recruitment Services RFP – Banking Talent Pipeline',
    role: 'Recruitment Services Provider',
    category: 'RFP_EOI_RFQ',
    sector: 'Banking & Financial Services',
    company: 'Meridian Bank (Demo)',
    organization: 'Meridian Bank',
    budget: 'Multi-year managed hiring contract',
    location: 'Mumbai, India',
    geography: 'India',
    country: 'India',
    experienceText: '7+ years in BFSI hiring',
    minExperience: 7,
    maxExperience: null,
    eligibility: 'Established recruitment firms with BFSI and regulatory hiring experience.',
    qualification: 'Track record of hiring for banking operations, risk and compliance roles.',
    requirements:
      'Proposal covering sourcing channels, SLAs, pricing model and diversity hiring approach.',
    otherDetails: 'RFP response window is 30 days from the published date.',
    howToApply: 'Request the RFP pack from rfp.demo@meridianbank.example.',
    applicationContact: 'rfp.demo@meridianbank.example',
    source: 'Corporate procurement RFP',
    publishedDaysAgo: 2,
    expiresInDays: 30,
    status: 'PUBLISHED',
  },
  {
    referenceId: 'RVA-DEMO-004',
    jobId: 'RVA-DEMO-004',
    title: 'EOI: Campus Hiring Partner 2026',
    role: 'Campus Hiring Partner',
    category: 'RFP_EOI_RFQ',
    sector: 'Software Product',
    company: 'Lumina Software (Demo)',
    organization: 'Lumina Software',
    budget: 'Success-fee based',
    location: 'Hyderabad, India',
    geography: 'India',
    country: 'India',
    experienceText: '4+ years in campus/early-career hiring',
    minExperience: 4,
    maxExperience: null,
    eligibility: 'Partners with active relationships across engineering colleges.',
    qualification: 'Experience running campus drives for technical and product roles.',
    requirements: 'Ability to coordinate assessment, scheduling and onboarding logistics.',
    otherDetails: 'Expected intake for the 2026 graduate cohort is 120 hires.',
    howToApply: 'Send your EOI to campus.demo@luminasoft.example.',
    applicationContact: 'campus.demo@luminasoft.example',
    source: 'Talent acquisition EOI',
    publishedDaysAgo: 8,
    expiresInDays: 40,
    status: 'PUBLISHED',
  },
  {
    referenceId: 'RVA-DEMO-005',
    jobId: 'RVA-DEMO-005',
    title: 'RPO Partner Requirement – BFSI Hiring',
    role: 'RPO Partner',
    category: 'STAFFING_RPO',
    sector: 'Banking & Financial Services',
    company: 'Apex Financial Services (Demo)',
    organization: 'Apex Financial Services',
    budget: 'Annual RPO mandate',
    location: 'Gurugram, India',
    geography: 'India',
    country: 'India',
    experienceText: '8+ years running RPO engagements',
    minExperience: 8,
    maxExperience: null,
    eligibility: 'RPO providers with dedicated delivery teams and ATS experience.',
    qualification: 'Demonstrated RPO delivery for financial services clients.',
    requirements: 'End-to-end ownership of sourcing, screening and offer management.',
    otherDetails: 'Mandate covers sales, operations and compliance functions.',
    howToApply: 'Contact rpo.demo@apexfinancial.example for the partner brief.',
    applicationContact: 'rpo.demo@apexfinancial.example',
    source: 'RPO partner search',
    publishedDaysAgo: 5,
    expiresInDays: 50,
    status: 'PUBLISHED',
  },
  {
    referenceId: 'RVA-DEMO-006',
    jobId: 'RVA-DEMO-006',
    title: 'Contingent Staffing Partner – Retail Rollout',
    role: 'Contingent Staffing Partner',
    category: 'STAFFING_RPO',
    sector: 'Retail',
    company: 'Crestline Retail (Demo)',
    organization: 'Crestline Retail',
    budget: 'Volume-based staffing contract',
    location: 'Chennai, India',
    geography: 'India',
    country: 'India',
    experienceText: '3+ years in retail staffing',
    minExperience: 3,
    maxExperience: null,
    eligibility: 'Staffing partners able to hire across multiple store locations.',
    qualification: 'Experience with high-volume frontline and store-management hiring.',
    requirements: 'Ability to onboard staff within tight rollout timelines.',
    otherDetails: 'Rollout spans 25 new stores over two quarters.',
    howToApply: 'Share your capability deck with staffing.demo@crestlineretail.example.',
    applicationContact: 'staffing.demo@crestlineretail.example',
    source: 'Operations expansion',
    publishedDaysAgo: 10,
    expiresInDays: 55,
    status: 'PUBLISHED',
  },
  {
    referenceId: 'RVA-DEMO-007',
    jobId: 'RVA-DEMO-007',
    title: 'Executive Search Partner – C-Suite Mandates',
    role: 'Executive Search Partner',
    category: 'EXECUTIVE_SEARCH',
    sector: 'Professional Services',
    company: 'Vantage Group (Demo)',
    organization: 'Vantage Group',
    budget: 'Retained search fee',
    location: 'Dubai, UAE',
    geography: 'Middle East',
    country: 'United Arab Emirates',
    experienceText: '10+ years in executive search',
    minExperience: 10,
    maxExperience: null,
    eligibility: 'Boutique or global search firms with C-suite placement history.',
    qualification: 'Proven placements at CEO, CFO and board level in the region.',
    requirements: 'Confidential search capability and a strong GCC network.',
    otherDetails: 'Initial mandates span consumer and technology businesses.',
    howToApply: 'Email partner.demo@vantagegroup.example to register interest.',
    applicationContact: 'partner.demo@vantagegroup.example',
    source: 'Board engagement',
    publishedDaysAgo: 4,
    expiresInDays: 70,
    status: 'PUBLISHED',
  },
  {
    referenceId: 'RVA-DEMO-008',
    jobId: 'RVA-DEMO-008',
    title: 'Leadership Hiring Partner – Board Appointments',
    role: 'Leadership Hiring Partner',
    category: 'EXECUTIVE_SEARCH',
    sector: 'Investment / Financial Services',
    company: 'Orion Capital (Demo)',
    organization: 'Orion Capital',
    budget: 'Retained mandate',
    location: 'Singapore',
    geography: 'APAC',
    country: 'Singapore',
    experienceText: '12+ years in leadership hiring',
    minExperience: 12,
    maxExperience: null,
    eligibility: 'Search partners with board and independent-director placement experience.',
    qualification: 'Established network across financial services leadership.',
    requirements: 'Discretion, governance awareness and longlist/shortlist rigour.',
    otherDetails: 'Appointments include independent directors and committee chairs.',
    howToApply: 'Contact hiring.demo@orioncapital.example for the mandate pack.',
    applicationContact: 'hiring.demo@orioncapital.example',
    source: 'Governance hiring programme',
    publishedDaysAgo: 7,
    expiresInDays: 80,
    status: 'PUBLISHED',
  },
  {
    referenceId: 'RVA-DEMO-009',
    jobId: 'RVA-DEMO-009',
    title: 'Talent Acquisition Partner Invitation',
    role: 'Talent Acquisition Partner',
    category: 'OTHER',
    sector: 'Healthcare',
    company: 'Nova Health Systems (Demo)',
    organization: 'Nova Health Systems',
    budget: 'Partnership agreement',
    location: 'Remote / Global',
    geography: 'Global',
    country: null,
    experienceText: '5+ years in healthcare recruitment',
    minExperience: 5,
    maxExperience: null,
    eligibility: 'Recruitment partners with healthcare and clinical hiring experience.',
    qualification: 'Experience hiring clinical, nursing and allied-health roles.',
    requirements: 'Ability to support remote and multi-geography hiring.',
    otherDetails: 'Open to partners across India, the Middle East and APAC.',
    howToApply: 'Send an introduction to talent.demo@novahealth.example.',
    applicationContact: 'talent.demo@novahealth.example',
    source: 'Partner network',
    publishedDaysAgo: 9,
    expiresInDays: null,
    status: 'PUBLISHED',
  },
  {
    referenceId: 'RVA-DEMO-010',
    jobId: 'RVA-DEMO-010',
    title: 'Recruitment Services Empanelment – Public Sector',
    role: 'Empanelled Recruitment Agency',
    category: 'OTHER',
    sector: 'Public Sector',
    company: 'CivicWorks Consulting (Demo)',
    organization: 'CivicWorks Consulting',
    budget: 'Rate-card based',
    location: 'New Delhi, India',
    geography: 'India',
    country: 'India',
    experienceText: '6+ years in public-sector hiring',
    minExperience: 6,
    maxExperience: null,
    eligibility: 'Agencies with prior public-sector or PSU hiring experience.',
    qualification: 'Compliance with empanelment eligibility norms.',
    requirements: 'Ability to handle documentation-heavy hiring processes.',
    otherDetails: 'Draft record — pending final approval before publishing.',
    howToApply: 'Registration details to be shared after approval.',
    applicationContact: 'empanel.demo@civicworks.example',
    source: 'Empanelment programme',
    publishedDaysAgo: 1,
    expiresInDays: 90,
    status: 'DRAFT',
  },
];

async function seedPlans(): Promise<{ created: number; existing: number }> {
  let created = 0;
  let existing = 0;
  for (const plan of PLANS) {
    const found = await prisma.recruitmentVendorPlan.findUnique({ where: { name: plan.name } });
    if (found) {
      existing += 1;
      continue;
    }
    await prisma.recruitmentVendorPlan.create({
      data: {
        name: plan.name,
        description: plan.description,
        price: plan.price,
        regularPrice: plan.regularPrice,
        discountPercentage: plan.discountPercentage,
        currency: plan.currency,
        durationDays: plan.durationDays,
        sortOrder: plan.sortOrder,
        isActive: true,
      },
    });
    created += 1;
  }
  return { created, existing };
}

async function seedFaqs(): Promise<{ created: number; existing: number }> {
  let created = 0;
  let existing = 0;
  for (const faq of FAQS) {
    const found = await prisma.recruitmentVendorFaq.findFirst({ where: { question: faq.question } });
    if (found) {
      existing += 1;
      continue;
    }
    await prisma.recruitmentVendorFaq.create({
      data: {
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        sortOrder: faq.sortOrder,
        isActive: true,
      },
    });
    created += 1;
  }
  return { created, existing };
}

async function seedOpportunities(
  createdBy: string | null,
): Promise<{ created: number; existing: number }> {
  let created = 0;
  let existing = 0;
  for (const o of OPPORTUNITIES) {
    const found = await prisma.recruitmentVendorOpportunity.findFirst({
      where: { referenceId: o.referenceId, deletedAt: null },
    });
    if (found) {
      existing += 1;
      continue;
    }
    await prisma.recruitmentVendorOpportunity.create({
      data: {
        referenceId: o.referenceId,
        jobId: o.jobId,
        title: o.title,
        role: o.role,
        category: o.category,
        sector: o.sector,
        company: o.company,
        organization: o.organization,
        budget: o.budget,
        location: o.location,
        geography: o.geography,
        country: o.country ?? null,
        experienceText: o.experienceText,
        minExperience: o.minExperience,
        maxExperience: o.maxExperience,
        eligibility: o.eligibility,
        qualification: o.qualification,
        requirements: o.requirements,
        otherDetails: o.otherDetails,
        howToApply: o.howToApply,
        applicationContact: o.applicationContact,
        source: o.source,
        publishedDate: o.status === 'PUBLISHED' ? daysFromNow(-o.publishedDaysAgo) : null,
        expiryDate: o.expiresInDays === null ? null : daysFromNow(o.expiresInDays, 23),
        status: o.status,
        createdBy,
      },
    });
    created += 1;
  }
  return { created, existing };
}

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_RVA_SEED !== 'true') {
    console.error(
      'Refusing to seed Recruitment Vendor Access demo data in production.\n' +
        'Set ALLOW_RVA_SEED=true to override (only if you intend to seed demo data).',
    );
    process.exit(1);
  }

  console.log('Seeding Recruitment Vendor Access demo data...');

  // Attribute seeded opportunities to the dev admin when it exists (optional).
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@gravitasedge.local';
  const admin = await prisma.user.findFirst({ where: { email: adminEmail, deletedAt: null } });
  const createdBy = admin?.id ?? null;

  const plans = await seedPlans();
  const faqs = await seedFaqs();
  const opportunities = await seedOpportunities(createdBy);

  console.log(
    `Plans:        ${plans.created} created, ${plans.existing} already present\n` +
      `Opportunities:${opportunities.created} created, ${opportunities.existing} already present\n` +
      `FAQs:         ${faqs.created} created, ${faqs.existing} already present`,
  );
  console.log(
    '\nNOTE: Plan prices are DEMO placeholders and are not approved. ' +
      'Configure real RVA pricing in the admin panel before launch.',
  );
}

main()
  .catch((err) => {
    console.error('RVA seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
