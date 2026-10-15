import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AdminRvaPlansService } from './admin-rva-plans.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';

function mockPrisma() {
  return {
    recruitmentVendorPlan: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  } as any;
}

describe('AdminRvaPlansService', () => {
  let service: AdminRvaPlansService;
  let prisma: ReturnType<typeof mockPrisma>;

  beforeEach(async () => {
    prisma = mockPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminRvaPlansService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { record: jest.fn() } },
      ],
    }).compile();
    service = moduleRef.get(AdminRvaPlansService);
  });

  it('recomputes the discount server-side instead of trusting the client value', async () => {
    prisma.recruitmentVendorPlan.create.mockImplementation(async ({ data }: any) => ({
      id: 'p1',
      ...data,
    }));
    await service.create(
      {
        name: 'RVA Monthly',
        price: 1499,
        regularPrice: 1999,
        durationDays: 30,
        discountPercentage: 99,
      },
      'admin-1',
    );
    expect(prisma.recruitmentVendorPlan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ discountPercentage: 25 }),
      }),
    );
  });

  it('rejects a discounted price above the regular price', async () => {
    await expect(
      service.create({ name: 'Bad', price: 2999, regularPrice: 1999, durationDays: 30 }, 'admin-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a non-positive duration', async () => {
    await expect(
      service.create({ name: 'Bad', price: 100, regularPrice: 100, durationDays: 0 }, 'admin-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('archives a plan instead of deleting it', async () => {
    prisma.recruitmentVendorPlan.findFirst.mockResolvedValue({ id: 'p1' });
    prisma.recruitmentVendorPlan.update.mockResolvedValue({ id: 'p1' });
    await service.remove('p1', 'admin-1');
    expect(prisma.recruitmentVendorPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: expect.objectContaining({ isActive: false }),
      }),
    );
  });
});
