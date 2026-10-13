import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CreateTestimonialDto, UpdateTestimonialDto } from './dto/create-testimonial.dto';

@Injectable()
export class AdminTestimonialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    return this.prisma.testimonial.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(id: string) {
    const testimonial = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!testimonial) {
      throw new NotFoundException('Testimonial not found');
    }
    return testimonial;
  }

  async create(dto: CreateTestimonialDto, adminUserId: string, ipAddress?: string) {
    const testimonial = await this.prisma.testimonial.create({
      data: {
        name: dto.name.trim(),
        role: dto.role.trim(),
        badge: dto.badge?.trim() || null,
        quote: dto.quote.trim(),
        linkedinUrl: dto.linkedinUrl?.trim() || null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });

    await this.audit.record({
      action: 'TESTIMONIAL_CREATED',
      entityType: 'Testimonial',
      entityId: testimonial.id,
      adminUserId,
      ipAddress,
      details: { name: testimonial.name, sortOrder: testimonial.sortOrder },
    });

    return testimonial;
  }

  async update(id: string, dto: UpdateTestimonialDto, adminUserId: string, ipAddress?: string) {
    await this.findOne(id);

    const testimonial = await this.prisma.testimonial.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        role: dto.role !== undefined ? dto.role.trim() : undefined,
        badge: dto.badge !== undefined ? dto.badge?.trim() || null : undefined,
        quote: dto.quote !== undefined ? dto.quote.trim() : undefined,
        linkedinUrl: dto.linkedinUrl !== undefined ? dto.linkedinUrl?.trim() || null : undefined,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
      },
    });

    await this.audit.record({
      action: 'TESTIMONIAL_UPDATED',
      entityType: 'Testimonial',
      entityId: id,
      adminUserId,
      ipAddress,
      details: { changes: dto as any },
    });

    return testimonial;
  }

  async remove(id: string, adminUserId: string, ipAddress?: string) {
    await this.findOne(id);

    await this.prisma.testimonial.delete({ where: { id } });

    await this.audit.record({
      action: 'TESTIMONIAL_DELETED',
      entityType: 'Testimonial',
      entityId: id,
      adminUserId,
      ipAddress,
    });

    return { deleted: true, id };
  }
}
