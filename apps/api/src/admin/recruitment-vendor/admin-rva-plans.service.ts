import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RecruitmentVendorPlan } from '@prisma/client';
import { calculateDiscountPercentage } from '@job-portal/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CreateRvaPlanDto } from './dto/create-rva-plan.dto';
import { UpdateRvaPlanDto } from './dto/update-rva-plan.dto';

const ENTITY = 'RecruitmentVendorPlan';

@Injectable()
export class AdminRvaPlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    return this.prisma.recruitmentVendorPlan.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { durationDays: 'asc' }],
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.recruitmentVendorPlan.findFirst({
      where: { id, deletedAt: null },
    });
    if (!plan) {
      throw new NotFoundException('Recruitment vendor plan not found');
    }
    return plan;
  }

  async create(dto: CreateRvaPlanDto, adminUserId: string, ipAddress?: string) {
    const data = this.buildData(dto, true);
    const plan = await this.prisma.recruitmentVendorPlan.create({ data });
    await this.audit.record({
      adminUserId,
      action: 'CREATE',
      entityType: ENTITY,
      entityId: plan.id,
      details: { name: plan.name },
      ipAddress,
    });
    return plan;
  }

  async update(id: string, dto: UpdateRvaPlanDto, adminUserId: string, ipAddress?: string) {
    const existing = await this.findOne(id);
    const data = this.buildData(dto, false, existing);
    const plan = await this.prisma.recruitmentVendorPlan.update({ where: { id }, data });
    await this.audit.record({
      adminUserId,
      action: 'UPDATE',
      entityType: ENTITY,
      entityId: id,
      details: { name: plan.name },
      ipAddress,
    });
    return plan;
  }

  async remove(id: string, adminUserId: string, ipAddress?: string) {
    await this.findOne(id);
    await this.prisma.recruitmentVendorPlan.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await this.audit.record({
      adminUserId,
      action: 'ARCHIVE',
      entityType: ENTITY,
      entityId: id,
      ipAddress,
    });
    return { id, archived: true };
  }

  /**
   * Builds validated Prisma data. `price`/`regularPrice` defaults are resolved
   * against the existing row on update so a partial edit can never produce
   * price > regularPrice. The discount is always recomputed server-side.
   */
  private buildData(
    dto: CreateRvaPlanDto | UpdateRvaPlanDto,
    isCreate: boolean,
    existing?: RecruitmentVendorPlan,
  ): {
    name: string;
    description: string | null;
    price: number;
    regularPrice: number;
    discountPercentage: number;
    currency: string;
    durationDays: number;
    isActive: boolean;
    sortOrder: number;
  } {
    const price = dto.price ?? (existing ? Number(existing.price) : undefined);
    const regularPrice =
      dto.regularPrice ?? (existing ? Number(existing.regularPrice) : undefined) ?? price ?? 0;

    if (price === undefined) {
      throw new BadRequestException('price is required');
    }
    if (price < 0 || regularPrice < 0) {
      throw new BadRequestException('Prices must be >= 0');
    }
    if (price > regularPrice) {
      throw new BadRequestException('Discounted price cannot exceed regular price');
    }

    // Backwards compatibility: a client-supplied discount is validated but never
    // trusted/stored; the stored value is always derived from the prices so the
    // "% OFF" badge can never contradict the price shown.
    if (dto.discountPercentage !== undefined) {
      if (
        !Number.isInteger(dto.discountPercentage) ||
        dto.discountPercentage < 0 ||
        dto.discountPercentage > 100
      ) {
        throw new BadRequestException('discountPercentage must be an integer between 0 and 100');
      }
    }
    const discountPercentage = calculateDiscountPercentage(regularPrice, price);

    const data = {
      name: dto.name ?? existing?.name ?? '',
      description: dto.description ?? existing?.description ?? null,
      price,
      regularPrice,
      discountPercentage,
      currency: dto.currency ?? existing?.currency ?? 'INR',
      durationDays: dto.durationDays ?? existing?.durationDays ?? 0,
      isActive: dto.isActive ?? existing?.isActive ?? true,
      sortOrder: dto.sortOrder ?? existing?.sortOrder ?? 0,
    };

    if (isCreate && !data.name) {
      throw new BadRequestException('name is required');
    }
    if (!data.durationDays || data.durationDays <= 0) {
      throw new BadRequestException('durationDays must be > 0');
    }
    return data;
  }
}
