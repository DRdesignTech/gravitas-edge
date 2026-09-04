import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CreateExperienceLevelDto } from './dto/create-experience-level.dto';
import { UpdateExperienceLevelDto } from './dto/update-experience-level.dto';

@Injectable()
export class ExperienceLevelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    return this.prisma.experienceLevel.findMany({
      orderBy: [{ sortOrder: 'asc' }, { minYears: 'asc' }],
    });
  }

  async findOne(id: string) {
    const level = await this.prisma.experienceLevel.findUnique({ where: { id } });
    if (!level) {
      throw new NotFoundException('Experience level not found');
    }
    return level;
  }

  /**
   * Validate that a range is coherent and does not overlap any existing level.
   * Overlapping ranges are rejected unless they are exactly contiguous.
   */
  private async validateRange(minYears: number, maxYears: number | undefined, excludeId?: string) {
    if (minYears < 0) {
      throw new BadRequestException('minYears cannot be negative');
    }
    if (maxYears !== undefined) {
      if (maxYears < 0) {
        throw new BadRequestException('maxYears cannot be negative');
      }
      if (maxYears <= minYears) {
        throw new BadRequestException('maxYears must be greater than minYears');
      }
    }

    const others = await this.prisma.experienceLevel.findMany({
      where: excludeId ? { id: { not: excludeId } } : {},
    });

    for (const o of others) {
      const oMax = o.maxYears ?? Number.MAX_SAFE_INTEGER;
      const rangeEnd = maxYears ?? Number.MAX_SAFE_INTEGER;
      const overlap = minYears < oMax && o.minYears < rangeEnd;
      if (overlap) {
        throw new ConflictException(
          `Range overlaps with existing level "${o.name}" (${o.minYears}-${o.maxYears ?? '∞'})`,
        );
      }
    }
  }

  async create(dto: CreateExperienceLevelDto, adminUserId: string, ipAddress?: string) {
    await this.validateRange(dto.minYears, dto.maxYears);

    const slug = dto.slug ?? this.slugify(dto.name);
    const code = dto.code ?? slug.toUpperCase();

    if (dto.slug) {
      const dup = await this.prisma.experienceLevel.findUnique({ where: { slug: dto.slug } });
      if (dup) throw new ConflictException('Experience level slug already exists');
    }
    if (dto.code) {
      const dup = await this.prisma.experienceLevel.findUnique({ where: { code: dto.code } });
      if (dup) throw new ConflictException('Experience level code already exists');
    }

    const level = await this.prisma.experienceLevel.create({
      data: {
        name: dto.name,
        slug,
        code,
        minYears: dto.minYears,
        maxYears: dto.maxYears ?? null,
        description: dto.description,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    await this.audit.record({
      action: 'EXPERIENCE_LEVEL_CREATED',
      entityType: 'ExperienceLevel',
      entityId: level.id,
      adminUserId,
      ipAddress,
      details: { name: level.name, minYears: level.minYears, maxYears: level.maxYears },
    });

    return level;
  }

  async update(id: string, dto: UpdateExperienceLevelDto, adminUserId: string, ipAddress?: string) {
    const existing = await this.findOne(id);

    const minYears = dto.minYears ?? existing.minYears;
    const normalizeMax = dto.maxYears !== undefined ? dto.maxYears : existing.maxYears;
    await this.validateRange(minYears, normalizeMax ?? undefined, id);

    if (dto.slug && dto.slug !== existing.slug) {
      const dup = await this.prisma.experienceLevel.findUnique({ where: { slug: dto.slug } });
      if (dup) throw new ConflictException('Experience level slug already exists');
    }
    if (dto.code && dto.code !== existing.code) {
      const dup = await this.prisma.experienceLevel.findUnique({ where: { code: dto.code } });
      if (dup) throw new ConflictException('Experience level code already exists');
    }

    const level = await this.prisma.experienceLevel.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        code: dto.code,
        minYears: dto.minYears,
        maxYears: dto.maxYears !== undefined ? dto.maxYears : undefined,
        description: dto.description,
        sortOrder: dto.sortOrder,
      },
    });

    await this.audit.record({
      action: 'EXPERIENCE_LEVEL_UPDATED',
      entityType: 'ExperienceLevel',
      entityId: id,
      adminUserId,
      ipAddress,
      details: { changes: dto as any },
    });

    return level;
  }

  async remove(id: string, adminUserId: string, ipAddress?: string) {
    await this.findOne(id);

    const refs = await this.prisma.$transaction([
      this.prisma.vaultExperienceLevel.count({ where: { experienceLevelId: id } }),
      this.prisma.opportunityExperienceLevel.count({ where: { experienceLevelId: id } }),
    ]);
    const [vaultRefs, oppRefs] = refs;

    if (vaultRefs > 0 || oppRefs > 0) {
      throw new BadRequestException(
        `Cannot delete experience level: it is referenced by ${vaultRefs} vault(s) and ${oppRefs} opportunity relationship(s)`,
      );
    }

    await this.prisma.experienceLevel.delete({ where: { id } });

    await this.audit.record({
      action: 'EXPERIENCE_LEVEL_DELETED',
      entityType: 'ExperienceLevel',
      entityId: id,
      adminUserId,
      ipAddress,
    });

    return { deleted: true, id };
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
