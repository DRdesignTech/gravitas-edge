import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CreateRvaFaqDto } from './dto/create-rva-faq.dto';
import { UpdateRvaFaqDto } from './dto/update-rva-faq.dto';

const ENTITY = 'RecruitmentVendorFaq';

@Injectable()
export class AdminRvaFaqsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    return this.prisma.recruitmentVendorFaq.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(id: string) {
    const faq = await this.prisma.recruitmentVendorFaq.findFirst({
      where: { id, deletedAt: null },
    });
    if (!faq) {
      throw new NotFoundException('Recruitment vendor FAQ not found');
    }
    return faq;
  }

  async create(dto: CreateRvaFaqDto, adminUserId: string, ipAddress?: string) {
    const faq = await this.prisma.recruitmentVendorFaq.create({
      data: {
        question: dto.question,
        answer: dto.answer,
        category: dto.category ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
    await this.audit.record({
      adminUserId,
      action: 'CREATE',
      entityType: ENTITY,
      entityId: faq.id,
      details: { question: faq.question },
      ipAddress,
    });
    return faq;
  }

  async update(id: string, dto: UpdateRvaFaqDto, adminUserId: string, ipAddress?: string) {
    await this.findOne(id);
    const faq = await this.prisma.recruitmentVendorFaq.update({
      where: { id },
      data: {
        question: dto.question,
        answer: dto.answer,
        category: dto.category,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
      },
    });
    await this.audit.record({
      adminUserId,
      action: 'UPDATE',
      entityType: ENTITY,
      entityId: id,
      details: { question: faq.question },
      ipAddress,
    });
    return faq;
  }

  async remove(id: string, adminUserId: string, ipAddress?: string) {
    await this.findOne(id);
    await this.prisma.recruitmentVendorFaq.update({
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
}
