import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Resumes e2e (security)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const unique = Date.now();
  const ownerEmail = `e2e-res-owner-${unique}@example.com`;
  const otherEmail = `e2e-res-other-${unique}@example.com`;
  const password = 'StrongPass123!';

  let ownerToken = '';
  let otherToken = '';

  function attachPdf(_name = 'resume.pdf', content = '%PDF-1.4 fake pdf body') {
    return Buffer.from(content);
  }

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

    const ownerRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: ownerEmail, password, fullName: 'Owner' })
      .expect(201);
    ownerToken = ownerRes.body.data.accessToken;

    const otherRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: otherEmail, password, fullName: 'Other' })
      .expect(201);
    otherToken = otherRes.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.resume.deleteMany({
      where: {
        email: {
          in: [ownerEmail, 'guest-jane@example.com', `unified-guest-${unique}@example.com`],
        },
      },
    });
    const users = await prisma.user.findMany({
      where: { email: { in: [ownerEmail, otherEmail] } },
      select: { id: true, email: true },
    });
    for (const u of users) {
      await prisma.resume.deleteMany({ where: { userId: u.id } });
      await prisma.user.delete({ where: { id: u.id } });
    }
    await app.close();
  });

  it('rejects unauthenticated resume listing', async () => {
    await request(app.getHttpServer()).get('/api/resumes').expect(401);
  });

  it('allows a logged-out visitor to upload via the unified endpoint and get a token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/resumes')
      .field('fullName', 'Unified Guest')
      .field('email', `unified-guest-${unique}@example.com`)
      .field('phone', '+911234567890')
      .attach('resume', attachPdf('unified-guest.pdf', '%PDF-1.4 unified guest'), {
        filename: 'unified-guest.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    expect(res.body.data.token).toMatch(/^[a-f0-9]{64}$/);
    expect(res.body.data.resume.originalName).toBe('unified-guest.pdf');
    expect(res.body.data.resume.linked).toBe(false);
    expect(res.body.data.resume.storagePath).toBeUndefined();
  });

  it('uploads a valid PDF via multipart and does not leak storage paths', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/resumes')
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('resume', attachPdf('my-cv.pdf', '%PDF-1.4 contents here'), {
        filename: 'my-cv.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.originalName).toBe('my-cv.pdf');
    expect(res.body.data.uploadStatus).toBe('UPLOADED');
    expect(res.body.data.fileSize).toBeGreaterThan(0);
    expect(res.body.data.storagePath).toBeUndefined();
    expect(res.body.data.storageName).toBeUndefined();
  });

  it('accepts a real DOC (OLE2) file', async () => {
    const ole2 = Buffer.from([
      0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00,
    ]);
    const res = await request(app.getHttpServer())
      .post('/api/resumes')
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('resume', ole2, { filename: 'cv.doc', contentType: 'application/msword' })
      .expect(201);
    expect(res.body.data.id).toBeDefined();

    const detail = await request(app.getHttpServer())
      .get(`/api/resumes/${res.body.data.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(detail.body.data.fileType).toBe('doc');
  });

  it('rejects a non-resume file extension', async () => {
    await request(app.getHttpServer())
      .post('/api/resumes')
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('resume', Buffer.from('MZ this is an exe'), {
        filename: 'malware.exe',
        contentType: 'application/x-msdownload',
      })
      .expect(400);
  });

  it('rejects an oversized file (>5MB)', async () => {
    const big = Buffer.alloc(5 * 1024 * 1024 + 1, 0x41);
    // Give it a valid PDF header so only the size limit is tripped.
    Buffer.from('%PDF-1.4').copy(big);
    await request(app.getHttpServer())
      .post('/api/resumes')
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('resume', big, { filename: 'huge.pdf', contentType: 'application/pdf' })
      .expect(413);
  });

  it('rejects content that does not match the claimed extension', async () => {
    await request(app.getHttpServer())
      .post('/api/resumes')
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('resume', Buffer.from('<script>alert(1)</script>'), {
        filename: 'fake.pdf',
        contentType: 'application/pdf',
      })
      .expect(422);
  });

  it('sanitizes path-traversal-style filenames', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/resumes')
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('resume', Buffer.from('%PDF-1.4 traversal'), {
        filename: '../../etc/evil.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    expect(res.body.data.originalName.includes('..')).toBe(false);
    expect(res.body.data.originalName.includes('/')).toBe(false);
  });

  it('allows the owner to download their resume', async () => {
    const up = await request(app.getHttpServer())
      .post('/api/resumes')
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('resume', attachPdf('download.pdf', '%PDF-1.4 downloadable'), {
        filename: 'download.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    const id = up.body.data.id;

    const dl = await request(app.getHttpServer())
      .get(`/api/resumes/${id}/download`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(dl.headers['content-disposition']).toContain('attachment');
    expect(dl.headers['content-type']).toContain('application/pdf');
    const body = Buffer.isBuffer(dl.body) ? dl.body.toString('utf-8') : dl.text;
    expect(body).toContain('%PDF-1.4');
  });

  it('blocks another user from reading/downloading/replacing/deleting a resume', async () => {
    const up = await request(app.getHttpServer())
      .post('/api/resumes')
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('resume', attachPdf(), {
        filename: 'private.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    const id = up.body.data.id;

    await request(app.getHttpServer())
      .get(`/api/resumes/${id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/api/resumes/${id}/download`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/resumes/${id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/api/resumes/${id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .attach('resume', attachPdf(), { filename: 'evildoer.pdf', contentType: 'application/pdf' })
      .expect(404);
  });

  it('does not allow downloading a soft-deleted resume', async () => {
    const up = await request(app.getHttpServer())
      .post('/api/resumes')
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('resume', attachPdf('todelete.pdf', '%PDF-1.4 doomed'), {
        filename: 'todelete.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    const id = up.body.data.id;

    await request(app.getHttpServer())
      .delete(`/api/resumes/${id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/resumes/${id}/download`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(404);
  });

  it('lists only the authenticated user’s own resumes', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/resumes')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(Array.isArray(list.body.data.data)).toBe(true);
    for (const item of list.body.data.data) {
      expect(item.storagePath).toBeUndefined();
      expect(item.storageName).toBeUndefined();
    }
  });

  describe('Guest resume upload (no authentication)', () => {
    let guestToken = '';

    it('allows a logged-out visitor to upload a resume without an account', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/resumes/guest')
        .field('fullName', 'Jane Guest')
        .field('email', 'guest-jane@example.com')
        .field('phone', '+919876543210')
        .attach('resume', attachPdf('guest-cv.pdf', '%PDF-1.4 guest resume'), {
          filename: 'guest-cv.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toMatch(/^[a-f0-9]{64}$/);
      expect(res.body.data.resume.originalName).toBe('guest-cv.pdf');
      expect(res.body.data.resume.fileType).toBe('pdf');
      expect(res.body.data.resume.linked).toBe(false);
      expect(res.body.data.resume.storagePath).toBeUndefined();
      expect(res.body.data.resume.storageName).toBeUndefined();
      guestToken = res.body.data.token;
    });

    it('rejects missing visitor contact details', async () => {
      await request(app.getHttpServer())
        .post('/api/resumes/guest')
        .attach('resume', attachPdf('anon.pdf', '%PDF-1.4 no details'), {
          filename: 'anon.pdf',
          contentType: 'application/pdf',
        })
        .expect(400);
    });

    it('allows retrieving the guest resume metadata by token', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/resumes/guest/${guestToken}`)
        .expect(200);
      expect(res.body.data.resume.originalName).toBe('guest-cv.pdf');
      expect(res.body.data.resume.storagePath).toBeUndefined();
    });

    it('returns 404 for an unknown guest token', async () => {
      await request(app.getHttpServer())
        .get(`/api/resumes/guest/${'0'.repeat(64)}`)
        .expect(404);
    });

    it('allows replacing the guest resume file using the same token', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/resumes/guest/${guestToken}`)
        .attach('resume', attachPdf('guest-cv-v2.pdf', '%PDF-1.4 guest resume v2'), {
          filename: 'guest-cv-v2.pdf',
          contentType: 'application/pdf',
        })
        .expect(200);
      expect(res.body.data.resume.originalName).toBe('guest-cv-v2.pdf');
    });

    it('rejects a non-resume file for guests', async () => {
      await request(app.getHttpServer())
        .post('/api/resumes/guest')
        .field('fullName', 'Jane Guest')
        .field('email', 'guest-jane@example.com')
        .attach('resume', Buffer.from('MZ evil'), {
          filename: 'evil.exe',
          contentType: 'application/x-msdownload',
        })
        .expect(400);
    });

    it('rejects tampered content for guests', async () => {
      await request(app.getHttpServer())
        .post('/api/resumes/guest')
        .field('fullName', 'Jane Guest')
        .field('email', 'guest-jane@example.com')
        .attach('resume', Buffer.from('<script>alert(1)</script>'), {
          filename: 'fake.pdf',
          contentType: 'application/pdf',
        })
        .expect(422);
    });

    it('links the guest resume to a registered user after signup', async () => {
      const linkRes = await request(app.getHttpServer())
        .post(`/api/resumes/guest/${guestToken}/link`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(201);
      expect(linkRes.body.data.resumeId).toBeDefined();

      // The linked resume is now visible in the user's authenticated list.
      const list = await request(app.getHttpServer())
        .get('/api/resumes')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      const names = list.body.data.data.map((r: any) => r.originalName);
      expect(names).toContain('guest-cv-v2.pdf');

      // Linking must not create a duplicate row — the same resume is claimed.
      const owner = await prisma.user.findFirst({ where: { email: ownerEmail } });
      const linkedRows = await prisma.resume.findMany({
        where: { originalName: 'guest-cv-v2.pdf', userId: owner?.id },
      });
      expect(linkedRows).toHaveLength(1);
    });

    it('forbids linking a guest resume already claimed by another user', async () => {
      await request(app.getHttpServer())
        .post(`/api/resumes/guest/${guestToken}/link`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });

    it('never exposes raw storage paths for guest resumes', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/resumes/guest/${guestToken}`)
        .expect(200);
      expect(JSON.stringify(res.body)).not.toContain('storagePath');
      expect(JSON.stringify(res.body)).not.toContain('storage');
    });
  });
});
