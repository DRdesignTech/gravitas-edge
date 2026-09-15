import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Admin Users e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const unique = Date.now();
  const password = 'StrongPass123!';
  const adminEmail = `e2e-admin-${unique}@example.com`;
  const targetEmail = `e2e-target-${unique}@example.com`;
  const targetPhone = `+91${String(unique).slice(0, 9)}`;
  const keeperEmail = `e2e-keeper-${unique}@example.com`;

  let adminToken: string;
  let targetId: string;
  let keeperId: string;

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

    // Ensure roles exist
    for (const role of ['ADMIN', 'USER']) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Role" ("id", "name", "createdAt", "updatedAt") VALUES ('role-${role.toLowerCase()}', '${role}', NOW(), NOW()) ON CONFLICT ("name") DO NOTHING`,
      );
    }

    // Register admin + target + keeper users
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: adminEmail, password, fullName: 'Admin' })
      .expect(201);
    const targetRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: targetEmail, password, fullName: 'Target', phone: targetPhone })
      .expect(201);
    targetId = targetRes.body.data.user.id;
    const keeperRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: keeperEmail, password, fullName: 'Keeper' })
      .expect(201);
    keeperId = keeperRes.body.data.user.id;

    // Promote admin to ADMIN role
    const adminUser = await prisma.user.findFirst({ where: { email: adminEmail } });
    const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    await prisma.userRole.create({
      data: { userId: adminUser!.id, roleId: adminRole!.id },
    });

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminEmail, password })
      .expect(200);
    adminToken = login.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "User" WHERE "email" IN ('${adminEmail}','${targetEmail}','${keeperEmail}')`,
    );
    await app.close();
  });

  it('lists users as admin', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.meta).toBeDefined();
  });

  it('searches users by email', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/users')
      .query({ search: 'e2e-target' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].email).toBe(targetEmail);
    expect(res.body.data.items[0].roles).toEqual(expect.arrayContaining(['USER']));
  });

  it('gets a single user', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/admin/users/${targetId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data.email).toBe(targetEmail);
  });

  it('updates a target user status', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/admin/users/${targetId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'INACTIVE' })
      .expect(200);
    expect(res.body.data.status).toBe('INACTIVE');

    await request(app.getHttpServer())
      .patch(`/api/admin/users/${targetId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' })
      .expect(200);
  });

  it('rejects deleting a user that does not exist (error path is atomic)', async () => {
    await request(app.getHttpServer())
      .delete(`/api/admin/users/nonexistent-${unique}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('rejects non-admin access', async () => {
    // Register a plain USER token
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: `e2e-unauthorized-${unique}@example.com`, password, fullName: 'Unauth' })
      .expect(201);
    const plainLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: `e2e-unauthorized-${unique}@example.com`, password })
      .expect(200);
    const plainToken = plainLogin.body.data.accessToken;

    await request(app.getHttpServer())
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${plainToken}`)
      .expect(403);

    await prisma.$executeRawUnsafe(
      `DELETE FROM "User" WHERE "email" = 'e2e-unauthorized-${unique}@example.com'`,
    );
  });

  it('rejects unauthenticated access', async () => {
    await request(app.getHttpServer()).get('/api/admin/users').expect(401);
  });

  it('permanently deletes a user (not a soft delete)', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/admin/users/${targetId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe('User permanently deleted');
  });

  it('user row no longer exists after deletion', async () => {
    const row = await prisma.user.findFirst({ where: { email: targetEmail } });
    expect(row).toBeNull();
  });

  it('dependent records are removed (user roles and profile)', async () => {
    const roles = await prisma.userRole.findMany({ where: { userId: targetId } });
    const profile = await prisma.userProfile.findFirst({ where: { userId: targetId } });
    expect(roles.length).toBe(0);
    expect(profile).toBeNull();
  });

  it('unrelated users remain untouched', async () => {
    const keeper = await prisma.user.findFirst({ where: { email: keeperEmail } });
    expect(keeper).not.toBeNull();
    expect(keeper!.id).toBe(keeperId);
    const res = await request(app.getHttpServer())
      .get(`/api/admin/users/${keeperId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data.email).toBe(keeperEmail);
  });

  it('same email and phone can register again after permanent deletion', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: targetEmail, password, fullName: 'ReRegistered', phone: targetPhone })
      .expect(201);
  });

  it('rejects registering an active duplicate email', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: targetEmail, password, fullName: 'Duplicate' })
      .expect(409);
  });

  it('rejects registering an active duplicate phone', async () => {
    // targetPhone is now occupied by the re-registered targetEmail account above.
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: `e2e-dup-phone-${unique}@example.com`, password, phone: targetPhone })
      .expect(409);
  });
});
