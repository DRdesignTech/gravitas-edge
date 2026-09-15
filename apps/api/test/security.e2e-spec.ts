import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Security e2e (rate limiting / authz)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const unique = Date.now();
  const email = `e2e-sec-${unique}@example.com`;
  const password = 'StrongPass123!';

  let token = '';

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

    await prisma.role.upsert({
      create: {
        id: 'role-sec-admin',
        name: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      update: { createdAt: new Date(), updatedAt: new Date() },
      where: { name: 'ADMIN' },
    });

    const reg = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password, fullName: 'Sec User' })
      .expect(201);
    token = reg.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('rejects privilege-escalation fields on registration (mass assignment)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: `e2e-sec-priv-${unique}@example.com`,
        password,
        fullName: 'Priv',
        role: 'ADMIN',
        roles: ['ADMIN'],
        isAdmin: true,
        status: 'ACTIVE',
      })
      .expect(400);

    expect(res.body.success).toBe(false);

    const saved = await prisma.user.findFirst({
      where: { email: `e2e-sec-priv-${unique}@example.com` },
      include: { roles: { include: { role: true } } },
    });
    expect(saved).toBeNull();
    await prisma.user.deleteMany({
      where: { email: `e2e-sec-priv-${unique}@example.com` },
    });
  });

  it('rate-limits login attempts (stops brute force)', async () => {
    const server = app.getHttpServer();
    let status = 200;
    for (let i = 0; i < 12; i++) {
      const res = await request(server)
        .post('/api/auth/login')
        .send({ email, password: 'WrongPass1!' });
      status = res.status;
      if (status === 429) {
        expect(res.body.error).toBe('TOO_MANY_REQUESTS');
        break;
      }
    }
    expect(status).toBe(429);
  });

  it('protects admin endpoints from regular users and anonymous callers', async () => {
    await request(app.getHttpServer()).get('/api/admin/users').expect(401);

    await request(app.getHttpServer())
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });
});
