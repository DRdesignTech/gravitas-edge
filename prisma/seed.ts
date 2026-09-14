// =============================================================================
// DEVELOPMENT SEED DATA ONLY.
//
// IMPORTANT: This seed is for LOCAL DEVELOPMENT / DEMO purposes ONLY.
//   - The admin credentials and all demo account credentials below are
//     intentionally weak and MUST NOT be used in production.
//   - Payments are static/demo test records only and are NOT connected to any
//     external payment provider (Razorpay is NOT integrated here).
//
// The seed is IDEMPOTENT: re-running it will upsert reference/master data and
// create deterministic demo records without duplicating existing users,
// subscriptions, opportunities, or payments. It NEVER deletes existing data.
// =============================================================================

import { PrismaClient, SubscriptionStatus, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  syncPricingCatalog,
  CatalogSyncSummary,
} from '../apps/api/src/subscriptions/pricing-catalog.sync';
import { planName } from '../apps/api/src/subscriptions/pricing-catalog';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Demo@1234';
const DEMO_HASH_ROUNDS = 12;

// Admin credentials are read from the environment so real credentials are
// never committed to source. The email default below matches the legacy
// dev-only demo admin so existing local databases and reset-demo.ts keep
// working; override via SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD.
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@gravitasedge.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Demo@1234';

// Deterministic pseudo-random generator so re-seeding is stable / idempotent.
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function daysAgo(days: number, hour = 10): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 30, 0, 0);
  return d;
}

