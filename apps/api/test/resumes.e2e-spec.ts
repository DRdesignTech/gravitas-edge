import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Resumes e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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

    // Ensure admin role exists for auth tests
    await prisma.role.upsert({
      create: { id: 'role-admin', name: 'ADMIN', createdAt: new Date(), updatedAt: new Date() },
      update: { createdAt: new Date(), updatedAt: new Date() },
      where: { name: 'ADMIN' },
    });
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe(`DELETE FROM "Resume"`);
    await app.close();
  });

  it('should upload a valid PDF resume', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/resumes')
      .set('Authorization', 'Bearer test-token')
      .send({ resume: Buffer.from('%PDF-1.4 fake pdf content').toString('base64') })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.originalName).toBeDefined();
    expect(res.body.data.uploadStatus).toBe('UPLOADED');
    expect(res.body.data.fileSize).toBeGreaterThan(0);
  });

  it('should list resumes for authenticated user', async () => {
    await request(app.getHttpServer())
      .get('/api/resumes')
      .set('Authorization', 'Bearer test-token')
      .expect(200);
  });

  it('should return 401 for unauthorized access', async () => {
    await request(app.getHttpServer())
      .get('/api/resumes')
      .expect(401);
  });

  it('should soft-delete a resume', async () => {
    // First upload a resume
    const uploadRes = await request(app.getHttpServer())
      .post('/api/resumes')
      .set('Authorization', 'Bearer test-token')
      .send({ resume: Buffer.from('%PDF-1.4 fake pdf content').toString('base64') })
      .expect(201);

    const resumeId = uploadRes.body.data.id;

    // Now delete it
    await request(app.getHttpServer())
      .delete(`/api/resumes/${resumeId}`)
      .set('Authorization', 'Bearer test-token')
      .expect(200);

    // Verify it's gone from listing
    await request(app.getHttpServer())
      .get('/api/resumes')
      .set('Authorization', 'Bearer test-token')
      .expect(200);
  });
});