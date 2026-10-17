import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AdminRvaCouponsService } from './admin-rva-coupons.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';

function mockPrisma() {
  return {
    recruitmentVendorCoupon: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    recruitmentVendorCouponPlan: { deleteMany: jest.fn(), createMany: jest.fn() },
    recruitmentVendorCouponUser: { deleteMany: jest.fn(), createMany: jest.fn() },
    recruitmentVendorCouponUsage: { count: jest.fn(), groupBy: jest.fn() },
    recruitmentVendorPlan: { count: jest.fn() },
    user: { count: jest.fn() },
    $transaction: jest.fn(),
  } as any;
}

function couponRow(overrides: any = {}) {
  return {
    id: 'rc1',
    code: 'RVA20',
    description: null,
    discountType: 'PERCENTAGE',
    discountValue: 20,
    validFrom: new Date('2020-01-01'),
    validUntil: new Date('2030-01-01'),
    usageLimit: null,
    perUserUsageLimit: 1,
    appliesToAllUsers: true,
    isActive: true,
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date('2020-01-01'),
    deletedAt: null,
    plans: [],
    users: [],
    ...overrides,
  };
}

const baseDto = {
  code: 'RVA20',
  discountType: 'PERCENTAGE' as const,
  discountValue: 20,
  validFrom: '2020-01-01T00:00:00.000Z',
  validUntil: '2030-01-01T00:00:00.000Z',
  availability: 'ALL' as const,
  planIds: [] as string[],
  userIds: [] as string[],
};

describe('AdminRvaCouponsService', () => {
  let service: AdminRvaCouponsService;
  let prisma: ReturnType<typeof mockPrisma>;
  let tx: ReturnType<typeof mockPrisma>;
  let audit: { record: jest.Mock };

  beforeEach(async () => {
    prisma = mockPrisma();
    tx = mockPrisma();
    prisma.$transaction.mockImplementation(async (arg: any) =>
      typeof arg === 'function' ? arg(tx) : Promise.all(arg),
    );
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminRvaCouponsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = moduleRef.get(AdminRvaCouponsService);
  });

  describe('create', () => {
    it('rejects a non-positive discount', async () => {
      await expect(service.create({ ...baseDto, discountValue: 0 }, 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects a percentage above 100', async () => {
      await expect(service.create({ ...baseDto, discountValue: 150 }, 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects an inverted validity window', async () => {
      await expect(
        service.create(
          {
            ...baseDto,
            validFrom: '2030-01-01T00:00:00.000Z',
            validUntil: '2020-01-01T00:00:00.000Z',
          },
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('requires at least one user for a specific-users coupon', async () => {
      await expect(
        service.create({ ...baseDto, availability: 'SPECIFIC', userIds: [] }, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a duplicate active code', async () => {
      prisma.recruitmentVendorCoupon.findFirst.mockResolvedValue(couponRow());
      await expect(service.create(baseDto, 'admin-1')).rejects.toThrow(ConflictException);
    });

    it('creates the coupon against the RVA tables only', async () => {
      prisma.recruitmentVendorCoupon.findFirst
        .mockResolvedValueOnce(null) // duplicate check
        .mockResolvedValueOnce(couponRow()); // findOne after create
      tx.recruitmentVendorCoupon.create.mockResolvedValue(couponRow());
      prisma.recruitmentVendorCouponUsage.groupBy.mockResolvedValue([]);

      const result = await service.create(baseDto, 'admin-1', '1.2.3.4');

      expect(tx.recruitmentVendorCoupon.create).toHaveBeenCalled();
      expect(tx.recruitmentVendorCouponPlan.deleteMany).toHaveBeenCalled();
      expect(tx.recruitmentVendorCouponUser.deleteMany).toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RVA_COUPON_CREATED', entityId: 'rc1' }),
      );
      expect(result).toMatchObject({ id: 'rc1', code: 'RVA20', status: expect.any(String) });
    });
  });

  describe('remove (archive)', () => {
    it('soft-archives the coupon and records an audit entry', async () => {
      prisma.recruitmentVendorCoupon.findFirst.mockResolvedValue(couponRow());
      prisma.recruitmentVendorCouponUsage.count.mockResolvedValue(0);

      const result = await service.remove('rc1', 'admin-1');

      expect(prisma.recruitmentVendorCoupon.update).toHaveBeenCalledWith({
        where: { id: 'rc1' },
        data: { isActive: false, deletedAt: expect.any(Date) },
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RVA_COUPON_ARCHIVED' }),
      );
      expect(result).toMatchObject({ id: 'rc1', archived: true, status: 'ARCHIVED' });
    });

    it('throws NotFound for an unknown coupon', async () => {
      prisma.recruitmentVendorCoupon.findFirst.mockResolvedValue(null);
      await expect(service.remove('nope', 'admin-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('hardDelete', () => {
    it('refuses to delete a coupon that still has redemptions', async () => {
      prisma.recruitmentVendorCoupon.findFirst.mockResolvedValue(couponRow());
      prisma.recruitmentVendorCouponUsage.count.mockResolvedValue(3);

      await expect(service.hardDelete('rc1', 'admin-1')).rejects.toThrow(ConflictException);
      expect(prisma.recruitmentVendorCoupon.delete).not.toHaveBeenCalled();
    });

    it('deletes a coupon with no redemptions', async () => {
      prisma.recruitmentVendorCoupon.findFirst.mockResolvedValue(couponRow());
      prisma.recruitmentVendorCouponUsage.count.mockResolvedValue(0);
      prisma.recruitmentVendorCoupon.delete.mockResolvedValue({});

      const result = await service.hardDelete('rc1', 'admin-1');

      expect(prisma.recruitmentVendorCoupon.delete).toHaveBeenCalledWith({ where: { id: 'rc1' } });
      expect(result).toMatchObject({ id: 'rc1', deleted: true });
    });
  });

  describe('restore', () => {
    it('clears deletedAt and re-activates', async () => {
      prisma.recruitmentVendorCoupon.findFirst
        .mockResolvedValueOnce(couponRow({ deletedAt: new Date(), isActive: false }))
        .mockResolvedValueOnce(couponRow());
      prisma.recruitmentVendorCouponUsage.groupBy.mockResolvedValue([]);

      await service.restore('rc1', 'admin-1');

      expect(prisma.recruitmentVendorCoupon.update).toHaveBeenCalledWith({
        where: { id: 'rc1' },
        data: { isActive: true, deletedAt: null },
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RVA_COUPON_RESTORED' }),
      );
    });
  });
});
