import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionAccessService } from '../access/subscription-access.service';

export interface PublicVaultDto {
  id: string;
  name: string;
  description: string | null;
  type: string;
  locked: boolean;
}

/**
 * Returns vaults visible to a user. A vault is:
 *  - fully returned (with its experience levels) if it is publicly offered or
 *    granted by an active subscription entitlement;
 *  - returned as safe metadata with locked=true otherwise (no premium content).
 */
@Injectable()
export class VaultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: SubscriptionAccessService,
  ) {}

  async listForUser(userId?: string) {
    const accessibleIds = userId ? await this.access.getAccessibleVaultIds(userId) : [];
    const accessibleSet = new Set(accessibleIds);

    const vaults = await this.prisma.vault.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        experienceLevels: {
          select: {
            experienceLevel: { select: { id: true, name: true, minYears: true, maxYears: true } },
          },
        },
      },
    });

    return vaults.map((v) => {
      const locked = !accessibleSet.has(v.id);
      const base: PublicVaultDto = {
        id: v.id,
        name: v.name,
        description: v.description,
        type: v.type,
        locked,
      };
      if (locked) {
        return { ...base, experienceLevels: [] };
      }
      return {
        ...base,
        experienceLevels: v.experienceLevels.map((el) => el.experienceLevel),
      };
    });
  }
}