async function main() {
  console.log('Seeding development data...');

  const rnd = mulberry32(42);

  // ---------------------------------------------------------------------------
  // ROLES
  // ---------------------------------------------------------------------------
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN', description: 'Platform administrator' },
  });

  const userRole = await prisma.role.upsert({
    where: { name: 'USER' },
    update: {},
    create: { name: 'USER', description: 'Regular platform user' },
  });

  console.log(`Roles: ${adminRole.name}, ${userRole.name}`);

  // ---------------------------------------------------------------------------
  // EXPERIENCE LEVELS
  // ---------------------------------------------------------------------------
  const career = await prisma.experienceLevel.upsert({
    where: { slug: 'career' },
    update: {},
    create: {
      name: 'Career Access',
      slug: 'career',
      code: 'CAREER',
      minYears: 0,
      maxYears: 5,
      sortOrder: 1,
    },
  });
  const professional = await prisma.experienceLevel.upsert({
    where: { slug: 'professional' },
    update: {},
    create: {
      name: 'Professional Access',
      slug: 'professional',
      code: 'PROFESSIONAL',
      minYears: 5,
      maxYears: 10,
      sortOrder: 2,
    },
  });
  const leadership = await prisma.experienceLevel.upsert({
    where: { slug: 'leadership' },
    update: {},
    create: {
      name: 'Leadership Access',
      slug: 'leadership',
      code: 'LEADERSHIP',
      minYears: 10,
      maxYears: 15,
      sortOrder: 3,
    },
  });
  const executive = await prisma.experienceLevel.upsert({
    where: { slug: 'executive' },
    update: {},
    create: {
      name: 'Executive Access',
      slug: 'executive',
      code: 'EXECUTIVE',
      minYears: 15,
      maxYears: null,
      sortOrder: 4,
    },
  });
  console.log('Experience levels seeded.');

  // ---------------------------------------------------------------------------
  // VAULTS + PRICING CATALOG (6 business vaults x 3 durations = 18 plans)
  // Idempotent: re-running always converges onto the current catalog and never
  // deletes data. Legacy plans/vaults are archived, never removed.
  // ---------------------------------------------------------------------------
  const synced = await syncPricingCatalog(prisma);
  console.log('Pricing catalog synced.', catalogSummaryParts(synced));

  const vaultRows = await vaultLookup('Early Career Access Vault', 'Management Access Vault', 'Leadership Access Vault', 'Executive Access Vault', 'Remote Access Vault', 'UAE & Global Access Vault');
  const vaults = {
    earlyCareer: vaultRows['Early Career Access Vault'],
    management: vaultRows['Management Access Vault'],
    leadership: vaultRows['Leadership Access Vault'],
    executive: vaultRows['Executive Access Vault'],
    remote: vaultRows['Remote Access Vault'],
    uae: vaultRows['UAE & Global Access Vault'],
  };
  const planVaultMap = await buildPlanVaultMap();
  const planByKey = (vaultName: string, label: string) => {
    const plan = planVaultMap.byName.get(planName(vaultName, label));
    if (!plan) {
      throw new Error(`[seed] catalog plan missing after sync: ${planName(vaultName, label)}`);
    }
    return plan;
  };

  // ---------------------------------------------------------------------------
  // REFERRAL SLABS
  // ---------------------------------------------------------------------------
  const slabs = [
    { minReferrals: 1, maxReferrals: 5, commissionPercentage: 5 },
    { minReferrals: 6, maxReferrals: 10, commissionPercentage: 10 },
    { minReferrals: 11, maxReferrals: 20, commissionPercentage: 15 },
    { minReferrals: 21, maxReferrals: null, commissionPercentage: 20 },
  ];
  for (const slab of slabs) {
    await prisma.referralSlab.upsert({ where: { minReferrals: slab.minReferrals }, update: {}, create: slab });
  }
  console.log('Referral slabs seeded.');

  // ---------------------------------------------------------------------------
  // SUBSCRIPTION PLANS & VAULT MAPPINGS
  // Created by syncPricingCatalog above (18 catalog plans + legacy archiving).
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // ADMIN ACCOUNT (DEVELOPMENT/DEMO ONLY)
  //   Email:      SEED_ADMIN_EMAIL  (env override)
  //   Password:   SEED_ADMIN_PASSWORD  (env override)
  // ---------------------------------------------------------------------------
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      status: 'ACTIVE',
      emailVerified: true,
      deletedAt: null,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, DEMO_HASH_ROUNDS),
    },
    create: {
      email: ADMIN_EMAIL,
      phone: null,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, DEMO_HASH_ROUNDS),
      status: 'ACTIVE',
      emailVerified: true,
      createdAt: daysAgo(400),
    },
  });

  // Ensure the ADMIN role is linked (idempotent).
  const hasAdminRole = await prisma.userRole.findUnique({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
  });
  if (!hasAdminRole) {
    await prisma.userRole.create({ data: { userId: admin.id, roleId: adminRole.id } });
  }

  await prisma.userProfile.upsert({
    where: { userId: admin.id },
    update: { fullName: 'Gravitas Edge Admin' },
    create: { userId: admin.id, fullName: 'Gravitas Edge Admin' },
  });

  // Never print credentials to console; document where they come from instead.
  if (process.env.SEED_ADMIN_EMAIL) {
    console.log(`Admin account ready (email from SEED_ADMIN_EMAIL).`);
  } else {
    console.log('Admin account ready (email from SEED_ADMIN_EMAIL env, or default dev value).');
  }

  // ---------------------------------------------------------------------------
  // DEMO USERS (18 total) spread across the last 12 months
  // ---------------------------------------------------------------------------
  const demoUsers = [
    { name: 'Rahul Sharma', city: 'Mumbai', exp: 3, job: 'Frontend Developer', company: 'TechNova' },
    { name: 'Priya Patel', city: 'Bengaluru', exp: 7, job: 'Product Manager', company: 'FinEdge' },
    { name: 'Amit Verma', city: 'Delhi', exp: 12, job: 'Engineering Manager', company: 'CloudSync' },
    { name: 'Sneha Iyer', city: 'Chennai', exp: 5, job: 'Backend Engineer', company: 'DataHive' },
    { name: 'Vikram Singh', city: 'Pune', exp: 16, job: 'CTO', company: 'StartupX' },
    { name: 'Ananya Gupta', city: 'Hyderabad', exp: 2, job: 'Data Analyst', company: 'InsightLab' },
    { name: 'Karan Mehta', city: 'Ahmedabad', exp: 9, job: 'DevOps Architect', company: 'CloudWorks' },
    { name: 'Neha Reddy', city: 'Bengaluru', exp: 4, job: 'UI/UX Designer', company: 'PixelFirm' },
    { name: 'Rohit Kumar', city: 'Noida', exp: 6, job: 'Full Stack Engineer', company: 'AppForge' },
    { name: 'Pooja Joshi', city: 'Jaipur', exp: 1, job: 'Trainee Engineer', company: 'MediCore' },
    { name: 'Arjun Nair', city: 'Kochi', exp: 11, job: 'Solutions Architect', company: 'InfraHub' },
    { name: 'Divya Menon', city: 'Thiruvananthapuram', exp: 8, job: 'Data Scientist', company: 'AILabs' },
    { name: 'Sandeep Rao', city: 'Mumbai', exp: 13, job: 'Delivery Head', company: 'SysEdge' },
    { name: 'Kavita Das', city: 'Kolkata', exp: 18, job: 'VP Engineering', company: 'NovaTech' },
    { name: 'Manish Bhalla', city: 'Gurugram', exp: 10, job: 'Tech Lead', company: 'PaySphere' },
    { name: 'Ritu Agarwal', city: 'Lucknow', exp: 3, job: 'QA Engineer', company: 'TestCraft' },
    { name: 'Gaurav Tiwari', city: 'Bhopal', exp: 6, job: 'Android Developer', company: 'AppMint' },
    { name: 'Shreya Kulkarni', city: 'Nagpur', exp: 2, job: 'Cloud Engineer', company: 'OpsFlow' },
  ];

  const demoUserIdMap: Record<string, string> = {};

  for (let i = 0; i < demoUsers.length; i++) {
    const u = demoUsers[i];
    const email = `demo.user${i + 1}@example.com`;
    const registeredAt = daysAgo(12 + i * 19 + Math.floor(rnd() * 8), 9 + Math.floor(rnd() * 4));

    const user = await prisma.user.upsert({
      where: { email },
      update: { status: 'ACTIVE', emailVerified: true },
      create: {
        email,
        phone: `9${String(100000000 + i * 137).padStart(9, '0')}`,
        passwordHash: await bcrypt.hash(DEMO_PASSWORD, DEMO_HASH_ROUNDS),
        status: 'ACTIVE',
        emailVerified: true,
        createdAt: registeredAt,
      },
    });

    const hasRole = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId: user.id, roleId: userRole.id } },
    });
    if (!hasRole) {
      await prisma.userRole.create({ data: { userId: user.id, roleId: userRole.id } });
    }

    // Varied profile completion states: every other user has a full profile,
    // others have partial (some fields null).
    const complete = i % 2 === 0;
    await prisma.userProfile.upsert({
      where: { userId: user.id },
      update: {
        fullName: u.name,
        location: u.city,
        yearsExperience: u.exp,
        monthsExperience: Math.floor(rnd() * 10) % 12,
        currentJobTitle: u.job,
        currentCompany: u.company,
      },
      create: {
        userId: user.id,
        fullName: complete ? u.name : null,
        location: complete ? u.city : u.city,
        yearsExperience: complete ? u.exp : (rnd() > 0.5 ? u.exp : null),
        monthsExperience: complete ? Math.floor(rnd() * 10) % 12 : null,
        currentJobTitle: complete ? u.job : null,
        currentCompany: complete ? u.company : null,
      },
    });

    demoUserIdMap[email] = user.id;
  }

  console.log(`Demo users seeded (${demoUsers.length}).`);

  // Helper: pick an "experience level slug" based on years.
  const levelForYears = (years: number): string[] => {
    if (years < 5) return ['career'];
    if (years < 10) return ['career', 'professional'];
    if (years < 15) return ['professional', 'leadership'];
    return ['executive'];
  };

  // ---------------------------------------------------------------------------
  // SUBSCRIPTIONS (spread across last 12 months)
  //   - Active, expired, cancelled, pending
  //   - Link to demo users and plans, create vault-access snapshots
  // ---------------------------------------------------------------------------
  const subConfigs: Array<{
    email: string;
    plan: SubscriptionPlanLike;
    status: SubscriptionStatus;
    startDaysAgo: number;
  }> = [
    { email: 'demo.user1@example.com', plan: planByKey('Executive Access Vault', '3 Months'), status: 'ACTIVE', startDaysAgo: 12 },
    { email: 'demo.user2@example.com', plan: planByKey('Remote Access Vault', 'Monthly'), status: 'ACTIVE', startDaysAgo: 25 },
    { email: 'demo.user3@example.com', plan: planByKey('Management Access Vault', 'Monthly'), status: 'ACTIVE', startDaysAgo: 18 },
    { email: 'demo.user4@example.com', plan: planByKey('Early Career Access Vault', '3 Months'), status: 'EXPIRED', startDaysAgo: 60 },
    { email: 'demo.user5@example.com', plan: planByKey('UAE & Global Access Vault', 'Monthly'), status: 'EXPIRED', startDaysAgo: 140 },
    { email: 'demo.user6@example.com', plan: planByKey('Leadership Access Vault', 'Monthly'), status: 'EXPIRED', startDaysAgo: 220 },
    { email: 'demo.user7@example.com', plan: planByKey('Executive Access Vault', '6 Months'), status: 'CANCELLED', startDaysAgo: 40 },
    { email: 'demo.user8@example.com', plan: planByKey('Remote Access Vault', '3 Months'), status: 'CANCELLED', startDaysAgo: 90 },
    { email: 'demo.user9@example.com', plan: planByKey('Early Career Access Vault', 'Monthly'), status: 'PENDING', startDaysAgo: 2 },
    { email: 'demo.user10@example.com', plan: planByKey('Executive Access Vault', 'Monthly'), status: 'ACTIVE', startDaysAgo: 5 },
    { email: 'demo.user11@example.com', plan: planByKey('UAE & Global Access Vault', '6 Months'), status: 'ACTIVE', startDaysAgo: 55 },
    { email: 'demo.user12@example.com', plan: planByKey('Leadership Access Vault', '3 Months'), status: 'ACTIVE', startDaysAgo: 30 },
    { email: 'demo.user13@example.com', plan: planByKey('Management Access Vault', '6 Months'), status: 'EXPIRED', startDaysAgo: 300 },
    { email: 'demo.user14@example.com', plan: planByKey('Remote Access Vault', '6 Months'), status: 'EXPIRED', startDaysAgo: 150 },
    { email: 'demo.user15@example.com', plan: planByKey('Early Career Access Vault', 'Monthly'), status: 'PENDING', startDaysAgo: 1 },
  ];

  const seededSubCount = { created: 0 };
  for (const c of subConfigs) {
    const userId = demoUserIdMap[c.email];
    if (!userId) continue;
    const startDate = daysAgo(c.startDaysAgo, 11);
    const durationDays = Number(c.plan.durationDays);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationDays);

    // Unique constraint is (userId, planId, startDate) - try to upsert.
    const existing = await prisma.subscription.findUnique({
      where: {
        userId_planId_startDate: { userId, planId: c.plan.id, startDate },
      },
    });

    const subscription = existing
      ? await prisma.subscription.update({
          where: { id: existing.id },
          data: {
            status: c.status,
            endDate,
            cancelledAt: c.status === 'CANCELLED' ? new Date(Date.now() - 3 * 86400000) : null,
            cancellationReason: c.status === 'CANCELLED' ? 'Demo cancellation' : null,
          },
        })
      : await prisma.subscription.create({
          data: {
            userId,
            planId: c.plan.id,
            startDate,
            endDate,
            status: c.status,
            paymentReference: `demo-sub-${c.email.split('@')[0]}`,
          },
        });

    // Vault access snapshots for the plan's vaults.
    const vaultIds = planVaultMap.byId[c.plan.id] ?? [];
    for (const vaultId of vaultIds) {
      await prisma.subscriptionVaultAccess.upsert({
        where: { subscriptionId_vaultId: { subscriptionId: subscription.id, vaultId } },
        update: {},
        create: { subscriptionId: subscription.id, vaultId },
      });
    }

    seededSubCount.created++;
  }
  console.log(`Subscriptions seeded (${seededSubCount.created} configs processed).`);

  // ---------------------------------------------------------------------------
  // DEMO PAYMENTS (static/test only - NOT connected to any payment provider)
  //   Only created for successful/active subscriptions to keep analytics sane.
  // ---------------------------------------------------------------------------
  const paidSubs = await prisma.subscription.findMany({
    where: {
      userId: { in: Object.values(demoUserIdMap) },
      status: { in: ['ACTIVE', 'EXPIRED'] },
    },
    include: { plan: true },
  });

  let paymentCount = 0;
  for (const sub of paidSubs) {
    const amount = Number(sub.plan.price);
    const existing = await prisma.payment.findUnique({
      where: { razorpayOrderId: `demo_order_${sub.id}` },
    });
    if (existing) continue;

    await prisma.payment.create({
      data: {
        userId: sub.userId,
        subscriptionId: sub.id,
        razorpayPaymentId: `demo_pay_${sub.id}`,
        razorpayOrderId: `demo_order_${sub.id}`,
        razorpaySubscriptionId: `demo_sub_${sub.id}`,
        amount,
        currency: sub.plan.currency,
        status: 'SUCCESS',
        webhookEvent: 'demo.payment.captured',
        metadata: {
          demo: true,
          note: 'Static development demo payment only. Not connected to Razorpay.',
          planName: sub.plan.name,
        },
        createdAt: sub.startDate,
      },
    });
    paymentCount++;
  }
  console.log(`Demo payments seeded (created ${paymentCount}, skipped existing).`);

  // ---------------------------------------------------------------------------
  // OPPORTUNITIES (30-50 realistic opportunities)
  //   - Public (no vault) and premium (vault-mapped)
  //   - India + Global/Middle East/International
  //   - Published + draft
  //   - Across experience levels, categories, employment types, countries
  // ---------------------------------------------------------------------------
  const now = new Date();

  const oppSeed: Array<{
    title: string;
    company: string;
    location: string;
    country: string;
    industry: string;
    functionalArea: string;
    employmentType: string;
    category: 'INDIA' | 'GLOBAL' | 'MIDDLE_EAST' | 'INTERNATIONAL' | 'OTHER';
    status: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED' | 'EXPIRED';
    minExp: number;
    maxExp: number;
    levelSlugs: string[];
    vault?: string; // key into `vaults`; undefined = public
    publishedDaysAgo: number;
    description: string;
  }> = [
    // India - public
    {
      title: 'Senior Frontend Developer (React)',
      company: 'TechNova Labs',
      location: 'Bengaluru',
      country: 'India',
      industry: 'Information Technology',
      functionalArea: 'Engineering',
      employmentType: 'FULL_TIME',
      category: 'INDIA',
      status: 'PUBLISHED',
      minExp: 3,
      maxExp: 6,
      levelSlugs: ['career', 'professional'],
      publishedDaysAgo: 20,
      description:
        'Build delightful, high-performance web applications for a fast-growing SaaS product. Experience with React, TypeScript and modern CSS is essential.',
    },
    {
      title: 'Product Manager - Payments',
      company: 'FinEdge Solutions',
      location: 'Mumbai',
      country: 'India',
      industry: 'Fintech',
      functionalArea: 'Product',
      employmentType: 'FULL_TIME',
      category: 'INDIA',
      status: 'PUBLISHED',
      minExp: 5,
      maxExp: 9,
      levelSlugs: ['professional'],
      publishedDaysAgo: 15,
      description:
        'Own the roadmap for our payments platform, work with engineering and design to ship features that delight merchants and drivers.',
    },
    {
      title: 'Data Scientist',
      company: 'InsightLab',
      location: 'Hyderabad',
      country: 'India',
      industry: 'Analytics',
      functionalArea: 'Data Science',
      employmentType: 'FULL_TIME',
      category: 'INDIA',
      status: 'PUBLISHED',
      minExp: 3,
      maxExp: 7,
      levelSlugs: ['career', 'professional'],
      publishedDaysAgo: 30,
      description:
        'Apply machine learning to large behavioural datasets and build predictive models that drive business decisions.',
    },
    {
      title: 'DevOps & Cloud Engineer',
      company: 'CloudWorks',
      location: 'Pune',
      country: 'India',
      industry: 'Cloud Infrastructure',
      functionalArea: 'Engineering',
      employmentType: 'FULL_TIME',
      category: 'INDIA',
      status: 'PUBLISHED',
      minExp: 4,
      maxExp: 8,
      levelSlugs: ['professional'],
      publishedDaysAgo: 5,
      description:
        'Design and maintain CI/CD pipelines, Kubernetes clusters and infrastructure as code on AWS and GCP.',
    },
    {
      title: 'UI/UX Designer',
      company: 'PixelFirm',
      location: 'Bengaluru',
      country: 'India',
      industry: 'Design',
      functionalArea: 'Design',
      employmentType: 'FULL_TIME',
      category: 'INDIA',
      status: 'PUBLISHED',
      minExp: 2,
      maxExp: 5,
      levelSlugs: ['career'],
      publishedDaysAgo: 12,
      description:
        'Create intuitive, accessible interfaces and design systems for B2B and B2C products across web and mobile.',
    },
    {
      title: 'QA Automation Engineer',
      company: 'TestCraft',
      location: 'Noida',
      country: 'India',
      industry: 'Quality Assurance',
      functionalArea: 'Engineering',
      employmentType: 'FULL_TIME',
      category: 'INDIA',
      status: 'PUBLISHED',
      minExp: 2,
      maxExp: 5,
      levelSlugs: ['career'],
      publishedDaysAgo: 8,
      description:
        'Build and maintain automated test suites using Selenium and Playwright. Strong attention to detail required.',
    },
    {
      title: 'Android Developer (Kotlin)',
      company: 'AppMint',
      location: 'Gurugram',
      country: 'India',
      industry: 'Mobile Engineering',
      functionalArea: 'Engineering',
      employmentType: 'FULL_TIME',
      category: 'INDIA',
      status: 'PUBLISHED',
      minExp: 3,
      maxExp: 6,
      levelSlugs: ['career', 'professional'],
      publishedDaysAgo: 22,
      description:
        'Develop and ship consumer Android applications using Kotlin, Jetpack Compose and clean architecture patterns.',
    },
    {
      title: 'Trainee Software Engineer',
      company: 'MediCore Health',
      location: 'Jaipur',
      country: 'India',
      industry: 'Healthcare IT',
      functionalArea: 'Engineering',
      employmentType: 'FULL_TIME',
      category: 'INDIA',
      status: 'PUBLISHED',
      minExp: 0,
      maxExp: 2,
      levelSlugs: ['career'],
      publishedDaysAgo: 3,
      description:
        'Great opportunity for early-career engineers to learn full-stack development in a supportive healthcare technology team.',
    },
    {
      title: 'Full Stack Engineer (Node.js + React)',
      company: 'AppForge',
      location: 'Chennai',
      country: 'India',
      industry: 'Software Development',
      functionalArea: 'Engineering',
      employmentType: 'REMOTE',
      category: 'INDIA',
      status: 'PUBLISHED',
      minExp: 4,
      maxExp: 8,
      levelSlugs: ['professional'],
      publishedDaysAgo: 10,
      description:
        'Work remotely on a modern stack - Node.js, TypeScript, React and PostgreSQL - building scalable APIs and UIs.',
    },
    {
      title: 'Security Engineer',
      company: 'SecureSentinel',
      location: 'Bengaluru',
      country: 'India',
      industry: 'Cybersecurity',
      functionalArea: 'Security',
      employmentType: 'FULL_TIME',
      category: 'INDIA',
      status: 'PUBLISHED',
      minExp: 5,
      maxExp: 9,
      levelSlugs: ['professional'],
      publishedDaysAgo: 18,
      description:
        'Harden our cloud infrastructure, run threat modelling and respond to security incidents in a fast-moving product org.',
    },
    // India - premium (vault mapped)
    {
      title: 'Engineering Manager',
      company: 'CloudSync',
      location: 'Delhi',
      country: 'India',
      industry: 'Software Development',
      functionalArea: 'Engineering',
      employmentType: 'FULL_TIME',
      category: 'INDIA',
      status: 'PUBLISHED',
      minExp: 9,
      maxExp: 14,
      levelSlugs: ['leadership'],
      vault: 'leadership',
      publishedDaysAgo: 25,
      description:
        'Lead a team of 12 engineers building distributed systems. Drive technical excellence, mentoring and delivery.',
    },
    {
      title: 'Chief Technology Officer (Early Stage)',
      company: 'StartupX',
      location: 'Pune',
      country: 'India',
      industry: 'SaaS',
      functionalArea: 'Leadership',
      employmentType: 'FULL_TIME',
      category: 'INDIA',
      status: 'PUBLISHED',
      minExp: 12,
      maxExp: 20,
      levelSlugs: ['executive'],
      vault: 'executive',
      publishedDaysAgo: 40,
      description:
        'Own the full technology vision and architecture for a funded early-stage SaaS startup. Hiring and platform strategy in scope.',
    },
    {
      title: 'Solutions Architect',
      company: 'InfraHub',
      location: 'Hyderabad',
      country: 'India',
      industry: 'Enterprise Software',
      functionalArea: 'Architecture',
      employmentType: 'FULL_TIME',
      category: 'INDIA',
      status: 'PUBLISHED',
      minExp: 10,
      maxExp: 15,
      levelSlugs: ['leadership'],
      vault: 'leadership',
      publishedDaysAgo: 35,
      description:
        'Design end-to-end architectures for enterprise clients, balancing scalability, cost and maintainability.',
    },
    {
      title: 'Delivery Head - Digital Platforms',
      company: 'SysEdge',
      location: 'Mumbai',
      country: 'India',
      industry: 'IT Services',
      functionalArea: 'Delivery',
      employmentType: 'FULL_TIME',
      category: 'INDIA',
      status: 'PUBLISHED',
      minExp: 12,
      maxExp: 18,
      levelSlugs: ['executive'],
      vault: 'executive',
      publishedDaysAgo: 50,
      description:
        'Lead a large delivery unit, drive operational excellence, client satisfaction and predictable outcomes across multiple engagements.',
    },
    {
      title: 'Tech Lead - Payments Platform',
      company: 'PaySphere',
      location: 'Gurugram',
      country: 'India',
      industry: 'Fintech',
      functionalArea: 'Engineering',
      employmentType: 'FULL_TIME',
      category: 'INDIA',
      status: 'PUBLISHED',
      minExp: 8,
      maxExp: 13,
      levelSlugs: ['leadership'],
      vault: 'leadership',
      publishedDaysAgo: 16,
      description:
        'Lead technical design and guide a squad of engineers building a resilient, low-latency payments platform.',
    },
    {
      title: 'VP Engineering',
      company: 'NovaTech',
      location: 'Kolkata',
      country: 'India',
      industry: 'Enterprise Software',
      functionalArea: 'Leadership',
      employmentType: 'FULL_TIME',
      category: 'INDIA',
      status: 'PUBLISHED',
      minExp: 14,
      maxExp: 22,
      levelSlugs: ['executive'],
      vault: 'executive',
      publishedDaysAgo: 60,
      description:
        'Own engineering across multiple product lines, with responsibility for talent, culture, architecture and delivery.',
    },
    // Global / International - public
    {
      title: 'Software Engineer - Cloud Platform',
      company: 'NimbusCloud',
      location: 'Berlin',
      country: 'Germany',
      industry: 'Cloud Infrastructure',
      functionalArea: 'Engineering',
      employmentType: 'FULL_TIME',
      category: 'GLOBAL',
      status: 'PUBLISHED',
      minExp: 4,
      maxExp: 8,
      levelSlugs: ['professional'],
      publishedDaysAgo: 14,
      description:
        'Join a global cloud team to build reliable, scalable platform services. Go, Kubernetes and distributed systems experience a plus.',
    },
    {
      title: 'Senior Data Engineer',
      company: 'Vantage Analytics',
      location: 'London',
      country: 'United Kingdom',
      industry: 'Analytics',
      functionalArea: 'Data Engineering',
      employmentType: 'FULL_TIME',
      category: 'GLOBAL',
      status: 'PUBLISHED',
      minExp: 5,
      maxExp: 9,
      levelSlugs: ['professional'],
      publishedDaysAgo: 28,
      description:
        'Build robust data pipelines and warehouses to power analytics for a global cliente base across sectors.',
    },
    {
      title: 'Backend Engineer (Python)',
      company: 'Looply',
      location: 'Amsterdam',
      country: 'Netherlands',
      industry: 'Technology',
      functionalArea: 'Engineering',
      employmentType: 'REMOTE',
      category: 'GLOBAL',
      status: 'PUBLISHED',
      minExp: 3,
      maxExp: 6,
      levelSlugs: ['career', 'professional'],
      publishedDaysAgo: 9,
      description:
        'Remote-first role building Python/Django services for a fast-growing consumer platform. Detail and testing focus required.',
    },
    {
      title: 'DevOps Platform Engineer',
      company: 'Orbital Systems',
      location: 'Singapore',
      country: 'Singapore',
      industry: 'IT Infrastructure',
      functionalArea: 'Engineering',
      employmentType: 'FULL_TIME',
      category: 'GLOBAL',
      status: 'PUBLISHED',
      minExp: 5,
      maxExp: 10,
      levelSlugs: ['professional'],
      publishedDaysAgo: 7,
      description:
        'Build and operate production infrastructure across cloud regions with a strong focus on reliability and automation.',
    },
    {
      title: 'Product Designer',
      company: 'Framewrk',
      location: 'New York',
      country: 'United States',
      industry: 'Design',
      functionalArea: 'Design',
      employmentType: 'FULL_TIME',
      category: 'GLOBAL',
      status: 'PUBLISHED',
      minExp: 3,
      maxExp: 7,
      levelSlugs: ['career', 'professional'],
      publishedDaysAgo: 21,
      description:
        'Craft thoughtful product experiences for global customers. Portfolio demonstrating shipped products required.',
    },
    // Middle East - public
    {
      title: 'Cloud Solutions Consultant',
      company: 'Oasis Digital',
      location: 'Dubai',
      country: 'United Arab Emirates',
      industry: 'Consulting',
      functionalArea: 'Consulting',
      employmentType: 'FULL_TIME',
      category: 'MIDDLE_EAST',
      status: 'PUBLISHED',
      minExp: 6,
      maxExp: 10,
      levelSlugs: ['professional'],
      publishedDaysAgo: 19,
      description:
        'Advise enterprise clients in the region on cloud adoption, migration and optimisation strategies.',
    },
    {
      title: 'Database Administrator',
      company: 'GulfTech Services',
      location: 'Riyadh',
      country: 'Saudi Arabia',
      industry: 'Technology',
      functionalArea: 'Database',
      employmentType: 'FULL_TIME',
      category: 'MIDDLE_EAST',
      status: 'PUBLISHED',
      minExp: 4,
      maxExp: 8,
      levelSlugs: ['professional'],
      publishedDaysAgo: 33,
      description:
        'Manage and optimise PostgreSQL and cloud databases for high-availability enterprise workloads.',
    },
    {
      title: 'Site Reliability Engineer',
      company: 'Skyline Digital',
      location: 'Doha',
      country: 'Qatar',
      industry: 'Technology',
      functionalArea: 'Engineering',
      employmentType: 'FULL_TIME',
      category: 'MIDDLE_EAST',
      status: 'PUBLISHED',
      minExp: 5,
      maxExp: 9,
      levelSlugs: ['professional'],
      publishedDaysAgo: 11,
      description:
        'Ensure the reliability, scalability and performance of critical digital services for a regional leader.',
    },
    // International (non India/ME) - public
    {
      title: 'Machine Learning Engineer',
      company: 'Neuralworks',
      location: 'Toronto',
      country: 'Canada',
      industry: 'Artificial Intelligence',
      functionalArea: 'ML Engineering',
      employmentType: 'FULL_TIME',
      category: 'INTERNATIONAL',
      status: 'PUBLISHED',
      minExp: 4,
      maxExp: 9,
      levelSlugs: ['professional'],
      publishedDaysAgo: 26,
      description:
        'Build and deploy ML models into production for application across NLP and predictive analytics products.',
    },
    {
      title: 'Backend Developer (Go)',
      company: 'CoreStack',
      location: 'Sydney',
      country: 'Australia',
      industry: 'Technology',
      functionalArea: 'Engineering',
      employmentType: 'FULL_TIME',
      category: 'INTERNATIONAL',
      status: 'PUBLISHED',
      minExp: 3,
      maxExp: 7,
      levelSlugs: ['career', 'professional'],
      publishedDaysAgo: 13,
      description:
        'Design and implement high-throughput backend services in Go. Message queues and event-driven design are central to the role.',
    },
    {
      title: 'Cybersecurity Analyst',
      company: 'ShieldWorks',
      location: 'Wellington',
      country: 'New Zealand',
      industry: 'Cybersecurity',
      functionalArea: 'Security',
      employmentType: 'FULL_TIME',
      category: 'INTERNATIONAL',
      status: 'PUBLISHED',
      minExp: 3,
      maxExp: 7,
      levelSlugs: ['career', 'professional'],
      publishedDaysAgo: 42,
      description:
        'Monitor, detect and respond to security threats across a growing digital estate. Certifications and hands-on experience valued.',
    },
    {
      title: 'Growth Marketing Manager',
      company: 'Launchpad',
      location: 'Austin',
      country: 'United States',
      industry: 'Marketing',
      functionalArea: 'Marketing',
      employmentType: 'FULL_TIME',
      category: 'INTERNATIONAL',
      status: 'PUBLISHED',
      minExp: 5,
      maxExp: 9,
      levelSlugs: ['professional'],
      publishedDaysAgo: 6,
      description:
        'Own acquisition and lifecycle marketing for a consumer app. Data-driven experimentation across paid and organic channels.',
    },
    // Premium global/international opportunities (vault-mapped)
    {
      title: 'Principal Engineer - Distributed Systems',
      company: 'NimbusCloud',
      location: 'Berlin',
      country: 'Germany',
      industry: 'Cloud Infrastructure',
      functionalArea: 'Engineering',
      employmentType: 'FULL_TIME',
      category: 'GLOBAL',
      status: 'PUBLISHED',
      minExp: 10,
      maxExp: 16,
      levelSlugs: ['leadership'],
      vault: 'remote',
      publishedDaysAgo: 44,
      description:
        'Provide technical leadership for distributed storage systems used by enterprise customers worldwide.',
    },
    {
      title: 'Head of Engineering (EMEA Region)',
      company: 'Orbital Systems',
      location: 'London',
      country: 'United Kingdom',
      industry: 'Infrastructure',
      functionalArea: 'Leadership',
      employmentType: 'FULL_TIME',
      category: 'GLOBAL',
      status: 'PUBLISHED',
      minExp: 12,
      maxExp: 20,
      levelSlugs: ['executive'],
      vault: 'remote',
      publishedDaysAgo: 55,
      description:
        'Lead and grow engineering teams across the EMEA region with accountability for delivery and hiring.',
    },
    {
      title: 'Enterprise Architecture Director',
      company: 'Oasis Digital',
      location: 'Dubai',
      country: 'United Arab Emirates',
      industry: 'Consulting',
      functionalArea: 'Architecture',
      employmentType: 'FULL_TIME',
      category: 'MIDDLE_EAST',
      status: 'PUBLISHED',
      minExp: 12,
      maxExp: 18,
      levelSlugs: ['executive'],
      vault: 'uae',
      publishedDaysAgo: 70,
      description:
        'Lead enterprise architecture engagements for large government and corporate clients in the Middle East.',
    },
    {
      title: 'Regional IT Director',
      company: 'GulfTech Services',
      location: 'Dubai',
      country: 'United Arab Emirates',
      industry: 'Technology',
      functionalArea: 'Leadership',
      employmentType: 'FULL_TIME',
      category: 'MIDDLE_EAST',
      status: 'PUBLISHED',
      minExp: 11,
      maxExp: 17,
      levelSlugs: ['leadership'],
      vault: 'uae',
      publishedDaysAgo: 48,
      description:
        'Owne regional IT operations, service delivery and strategic roadmaps across the GCC.',
    },
    {
      title: 'Distinguished Engineer - AI Platforms',
      company: 'Neuralworks',
      location: 'Toronto',
      country: 'Canada',
      industry: 'Artificial Intelligence',
      functionalArea: 'Engineering',
      employmentType: 'FULL_TIME',
      category: 'INTERNATIONAL',
      status: 'PUBLISHED',
      minExp: 12,
      maxExp: 20,
      levelSlugs: ['executive'],
      vault: 'remote',
      publishedDaysAgo: 62,
      description:
        'Lead the technical vision for AI platform products used by global enterprises, setting engineering standards.',
    },
    // Draft / archived / expired opportunities
    {
      title: 'Junior Support Engineer (Draft)',
      company: 'CloudWorks',
      location: 'Pune',
      country: 'India',
      industry: 'Cloud Infrastructure',
      functionalArea: 'Support',
      employmentType: 'FULL_TIME',
      category: 'INDIA',
      status: 'DRAFT',
      minExp: 0,
      maxExp: 2,
      levelSlugs: ['career'],
      publishedDaysAgo: 5,
      description: 'Draft role - L1 technical support for cloud platform customers.',
    },
    {
      title: 'Data Platform Engineer (Draft)',
      company: 'FinEdge Solutions',
      location: 'Mumbai',
      country: 'India',
      industry: 'Fintech',
      functionalArea: 'Data Engineering',
      employmentType: 'FULL_TIME',
      category: 'INDIA',
      status: 'DRAFT',
      minExp: 5,
      maxExp: 9,
      levelSlugs: ['professional'],
      publishedDaysAgo: 4,
      description: 'Draft role - build data platforms for financial analytics.',
    },
    {
      title: 'Mobile Developer (Archived)',
      company: 'AppMint',
      location: 'Gurugram',
      country: 'India',
      industry: 'Mobile Engineering',
      functionalArea: 'Engineering',
      employmentType: 'FULL_TIME',
      category: 'INDIA',
      status: 'ARCHIVED',
      minExp: 3,
      maxExp: 6,
      levelSlugs: ['career'],
      publishedDaysAgo: 120,
      description: 'Previously posted mobile engineering role (archived).',
    },
    {
      title: 'Legacy Support Engineer (Expired)',
      company: 'TechNova Labs',
      location: 'Noida',
      country: 'India',
      industry: 'Information Technology',
      functionalArea: 'Support',
      employmentType: 'CONTRACT',
      category: 'INDIA',
      status: 'EXPIRED',
      minExp: 2,
      maxExp: 5,
      levelSlugs: ['career'],
      publishedDaysAgo: 160,
      description: 'Expired contract support role.',
    },
  ];

  // Track recently published opportunities and publish across realistic dates.
  let oppCount = 0;
  for (const o of oppSeed) {
    const publishedDate = o.publishedDaysAgo >= 0 ? daysAgo(o.publishedDaysAgo, 9) : now;
    const expiryDate = new Date(publishedDate);
    expiryDate.setDate(expiryDate.getDate() + 45);

    const existingOpp = await prisma.opportunity.findFirst({
      where: { title: o.title, company: o.company },
    });

    const opportunity = existingOpp
      ? await prisma.opportunity.update({
          where: { id: existingOpp.id },
          data: {
            status: o.status as any,
            publishedDate: o.status === 'PUBLISHED' ? publishedDate : null,
          },
        })
      : await prisma.opportunity.create({
          data: {
            title: o.title,
            company: o.company,
            location: o.location,
            country: o.country,
            industry: o.industry,
            functionalArea: o.functionalArea,
            employmentType: o.employmentType as any,
            category: o.category,
            status: o.status,
            minExperience: o.minExp,
            maxExperience: o.maxExp,
            publishedDate: o.status === 'PUBLISHED' ? publishedDate : null,
            expiryDate: o.status === 'PUBLISHED' ? expiryDate : null,
            description: o.description,
            applicationUrl: `https://example.com/apply/${o.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
            applicationContact: `careers@${o.company.toLowerCase().replace(/[^a-z0-9]+/g, '')}.example.com`,
            source: 'SEED',
            createdBy: admin.id,
          },
        });

    // Link experience levels
    const levelIds: Array<{ id: string }> = [];
    for (const slug of o.levelSlugs) {
      if (slug === 'career') levelIds.push(career);
      else if (slug === 'professional') levelIds.push(professional);
      else if (slug === 'leadership') levelIds.push(leadership);
      else if (slug === 'executive') levelIds.push(executive);
    }
    for (const lvl of levelIds) {
      await prisma.opportunityExperienceLevel.upsert({
        where: { opportunityId_experienceLevelId: { opportunityId: opportunity.id, experienceLevelId: lvl.id } },
        update: {},
        create: { opportunityId: opportunity.id, experienceLevelId: lvl.id },
      });
    }

    // Link premium opportunities to a specific vault (public ones get none)
    if (o.vault && vaults[o.vault as keyof typeof vaults]) {
      const v = vaults[o.vault as keyof typeof vaults];
      await prisma.opportunityVault.upsert({
        where: { opportunityId_vaultId: { opportunityId: opportunity.id, vaultId: v.id } },
        update: {},
        create: { opportunityId: opportunity.id, vaultId: v.id },
      });
    }

    oppCount++;
  }
  console.log(`Opportunities seeded (${oppCount} definitions processed).`);

  console.log('');
  console.log('==========================================================');
  console.log('Development seeding complete.');
  console.log('');
  console.log('DEMO ADMIN LOGIN:');
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log('  Password: set via SEED_ADMIN_PASSWORD (does not echo it here)');
  console.log('  Role:     ADMIN');
  console.log('');
  console.log('DEMO USER LOGINS (dev-only demo users):');
  console.log('  e.g. demo.user1@example.com (password is the dev demo password, not echoed)');
  console.log('==========================================================');
}

type SubscriptionPlanLike = {
  id: string;
  price: number | Prisma.Decimal | string;
  currency: string;
  durationDays: number;
};

function catalogSummaryParts(s: CatalogSyncSummary): string {
  return [
    `vaults created ${s.vaultsCreated}`,
    `updated ${s.vaultsUpdated}`,
    `archived ${s.vaultsArchived}`,
    `plans created ${s.plansCreated}`,
    `updated ${s.plansUpdated}`,
    `archived ${s.plansArchived}`,
    `plan-vault links ${s.planVaultLinks}`,
  ].join(', ');
}

async function vaultLookup(...names: string[]): Promise<Record<string, { id: string }>> {
  const result: Record<string, { id: string }> = {};
  for (const name of names) {
    const vault = await prisma.vault.findUniqueOrThrow({ where: { name }, select: { id: true } });
    result[name] = vault;
  }
  return result;
}

async function buildPlanVaultMap(): Promise<{ byId: Record<string, string[]>; byName: Map<string, SubscriptionPlanLike> }> {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { deletedAt: null },
    include: { vaults: { select: { vaultId: true } } },
  });
  const byId: Record<string, string[]> = {};
  const byName = new Map<string, SubscriptionPlanLike>();
  for (const p of plans) {
    byId[p.id] = p.vaults.map((v) => v.vaultId);
    byName.set(p.name, p);
  }
  return { byId, byName };
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Seeding failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
