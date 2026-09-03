import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const unique = Date.now();
  const email = `e2e-auth-${unique}@example.com`;
  const password = 'StrongPass123!';

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
    await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE "email" = '${email}'`);
    await app.close();
  });

  it('registers, logs in, reads me, refreshes and logs out', async () => {
    // Register
    const registerRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password, fullName: 'E2E User' })
      .expect(201);
    expect(registerRes.body.success).toBe(true);
    expect(registerRes.body.data.accessToken).toBeDefined();
    expect(registerRes.body.data.refreshToken).toBeDefined();
    const regUser = registerRes.body.data.user;
    expect(regUser.email).toBe(email.toLowerCase());
    expect(regUser.roles).toEqual(expect.arrayContaining(['USER']));
    expect(regUser.passwordHash).toBeUndefined();

    // Duplicate registration
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password, fullName: 'E2E User' })
      .expect(409);

    // Login
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
    expect(loginRes.body.data.accessToken).toBeDefined();
    expect(loginRes.body.data.refreshToken).toBeDefined();

    // Wrong password
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'WrongPass1!' })
      .expect(401);

    // Me
    const accessToken = loginRes.body.data.accessToken;
    const meRes = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(meRes.body.data.email).toBe(email.toLowerCase());

    // Refresh (rotate)
    const refreshToken = loginRes.body.data.refreshToken;
    const refreshRes = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(200);
    expect(refreshRes.body.data.accessToken).toBeDefined();
    expect(refreshRes.body.data.refreshToken).toBeDefined();

    // Old refresh token should now be revoked
    await request(app.getHttpServer()).post('/api/auth/refresh').send({ refreshToken }).expect(401);

    // Access without token is protected
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);

    // Logout with the new access token
    const newAccessToken = refreshRes.body.data.accessToken;
    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${newAccessToken}`)
      .expect(200);

    // Logout without token should fail (protected route)
    await request(app.getHttpServer()).post('/api/auth/logout').expect(401);
  });

  it('rejects invalid DTO payloads', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'short' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password, fullName: 'X', unknownField: 'nope' })
      .expect(400);

    await request(app.getHttpServer()).post('/api/auth/refresh').send({}).expect(400);
  });

  it('creates an admin email check password hash is bcrypt', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: `bcrypt-check-${unique}@example.com`, password, fullName: 'B' })
      .expect(201);
    const saved = await prisma.user.findUnique({
      where: { email: `bcrypt-check-${unique}@example.com` },
    });
    expect(saved).toBeTruthy();
    expect(saved!.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(bcrypt.compareSync(password, saved!.passwordHash!)).toBe(true);
    await prisma.user.delete({ where: { email: saved!.email } });
  });
});
