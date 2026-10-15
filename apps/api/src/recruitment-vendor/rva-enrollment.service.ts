import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RvaEnrollDto } from './dto/rva-enroll.dto';

/**
 * Recruitment Vendor Access onboarding/enrollment.
 *
 * Enrollment is deliberately separate from the Opportunity Vault so that
 * new-vault signups are independently identifiable. It reuses the global User
 * account (no duplicate accounts) and stores at most one enrollment per user.
 */
@Injectable()
export class RvaEnrollmentService {
  constructor(private readonly prisma: PrismaService) {}

  async enroll(userId: string, dto: RvaEnrollDto) {
    const enrollment = await this.prisma.recruitmentVendorEnrollment.upsert({
      where: { userId },
      update: {
        companyName: dto.companyName ?? undefined,
        contactName: dto.contactName ?? undefined,
        vendorType: dto.vendorType ?? undefined,
        source: dto.source ?? undefined,
        status: 'ENROLLED',
        deletedAt: null,
      },
      create: {
        userId,
        companyName: dto.companyName ?? null,
        contactName: dto.contactName ?? null,
        vendorType: dto.vendorType ?? null,
        source: dto.source ?? null,
        status: 'ENROLLED',
      },
    });
    return this.serialize(enrollment);
  }

  async getMine(userId: string) {
    const enrollment = await this.prisma.recruitmentVendorEnrollment.findFirst({
      where: { userId, deletedAt: null },
    });
    return enrollment ? this.serialize(enrollment) : null;
  }

  private serialize(e: {
    id: string;
    companyName: string | null;
    contactName: string | null;
    vendorType: string | null;
    source: string | null;
    status: string;
    createdAt: Date;
  }) {
    return {
      id: e.id,
      companyName: e.companyName,
      contactName: e.contactName,
      vendorType: e.vendorType,
      source: e.source,
      status: e.status,
      createdAt: e.createdAt,
      vault: 'recruitment-vendor-access',
    };
  }
}
