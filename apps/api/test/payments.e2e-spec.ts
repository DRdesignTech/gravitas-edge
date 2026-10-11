import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { computeCouponAmounts } from '../src/coupons/coupon.util';

/**
 * Payment session e2e: session lookup by the owning user, the "fail" endpoint
 * used by the test payment gateway, and the guarantee that failed payments
 * cannot be confirmed and release their reserved coupon slot.
 *
 * Uses the real local Postgres database (same convention as the other e2e
 * specs). Every row created here is cleaned up in afterAll.
 */
describe('Payment sessions e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const unique = Date.now();
  const password = 'StrongPass123!';
  const CODE = `E2EPAID${unique}`.slice(0, 20);

  const adminEmail = `e2e-pay-admin-${unique}@example.com`;
  const buyerEmail = `e2e-pay-buyer-${unique}@example.com`;
  const otherEmail = `e2e-pay-other-${unique}@example.com`;

  let adminToken: string;
  let buyerToken: string;
  let otherToken: string;
  let planA: { id: string; name: string; price: number; currency: string };
  let couponId: string;

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
    await register(adminEmail, 'Pay Admin');
    await register(buyerEmail, 'Pay Buyer');
    await register(otherEmail, 'Pay Other');

    const login = async (email: string) => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password })
        .expect(200);
      return res.body.data.accessToken as string;
    };

    const adminUser = await prisma.user.findFirst({ where: { email: adminEmail } });
    const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    await prisma.userRole.create({
      data: { userId: adminUser!.id, roleId: adminRole!.id },
    });

    adminToken = await login(adminEmail);
    buyerToken = await login(buyerEmail);
    otherToken = await login(otherEmail);

    const planArow = await prisma.subscriptionPlan.findFirst({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true, price: true, currency: true },
      orderBy: { createdAt: 'asc' },
      take: 1,
    });
    expect(planArow).not.toBeNull();
    planA = {
      id: planArow!.id,
      name: planArow!.name,
      price: Number(planArow!.price),
      currency: planArow!.currency,
    };
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [adminEmail, buyerEmail, otherEmail] } },
    });
    await prisma.coupon.deleteMany({ where: { code: CODE } });
    await app.close();
  });

  const purchase = (token: string, body: any) =>
    request(app.getHttpServer())
      .post('/api/subscriptions/purchase')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const getSession = (token: string, paymentId: string) =>
    request(app.getHttpServer())
      .get(`/api/subscriptions/payments/${paymentId}`)
      .set('Authorization', `Bearer ${token}`);

  const fail = (token: string, paymentId: string) =>
    request(app.getHttpServer())
      .post('/api/subscriptions/purchase/fail')
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentId });

  const confirm = (token: string, paymentId: string) =>
    request(app.getHttpServer())
      .post('/api/subscriptions/purchase/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentId });

  it('creates a coupon to redeploy', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/admin/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: CODE,
        description: 'Session e2e 10% off',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        validFrom: '2020-01-01T00:00:00.000Z',
        validUntil: '2030-12-31T23:59:59.999Z',
        perUserUsageLimit: 100,
        availability: 'ALL',
      })
      .expect(201);
    expect(res.body.data.code).toBe(CODE);
    couponId = res.body.data.id;
  });

  it('returns the full server-side breakdown for a purchased session', async () => {
    const started = await purchase(buyerToken, {
      planId: planA.id,
      couponCode: CODE,
    }).expect(201);
    const expected = computeCouponAmounts('PERCENTAGE', 10, planA.price);

    const res = await getSession(buyerToken, started.body.data.paymentId).expect(200);
    expect(res.body.data).toEqual(
      expect.objectContaining({
        paymentId: started.body.data.paymentId,
        status: 'CREATED',
        amount: expected.finalAmount,
        currency: planA.currency,
        planId: planA.id,
        planName: planA.name,
        couponCode: CODE,
        originalAmount: expected.originalAmount,
        discountAmount: expected.discountAmount,
        finalAmount: expected.finalAmount,
      }),
    );
  });

  it('hides sessions from other users', async () => {
    const started = await purchase(buyerToken, { planId: planA.id }).expect(201);
    await getSession(otherToken, started.body.data.paymentId).expect(404);
    await fail(otherToken, started.body.data.paymentId).expect(404);
    await confirm(otherToken, started.body.data.paymentId).expect(404);
    await fail(buyerToken, started.body.data.paymentId).expect(201);
  });

  it('marks a CREATED session as FAILED and refuses confirm afterwards', async () => {
    const started = await purchase(buyerToken, { planId: planA.id }).expect(201);
    const paymentId = started.body.data.paymentId;

    const failed = await fail(buyerToken, paymentId).expect(201);
    expect(failed.body.data.status).toBe('FAILED');

    const session = await getSession(buyerToken, paymentId).expect(200);
    expect(session.body.data.status).toBe('FAILED');

    await confirm(buyerToken, paymentId).expect(400);
  });

  it('is idempotent for an already-failed session', async () => {
    const started = await purchase(buyerToken, { planId: planA.id }).expect(201);
    await fail(buyerToken, started.body.data.paymentId).expect(201);
    const again = await fail(buyerToken, started.body.data.paymentId).expect(201);
    expect(again.body.data.status).toBe('FAILED');
  });

  it('releases the reserved coupon slot when the payment fails', async () => {
    const usageCount = async (): Promise<number> => {
      const res = await request(app.getHttpServer())
        .get(`/api/admin/coupons/${couponId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      return res.body.data.usageCount as number;
    };

    const baseline = await usageCount();

    // A CREATED session reserves one slot.
    await purchase(buyerToken, { planId: planA.id, couponCode: CODE }).expect(201);
    expect(await usageCount()).toBe(baseline + 1);

    // Failing a session releases the slot again.
    const second = await purchase(buyerToken, { planId: planA.id, couponCode: CODE }).expect(201);
    await fail(buyerToken, second.body.data.paymentId).expect(201);
    expect(await usageCount()).toBe(baseline + 1);

    // The freed slot is usable by a fresh purchase.
    await purchase(buyerToken, { planId: planA.id, couponCode: CODE }).expect(201);
    expect(await usageCount()).toBe(baseline + 2);
  });

  it('rejects failing a session that already succeeded', async () => {
    const started = await purchase(buyerToken, { planId: planA.id }).expect(201);
    await confirm(buyerToken, started.body.data.paymentId).expect(201);
    await fail(buyerToken, started.body.data.paymentId).expect(400);
  });
});
