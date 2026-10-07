import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { maskProtectedValue } from '@job-portal/shared';

/**
 * Opportunity access e2e: the full chain that the unified website checkout
 * relies on. A user with NO subscription sees only a masked teaser for premium
 * opportunities ("UNLOCK FULL DETAILS" state); after a successful purchase of a
 * Vault plan their snapshot grants FULL details — including the application /
 * contact email — ONLY for opportunities in the purchased Vault. The wrong
 * Vault stays locked, and once the subscription expires the details are masked
 * again. Nothing sensitive ever leaves the server for unauthorized callers.
 *
 * Uses the real local Postgres database (same convention as the other e2e
 * specs). Every row created here is cleaned up in afterAll.
 */
describe('Subscription access e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const unique = Date.now();
  const password = 'StrongPass123!';
  const buyerEmail = `e2e-access-buyer-${unique}@example.com`;
  const EMAIL = 'hiring@vault.example';

  let buyerToken: string;
  let buyerUserId: string;
  let vaultId: string;
  let otherVaultId: string;
  let planId: string;
  let oppInVaultId: string;
  let oppOtherVaultId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    for (const role of ['ADMIN', 'USER']) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Role" ("id", "name", "createdAt", "updatedAt") VALUES ('role-${role.toLowerCase()}', '${role}', NOW(), NOW()) ON CONFLICT ("name") DO NOTHING`,
      );
    }

    const register = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: buyerEmail, password, fullName: 'Access Buyer' })
      .expect(201);
    buyerUserId = register.body.data.user.id;

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: buyerEmail, password })
      .expect(200);
    buyerToken = login.body.data.accessToken;

    const vault = await prisma.vault.create({
      data: { name: `E2E Access Vault ${unique}`, type: 'INDIA' },
    });
    vaultId = vault.id;

    const otherVault = await prisma.vault.create({
      data: { name: `E2E Other Vault ${unique}`, type: 'GLOBAL' },
    });
    otherVaultId = otherVault.id;

    const plan = await prisma.subscriptionPlan.create({
      data: {
        name: `E2E Access Plan ${unique}`,
        description: 'Access e2e plan',
        price: 1499,
        regularPrice: 1499,
        currency: 'INR',
        durationDays: 30,
        isActive: true,
        vaults: { create: [{ vaultId }] },
      },
    });
    planId = plan.id;

    const opportunityData = {
      title: `Access Opp ${unique}`,
      company: 'Vault Corp',
      location: 'Mumbai',
      country: 'India',
      industry: 'IT',
      employmentType: 'FULL_TIME' as const,
      salary: 'INR 18 LPA',
      experienceText: '3-5 years',
      qualification: 'MBA in Marketing',
      description: 'Full restricted description.',
      applicationContact: EMAIL,
      source: 'Direct',
      category: 'INDIA' as const,
      status: 'PUBLISHED' as const,
      publishedDate: new Date(),
      expiryDate: new Date(Date.now() + 30 * 86400000),
      createdBy: buyerUserId,
    };

    const oppInVault = await prisma.opportunity.create({ data: opportunityData });
    await prisma.opportunityVault.create({
      data: { opportunityId: oppInVault.id, vaultId },
    });
    oppInVaultId = oppInVault.id;

    const oppOther = await prisma.opportunity.create({
      data: { ...opportunityData, title: `Access Other ${unique}` },
    });
    await prisma.opportunityVault.create({
      data: { opportunityId: oppOther.id, vaultId: otherVaultId },
    });
    oppOtherVaultId = oppOther.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: buyerEmail } });
    await prisma.subscriptionPlan.deleteMany({ where: { id: planId } });
    await prisma.vault.deleteMany({
      where: { id: { in: [vaultId, otherVaultId] } },
    });
    await prisma.opportunity.deleteMany({
      where: { id: { in: [oppInVaultId, oppOtherVaultId] } },
    });
    await app.close();
  });

  const detail = (id: string, token?: string) => {
    const req = request(app.getHttpServer()).get(`/api/opportunities/${id}`);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };

  const confirm = (paymentId: string) =>
    request(app.getHttpServer())
      .post('/api/subscriptions/purchase/confirm')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ paymentId });

  it('masks protected details for a signed-in user without a subscription', async () => {
    const res = await detail(oppInVaultId, buyerToken).expect(200);
    const body = res.body.data;

    expect(body.isPremium).toBe(true);
    expect(body.isFullAccess).toBe(false);
    // 9-field public structure is intact, protected fields are NOT present.
    expect(body.title).toBeTruthy();
    expect(body.qualification).toBeUndefined();
    expect(body.description).toBeUndefined();
    expect(body.applicationUrl).toBeUndefined();
    expect(body.applicationContact).toBeUndefined();
    // Only the server-side masked teaser is exposed — the email never leaves
    // the server in plaintext.
    expect(body.lockedPreview).toEqual({
      qualification: maskProtectedValue('MBA in Marketing'),
      otherDetails: maskProtectedValue('Full restricted description.'),
      howToApply: maskProtectedValue(EMAIL),
      applicationContact: maskProtectedValue(EMAIL),
    });
    expect(JSON.stringify(body)).not.toContain(EMAIL);
  });

  it('keeps an unrelated Vault locked before any purchase', async () => {
    const res = await detail(oppOtherVaultId, buyerToken).expect(200);
    expect(res.body.data.isFullAccess).toBe(false);
    expect(JSON.stringify(res.body.data)).not.toContain(EMAIL);
  });

  it('unlocks the correct Vault after a successful purchase', async () => {
    const started = await request(app.getHttpServer())
      .post('/api/subscriptions/purchase')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ planId })
      .expect(201);

    await confirm(started.body.data.paymentId).expect(201);

    // The purchased Vault's opportunity now returns FULL protected details,
    // including the application / contact email, for authorized users.
    const res = await detail(oppInVaultId, buyerToken).expect(200);
    const body = res.body.data;
    expect(body.isFullAccess).toBe(true);
    expect(body.lockedPreview).toBeUndefined();
    expect(body.qualification).toBe('MBA in Marketing');
    expect(body.description).toBe('Full restricted description.');
    expect(body.applicationContact).toBe(EMAIL);
  });

  it('does NOT unlock opportunities in a different Vault', async () => {
    const res = await detail(oppOtherVaultId, buyerToken).expect(200);
    const body = res.body.data;
    expect(body.isFullAccess).toBe(false);
    expect(body.applicationContact).toBeUndefined();
    expect(body.lockedPreview.applicationContact).toBe(maskProtectedValue(EMAIL));
  });

  it('re-locks full details once the subscription expires', async () => {
    // Simulate the subscription window passing (access is computed live from
    // the effective status — historical ACTIVE rows never count once expired).
    await prisma.subscription.updateMany({
      where: { userId: buyerUserId, status: 'ACTIVE' },
      data: { endDate: new Date(Date.now() - 1000) },
    });

    const res = await detail(oppInVaultId, buyerToken).expect(200);
    const body = res.body.data;
    expect(body.isFullAccess).toBe(false);
    expect(body.applicationContact).toBeUndefined();
    expect(body.lockedPreview.applicationContact).toBe(maskProtectedValue(EMAIL));
    expect(JSON.stringify(body)).not.toContain(EMAIL);
  });
});