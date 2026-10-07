import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { computeCouponAmounts } from '../src/coupons/coupon.util';

/**
 * Coupon codes e2e: admin CRUD + user checkout validation + the purchase
 * flow with a coupon, plus the atomic usage-limit rules.
 *
 * Uses the real local Postgres database (same convention as the other
 * e2e specs). Every row created here is cleaned up in afterAll.
 */
describe('Coupons e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const unique = Date.now();
  const password = 'StrongPass123!';

  const adminEmail = `e2e-coupon-admin-${unique}@example.com`;
  const userAEmail = `e2e-coupon-userA-${unique}@example.com`;
  const userBEmail = `e2e-coupon-userB-${unique}@example.com`;
  const userCEmail = `e2e-coupon-userC-${unique}@example.com`;
  const buyerEmail = `e2e-coupon-buyer-${unique}@example.com`;
  const buyer2Email = `e2e-coupon-buyer2-${unique}@example.com`;
  const buyer3Email = `e2e-coupon-buyer3-${unique}@example.com`;

  const CODES = {
    pct: `E2EAL10${unique}`.slice(0, 20),
    expired: `E2EEXP${unique}`.slice(0, 20),
    planOnly: `E2EPLN${unique}`.slice(0, 20),
    specific: `E2ESPEC${unique}`.slice(0, 20),
    limit1: `E2ELIM1${unique}`.slice(0, 20),
    disabled: `E2EDIS${unique}`.slice(0, 20),
    archive: `E2EARC${unique}`.slice(0, 20),
  };

  let adminToken: string;
  let userAToken: string;
  let userCId: string;

  let planA: { id: string; name: string; price: number; currency: string };
  let planB: { id: string; price: number };

  let pctCouponId: string;
  let limit1CouponId: string;
  let archiveCouponId: string;

  const round2 = (n: number) => Math.round(n * 100) / 100;

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

    const register = async (email: string, fullName: string) => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email, password, fullName })
        .expect(201);
      return res.body.data.user.id as string;
    };
    await register(adminEmail, 'Admin');
    await register(userAEmail, 'User A');
    await register(userBEmail, 'User B');
    userCId = await register(userCEmail, 'User C');
    await register(buyerEmail, 'Buyer 1');
    await register(buyer2Email, 'Buyer 2');
    await register(buyer3Email, 'Buyer 3');

    const adminUser = await prisma.user.findFirst({ where: { email: adminEmail } });
    const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    await prisma.userRole.create({
      data: { userId: adminUser!.id, roleId: adminRole!.id },
    });

    const login = async (email: string) => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password })
        .expect(200);
      return res.body.data.accessToken as string;
    };
    adminToken = await login(adminEmail);
    userAToken = await login(userAEmail);

    const planArow = await prisma.subscriptionPlan.findFirst({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true, price: true, currency: true },
      orderBy: { createdAt: 'asc' },
      take: 1,
    });
    const planBrow = await prisma.subscriptionPlan.findFirst({
      where: { deletedAt: null, isActive: true, id: { not: planArow!.id } },
      select: { id: true, name: true, price: true, currency: true },
      orderBy: { createdAt: 'asc' },
      take: 1,
    });
    expect(planArow).not.toBeNull();
    expect(planBrow).not.toBeNull();
    planA = {
      id: planArow!.id,
      name: planArow!.name,
      price: Number(planArow!.price),
      currency: planArow!.currency,
    };
    planB = { id: planBrow!.id, price: Number(planBrow!.price) };
  });

  afterAll(async () => {
    const emails = [
      adminEmail,
      userAEmail,
      userBEmail,
      userCEmail,
      buyerEmail,
      buyer2Email,
      buyer3Email,
    ];
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    // Coupons cascade their plans/users/usages on delete.
    await prisma.coupon.deleteMany({
      where: { code: { in: Object.values(CODES) } },
    });
    await app.close();
  });

  const adminCreate = (body: any) =>
    request(app.getHttpServer())
      .post('/api/admin/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body);

  const adminGet = (path: string, query?: any) =>
    request(app.getHttpServer())
      .get(path)
      .set('Authorization', `Bearer ${adminToken}`)
      .query(query ?? {});

  const validate = (token: string, body: any) =>
    request(app.getHttpServer())
      .post('/api/coupons/validate')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const login = async (email: string) => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
    return res.body.data.accessToken as string;
  };

  const purchase = (token: string, body: any) =>
    request(app.getHttpServer())
      .post('/api/subscriptions/purchase')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const confirm = (token: string, paymentId: string) =>
    request(app.getHttpServer())
      .post('/api/subscriptions/purchase/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentId });

  // ---------------------------------------------------------------------------
  // Admin CRUD
  // ---------------------------------------------------------------------------

  it('creates a percentage coupon for all users', async () => {
    const res = await adminCreate({
      code: CODES.pct,
      description: '10% off any plan',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      validFrom: '2020-01-01T00:00:00.000Z',
      validUntil: '2030-12-31T23:59:59.999Z',
      availability: 'ALL',
    }).expect(201);
    pctCouponId = res.body.data.id;
    expect(res.body.data.code).toBe(CODES.pct);
    expect(res.body.data.discountValue).toBe(10);
    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data.remainingUsage).toBeNull();
  });

  it('normalizes the code to upper-case and rejects a conflicting code', async () => {
    await adminCreate({
      code: CODES.pct.toLowerCase(),
      discountType: 'PERCENTAGE',
      discountValue: 10,
      validFrom: '2020-01-01T00:00:00.000Z',
      validUntil: '2030-12-31T23:59:59.999Z',
      availability: 'ALL',
    }).expect(409);

    await adminCreate({
      code: 'a',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      validFrom: '2020-01-01T00:00:00.000Z',
      validUntil: '2030-12-31T23:59:59.999Z',
      availability: 'ALL',
    }).expect(400);
  });

  it('creates expired, plan-scoped, specific-user, limit-1, disabled and archive coupons', async () => {
    const expired = await adminCreate({
      code: CODES.expired,
      discountType: 'PERCENTAGE',
      discountValue: 20,
      validFrom: '2020-01-01T00:00:00.000Z',
      validUntil: '2020-12-31T23:59:59.999Z',
      availability: 'ALL',
    }).expect(201);
    expect(expired.body.data.status).toBe('EXPIRED');

    const planOnly = await adminCreate({
      code: CODES.planOnly,
      discountType: 'FIXED',
      discountValue: 500,
      validFrom: '2020-01-01T00:00:00.000Z',
      validUntil: '2030-12-31T23:59:59.999Z',
      availability: 'ALL',
      planIds: [planB.id],
    }).expect(201);
    expect(planOnly.body.data.plans).toEqual([{ id: planB.id, name: expect.any(String) }]);

    const specific = await adminCreate({
      code: CODES.specific,
      discountType: 'PERCENTAGE',
      discountValue: 50,
      validFrom: '2020-01-01T00:00:00.000Z',
      validUntil: '2030-12-31T23:59:59.999Z',
      availability: 'SPECIFIC',
      userIds: [userCId],
    }).expect(201);
    expect(specific.body.data.appliesToAllUsers).toBe(false);
    expect(specific.body.data.users[0].id).toBe(userCId);

    const limit1 = await adminCreate({
      code: CODES.limit1,
      discountType: 'PERCENTAGE',
      discountValue: 30,
      validFrom: '2020-01-01T00:00:00.000Z',
      validUntil: '2030-12-31T23:59:59.999Z',
      availability: 'ALL',
      usageLimit: 1,
    }).expect(201);
    limit1CouponId = limit1.body.data.id;

    const disabled = await adminCreate({
      code: CODES.disabled,
      discountType: 'PERCENTAGE',
      discountValue: 15,
      validFrom: '2020-01-01T00:00:00.000Z',
      validUntil: '2030-12-31T23:59:59.999Z',
      availability: 'ALL',
      isActive: false,
    }).expect(201);
    expect(disabled.body.data.status).toBe('DISABLED');

    const archive = await adminCreate({
      code: CODES.archive,
      discountType: 'PERCENTAGE',
      discountValue: 25,
      validFrom: '2020-01-01T00:00:00.000Z',
      validUntil: '2030-12-31T23:59:59.999Z',
      availability: 'ALL',
    }).expect(201);
    archiveCouponId = archive.body.data.id;
  });

  it('rejects a specific-users coupon without userIds', async () => {
    const res = await adminCreate({
      code: 'E2EBAD1',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      validFrom: '2020-01-01T00:00:00.000Z',
      validUntil: '2030-12-31T23:59:59.999Z',
      availability: 'SPECIFIC',
    }).expect(400);
    expect(res.body.message).toContain('Select at least one user');
    await prisma.coupon.deleteMany({ where: { code: 'E2EBAD1' } });
  });

  it('supports admin search and status filters', async () => {
    const byCode = await adminGet('/api/admin/coupons', { search: CODES.pct });
    expect(byCode.body.data.items.map((c: any) => c.code)).toContain(CODES.pct);

    const disabledList = await adminGet('/api/admin/coupons', { status: 'DISABLED' });
    expect(disabledList.body.data.items.map((c: any) => c.code)).toContain(CODES.disabled);

    const expiredList = await adminGet('/api/admin/coupons', { status: 'EXPIRED' });
    expect(expiredList.body.data.items.map((c: any) => c.code)).toContain(CODES.expired);

    const archivedList = await adminGet('/api/admin/coupons', { status: 'ARCHIVED' });
    expect(archivedList.body.data.items.map((c: any) => c.code)).not.toContain(CODES.archive);
  });

  it('gets a single coupon', async () => {
    const res = await adminGet(`/api/admin/coupons/${pctCouponId}`);
    expect(res.body.data.code).toBe(CODES.pct);
    expect(res.body.data.usageCount).toBe(0);
    expect(res.body.data.status).toBe('ACTIVE');
  });

  it('enables/disables a coupon through PATCH', async () => {
    await request(app.getHttpServer())
      .patch(`/api/admin/coupons/${pctCouponId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false })
      .expect(200);
    const off = await adminGet(`/api/admin/coupons/${pctCouponId}`);
    expect(off.body.data.status).toBe('DISABLED');

    await request(app.getHttpServer())
      .patch(`/api/admin/coupons/${pctCouponId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: true })
      .expect(200);
    const on = await adminGet(`/api/admin/coupons/${pctCouponId}`);
    expect(on.body.data.status).toBe('ACTIVE');
  });

  it('rejects non-admin and unauthenticated access', async () => {
    await request(app.getHttpServer())
      .get('/api/admin/coupons')
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(403);
    await request(app.getHttpServer()).get('/api/admin/coupons').expect(401);
  });

  // ---------------------------------------------------------------------------
  // User-facing validation
  // ---------------------------------------------------------------------------

  it('rejects an unknown coupon with COUPON_NOT_FOUND', async () => {
    const res = await validate(userAToken, { couponCode: 'DOESNOTEXIST', planId: planA.id });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('COUPON_NOT_FOUND');
    expect(res.body.message).toBe('Invalid coupon code.');
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .post('/api/coupons/validate')
      .send({ couponCode: CODES.pct, planId: planA.id })
      .expect(401);
  });

  it('returns the server-computed breakdown for a valid coupon', async () => {
    const res = await validate(userAToken, {
      couponCode: ` ${CODES.pct.toLowerCase()} `,
      planId: planA.id,
    });
    expect(res.status).toBe(201);
    const expected = computeCouponAmounts('PERCENTAGE', 10, planA.price);
    expect(res.body.data).toMatchObject({
      coupon: { code: CODES.pct, discountType: 'PERCENTAGE', discountValue: 10 },
      planId: planA.id,
      originalAmount: round2(expected.originalAmount),
      discountAmount: round2(expected.discountAmount),
      finalAmount: round2(expected.finalAmount),
      currency: planA.currency,
    });
  });

  it('rejects an expired coupon', async () => {
    const res = await validate(userAToken, { couponCode: CODES.expired, planId: planA.id });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('COUPON_EXPIRED');
  });

  it('rejects a disabled coupon', async () => {
    const res = await validate(userAToken, { couponCode: CODES.disabled, planId: planA.id });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('COUPON_DISABLED');
  });

  it('rejects a coupon that does not apply to the plan', async () => {
    const res = await validate(userAToken, { couponCode: CODES.planOnly, planId: planA.id });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('COUPON_WRONG_PLAN');
  });

  it('accepts a coupon on the plan it applies to', async () => {
    const res = await validate(userAToken, { couponCode: CODES.planOnly, planId: planB.id });
    expect(res.status).toBe(201);
    expect(res.body.data.coupon.code).toBe(CODES.planOnly);
    expect(res.body.data.discountAmount).toBe(Math.min(500, planB.price));
  });

  it('rejects a specific-users coupon for a non-eligible user (userA)', async () => {
    const res = await validate(userAToken, { couponCode: CODES.specific, planId: planA.id });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('COUPON_NOT_ELIGIBLE');
  });

  it('accepts a specific-users coupon for the allow-listed user (userC)', async () => {
    const userCToken = (await login(userCEmail))!;
    const res = await validate(userCToken, { couponCode: CODES.specific, planId: planA.id });
    expect(res.status).toBe(201);
    expect(res.body.data.finalAmount).toBeLessThan(res.body.data.originalAmount);
  });

  it('rejects a coupon for a plan that is not purchasable', async () => {
    const res = await validate(userAToken, {
      couponCode: CODES.pct,
      planId: '00000000-0000-4000-8000-000000000000',
    });
    expect(res.status).toBe(404);
  });

  // ---------------------------------------------------------------------------
  // Purchase flow with a coupon
  // ---------------------------------------------------------------------------

  it('purchases with a coupon at the discounted, server-computed amount', async () => {
    const buyerToken = await login(buyerEmail);
    const res = await purchase(buyerToken, { planId: planA.id, couponCode: CODES.pct }).expect(201);
    const expected = computeCouponAmounts('PERCENTAGE', 10, planA.price);
    expect(res.body.data.amount).toBe(round2(expected.finalAmount));
    expect(res.body.data.originalAmount).toBe(round2(expected.originalAmount));
    expect(res.body.data.discountAmount).toBe(round2(expected.discountAmount));
    expect(res.body.data.coupon.code).toBe(CODES.pct);

    await confirm(buyerToken, res.body.data.paymentId).expect(201);
  });

  it('records the redemption and caps per-user usage at 1', async () => {
    const buyerToken = await login(buyerEmail);
    await purchase(buyerToken, { planId: planA.id, couponCode: CODES.pct }).expect(400);
    const res = await purchase(buyerToken, { planId: planA.id, couponCode: CODES.pct });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('COUPON_USER_LIMIT_REACHED');

    const usages = await adminGet(`/api/admin/coupons/${pctCouponId}/usages`);
    expect(usages.body.data.items).toHaveLength(1);
    const row = usages.body.data.items[0];
    expect(row.user.email).toBe(buyerEmail);
    expect(row.plan.name).toBe(planA.name);
    expect(row.subscription).not.toBeNull();
    const expected = computeCouponAmounts('PERCENTAGE', 10, planA.price);
    expect(Number(row.finalAmount)).toBe(round2(expected.finalAmount));
  });

  it('releases the global limit to the first purchaser and blocks the next user', async () => {
    const buyer2Token = await login(buyer2Email);
    const ok = await purchase(buyer2Token, { planId: planA.id, couponCode: CODES.limit1 }).expect(
      201,
    );
    await confirm(buyer2Token, ok.body.data.paymentId).expect(201);

    const buyer3Token = await login(buyer3Email);
    const blocked = await purchase(buyer3Token, { planId: planA.id, couponCode: CODES.limit1 });
    expect(blocked.status).toBe(400);
    expect(blocked.body.code).toBe('COUPON_LIMIT_REACHED');

    // The admin status filter now surfaces it as usage-limit reached.
    const list = await adminGet('/api/admin/coupons', { status: 'USAGE_LIMIT_REACHED' });
    expect(list.body.data.items.map((c: any) => c.code)).toContain(CODES.limit1);
  });

  it('releases the limit again once the redemption is refunded (usage not counted)', async () => {
    // buyer2 owns the single successful redemption of the limit-1 coupon.
    const usages = await prisma.couponUsage.findMany({
      where: { couponId: limit1CouponId },
      select: { paymentId: true },
    });
    await prisma.payment.updateMany({
      where: { id: { in: usages.map((u) => u.paymentId) } },
      data: { status: 'REFUNDED' },
    });

    const afterRefund = await adminGet('/api/admin/coupons', { status: 'USAGE_LIMIT_REACHED' });
    expect(afterRefund.body.data.items.map((c: any) => c.code)).not.toContain(CODES.limit1);

    // The slot is free again - the refunded usage no longer counts.
    const buyer3Token = await login(buyer3Email);
    const ok = await purchase(buyer3Token, { planId: planA.id, couponCode: CODES.limit1 }).expect(
      201,
    );
    await confirm(buyer3Token, ok.body.data.paymentId).expect(201);

    // buyer3 now owns the slot, so the limit is exhausted again.
    const list = await adminGet('/api/admin/coupons', { status: 'USAGE_LIMIT_REACHED' });
    expect(list.body.data.items.map((c: any) => c.code)).toContain(CODES.limit1);
  });

  it('treats an archived coupon as not found and restores it', async () => {
    await request(app.getHttpServer())
      .delete(`/api/admin/coupons/${archiveCouponId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const after = await validate(userAToken, { couponCode: CODES.archive, planId: planA.id });
    expect(after.status).toBe(400);
    expect(after.body.code).toBe('COUPON_NOT_FOUND');

    const archivedList = await adminGet('/api/admin/coupons', { status: 'ARCHIVED' });
    expect(archivedList.body.data.items.map((c: any) => c.code)).toContain(CODES.archive);

    await request(app.getHttpServer())
      .post(`/api/admin/coupons/${archiveCouponId}/restore`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    const restored = await validate(userAToken, { couponCode: CODES.archive, planId: planA.id });
    expect(restored.status).toBe(201);
  });

  it('refuses to permanently delete a coupon that has redemptions', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/admin/coupons/${pctCouponId}/permanent`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);
    expect(res.body.message).toContain('redemption');
  });
});
