import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Referrals e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const unique = Date.now();
  const referrerEmail = `e2e-ref-referrer-${unique}@example.com`;
  const referredEmail = `e2e-ref-referred-${unique}@example.com`;
  const password = 'StrongPass123!';

  let referrerToken = '';
  let referralCode = '';

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
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Role" ("id", "name", "createdAt", "updatedAt") VALUES ('role-admin', 'ADMIN', NOW(), NOW()) ON CONFLICT ("name") DO NOTHING`,
    );
  });

  afterAll(async () => {
    for (const email of [referredEmail, referrerEmail]) {
      const user = await prisma.user.findFirst({ where: { email } });
      if (user) {
        await prisma.referral.deleteMany({ where: { referredUserId: user.id } });
        await prisma.referral.deleteMany({ where: { referrerId: user.id } });
        await prisma.user.delete({ where: { id: user.id } });
      }
    }
    await app.close();
  });

  it('referrer registers, generates code and sees summary', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: referrerEmail, password, fullName: 'Referrer' })
      .expect(201);
    referrerToken = res.body.data.accessToken;

    const codeRes = await request(app.getHttpServer())
      .post('/api/referrals')
      .set('Authorization', `Bearer ${referrerToken}`)
      .expect(201);
    expect(codeRes.body.success).toBe(true);
    referralCode = codeRes.body.data.referralCode;
    expect(referralCode).toMatch(/^REF-[A-Z2-9]{10}$/);
    expect(codeRes.body.data.referralLink).toContain('?ref=');

    const meRes = await request(app.getHttpServer())
      .get('/api/referrals/me')
      .set('Authorization', `Bearer ${referrerToken}`)
      .expect(200);
    expect(meRes.body.data.referralCode).toBe(referralCode);
    expect(meRes.body.data.counts.totalReferrals).toBe(0);
    expect(meRes.body.data.commissionTotalAmount).toBe('0');
  });

  it('rejects an invalid referral code at signup', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: `e2e-ref-bad-${unique}@example.com`,
        password,
        fullName: 'Bad',
        referralCode: 'REF-NOTVALID1',
      })
      .expect(400);
  });

  it('attaches the referral when the referred user signs up', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: referredEmail, password, fullName: 'Referred', referralCode })
      .expect(201);

    const summary = await request(app.getHttpServer())
      .get('/api/referrals/me')
      .set('Authorization', `Bearer ${referrerToken}`)
      .expect(200);
    expect(summary.body.data.counts.totalReferrals).toBe(1);
    expect(summary.body.data.counts.pendingReferrals).toBe(1);

    const list = await request(app.getHttpServer())
      .get('/api/referrals/me/referrals')
      .set('Authorization', `Bearer ${referrerToken}`)
      .expect(200);
    expect(list.body.data.meta.totalItems).toBe(1);
    expect(list.body.data.items[0].referredUser.email).toBe(referredEmail.toLowerCase());
    expect(list.body.data.items[0].status).toBe('PENDING');
  });

  it('protected referral routes require authentication', async () => {
    await request(app.getHttpServer()).get('/api/referrals/me').expect(401);
    await request(app.getHttpServer()).get('/api/referrals/me/commissions').expect(401);
    await request(app.getHttpServer())
      .get(`/api/referrals/me/commissions?status=bogus`)
      .set('Authorization', `Bearer ${referrerToken}`)
      .expect(400);
  });
});
