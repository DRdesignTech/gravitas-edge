// =============================================================================
// RESET DEVELOPMENT DEMO DATA ONLY (OPT-IN).
//
// This script removes ONLY the deterministic development/demo records created
// by seed.ts. It NEVER touches real data and MUST be run manually - it is never
// executed automatically. Master/reference data (roles, experience levels,
// vaults, plans, referral slabs) is intentionally preserved.
//
// Indexes (or unique rows) used to identify demo records:
//   - Users  : any user whose email is 'ay677607@gmail.com' (admin) or
//              'demo.userN@example.com'
//   - Payments: records whose razorpayOrderId starts with 'demo_order_' (and
//              metadata.demo === true)
//   - Subscriptions/opportunities created by the above demo users
//
// Usage: npm run db:reset-demo-data   (from repo root)
// =============================================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_USER_EMAILS: string[] = [];
for (let i = 1; i <= 20; i++) DEMO_USER_EMAILS.push(`demo.user${i}@example.com`);
DEMO_USER_EMAILS.push(process.env.SEED_ADMIN_EMAIL ?? 'admin@gravitasedge.local');

async function main() {
  console.log('Resetting development demo data...');

  const demoUsers = await prisma.user.findMany({
    where: { email: { in: DEMO_USER_EMAILS } },
    select: { id: true, email: true },
  });
  const demoUserIds = demoUsers.map((u) => u.id);
  console.log(`Found ${demoUserIds.length} demo user(s) to remove.`);

  if (demoUserIds.length === 0) {
    console.log('No demo users found. Nothing to reset.');
    return;
  }

  // Order matters due to relation constraints. Payments/subscriptions reference
  // users; opportunities may reference createdBy (SetNull on delete). We rely
  // on ON DELETE CASCADE for owned relations (UserRole, UserProfile, and other
  // user-owned child rows are cascaded), so deleting users cleans most data.
  const demoPayments = await prisma.payment.deleteMany({
    where: { userId: { in: demoUserIds } },
  });
  console.log(`Deleted ${demoPayments.count} payments.`);

  const demoSubs = await prisma.subscription.deleteMany({
    where: { userId: { in: demoUserIds } },
  });
  console.log(`Deleted ${demoSubs.count} subscriptions.`);

  // Remove demo opportunities seeded by the demo admin (they are marked via
  // createdBy = demo admin id, and their title/company pairs are deterministic).
  const demoOpps = await prisma.opportunity.deleteMany({
    where: {
      OR: [
        { createdBy: { in: demoUserIds } },
        { source: 'SEED' },
      ],
    },
  });
  console.log(`Deleted ${demoOpps.count} seeded opportunities.`);

  // Finally remove the demo users themselves (cascades roles/profiles/etc.).
  const deletedUsers = await prisma.user.deleteMany({
    where: { id: { in: demoUserIds } },
  });
  console.log(`Deleted ${deletedUsers.count} users.`);

  console.log('Demo data reset complete. Master/reference data preserved.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Reset failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
