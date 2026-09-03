// =============================================================================
// DEVELOPMENT SEED DATA ONLY.
// Seeds roles, experience levels, gold-standard vaults, referral slabs, and
// sample subscription plans. Does NOT create fake users, payments, or
// commissions. Purely reference/master data required for the app to function.
//
// NOTE: Type-only usage of Prisma for scripting.
// =============================================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding development data...');

  // ---- Roles ------------------------------------------------------------
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'Platform administrator',
    },
  });

  const userRole = await prisma.role.upsert({
    where: { name: 'USER' },
    update: {},
    create: {
      name: 'USER',
      description: 'Regular platform user',
    },
  });

  console.log(`Roles: ${adminRole.name}, ${userRole.name}`);

  // ---- Experience access levels (India opportunities) -------------------
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

  // ---- Vaults -----------------------------------------------------------
  const indiaCareer = await seedVault('India Career', 'INDIA', [career]);
  const indiaProfessional = await seedVault('India Professional', 'INDIA', [professional]);
  const indiaLeadership = await seedVault('India Leadership', 'INDIA', [leadership]);
  const indiaExecutive = await seedVault('India Executive', 'INDIA', [executive]);
  const globalAccess = await seedVault('Global Access', 'GLOBAL', []);
  const middleEast = await seedVault('Middle East Opportunities', 'MIDDLE_EAST', []);
  const international = await seedVault('International Opportunities', 'INTERNATIONAL', []);

  console.log('Vaults seeded.');

  // ---- Referral slabs ---------------------------------------------------
  const slabs = [
    { minReferrals: 1, maxReferrals: 5, commissionPercentage: 5 },
    { minReferrals: 6, maxReferrals: 10, commissionPercentage: 10 },
    { minReferrals: 11, maxReferrals: 20, commissionPercentage: 15 },
    { minReferrals: 21, maxReferrals: null, commissionPercentage: 20 },
  ];

  for (const slab of slabs) {
    await prisma.referralSlab.upsert({
      where: {
        minReferrals: slab.minReferrals,
      },
      update: {},
      create: slab,
    });
  }

  console.log('Referral slabs seeded.');

  // ---- Sample subscription plans ---------------------------------------
  const planIndia = await prisma.subscriptionPlan.upsert({
    where: { name: 'India Access Plan' },
    update: {},
    create: {
      name: 'India Access Plan',
      description: 'Access to all India vaults',
      price: 499,
      currency: 'INR',
      durationDays: 30,
    },
  });

  const planGlobal = await prisma.subscriptionPlan.upsert({
    where: { name: 'Global Access Plan' },
    update: {},
    create: {
      name: 'Global Access Plan',
      description: 'Access to global, middle east and international vaults',
      price: 999,
      currency: 'INR',
      durationDays: 30,
    },
  });

  const planAll = await prisma.subscriptionPlan.upsert({
    where: { name: 'All Access Plan' },
    update: {},
    create: {
      name: 'All Access Plan',
      description: 'Access to all vaults',
      price: 1499,
      currency: 'INR',
      durationDays: 30,
    },
  });

  // Link plans to vaults
  await linkPlanVaults(planIndia.id, [indiaCareer, indiaProfessional, indiaLeadership, indiaExecutive]);
  await linkPlanVaults(planGlobal.id, [globalAccess, middleEast, international]);
  await linkPlanVaults(planAll.id, [
    indiaCareer,
    indiaProfessional,
    indiaLeadership,
    indiaExecutive,
    globalAccess,
    middleEast,
    international,
  ]);

  console.log('Subscription plans seeded.');

  console.log('Development seeding complete.');
}

async function seedVault(name: string, type: any, experienceLevels: any[]) {
  const vault = await prisma.vault.upsert({
    where: { name },
    update: {},
    create: { name, type, description: `${name} vault`, sortOrder: 0 },
  });

  for (const level of experienceLevels) {
    await prisma.vaultExperienceLevel.upsert({
      where: {
        vaultId_experienceLevelId: { vaultId: vault.id, experienceLevelId: level.id },
      },
      update: {},
      create: { vaultId: vault.id, experienceLevelId: level.id },
    });
  }

  return vault;
}

async function linkPlanVaults(planId: string, vaults: any[]) {
  for (const vault of vaults) {
    await prisma.planVault.upsert({
      where: { planId_vaultId: { planId, vaultId: vault.id } },
      update: {},
      create: { planId, vaultId: vault.id },
    });
  }
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
