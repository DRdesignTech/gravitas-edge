import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Public Recruitment Vendor Access FAQs. Backed entirely by the database
 * (admin-managed); no FAQs are hardcoded in the API.
 */
@Injectable()
export class RvaFaqsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublicFaqs() {
    const faqs = await this.prisma.recruitmentVendorFaq.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, question: true, answer: true, category: true, sortOrder: true },
    });
    return faqs;
  }
}
