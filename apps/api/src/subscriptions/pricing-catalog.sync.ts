/**
 * Idempotent sync of the Gravitas Edge vault pricing catalog.
 *
 * Safe to run repeatedly against any environment (dev seed and production data
 * migration share this logic):
 *   - renames the 6 business vaults to their canonical catalog names,
 *   - creates/updates the 18 plans (6 vaults x 3 durations), each linked to
 *     exactly one vault via PlanVault,
 *   - archives (never deletes) legacy plans and non-catalog vaults,
 *   - never touches existing subscriptions, payments or user vault access.
 *
 * Plain TS (no decorators) so it can be imported by the standalone prisma seed.
 */
import { Prisma, PrismaClient } from '@prisma/client';
import {
  assertValidOffer,
  LEGACY_PLAN_NAMES,
  NON_CATALOG_VAULT_NAMES,
  planName,
  PRICING_CATALOG,
} from './pricing-catalog';

type DbLike = PrismaClient | Prisma.TransactionClient;

export interface CatalogSyncSummary {
  vaultsCreated: number;
  vaultsUpdated: number;
  vaultsArchived: number;
  plansCreated: number;
  plansUpdated: number;
  plansArchived: number;
  planVaultLinks: number;
}

const normalize = (name: string) => name.trim().toLowerCase();

export async function syncPricingCatalog(db: DbLike): Promise<CatalogSyncSummary> {
  const summary: CatalogSyncSummary = {
    vaultsCreated: 0,
    vaultsUpdated: 0,
    vaultsArchived: 0,
    plansCreated: 0,
    plansUpdated: 0,
    plansArchived: 0,
    planVaultLinks: 0,
  };

  // Build a normalized lookup of every current vault once (avoids N lookups).
  const existingVaults = await db.vault.findMany({ select: { id: true, name: true } });
  const vaultByName = new Map<string, string>();
  for (const v of existingVaults) {
    vaultByName.set(normalize(v.name), v.id);
  }

  for (const def of PRICING_CATALOG) {
    for (const offer of def.plans) {
      assertValidOffer(def.name, offer);
    }

    const names = [def.name, ...def.aliases].map(normalize);
    const match = names.map((n) => vaultByName.get(n)).find((id) => id != null);

    let vaultId: string;
    if (match) {
      await db.vault.update({
        where: { id: match },
        data: {
          name: def.name,
          description: def.description,
          type: def.type,
          status: 'ACTIVE',
          sortOrder: def.sortOrder,
          deletedAt: null,
        },
      });
      vaultId = match;
      summary.vaultsUpdated += 1;
    } else {
      const created = await db.vault.create({
        data: {
          name: def.name,
          description: def.description,
          type: def.type,
          status: 'ACTIVE',
          sortOrder: def.sortOrder,
        },
      });
      vaultId = created.id;
      vaultByName.set(normalize(def.name), vaultId);
      summary.vaultsCreated += 1;
    }

    for (const offer of def.plans) {
      const name = planName(def.name, offer.label);

      const existing = await db.subscriptionPlan.findUnique({ where: { name } });
      let planId: string;
      if (existing) {
        await db.subscriptionPlan.update({
          where: { id: existing.id },
          data: {
            description: offerDescription(def.name, offer.label),
            price: offer.price,
            regularPrice: offer.regularPrice,
            discountPercentage: offer.discountPercentage,
            currency: 'INR',
            durationDays: offer.durationDays,
            isActive: true,
            deletedAt: null,
          },
        });
        planId = existing.id;
        summary.plansUpdated += 1;
      } else {
        const created = await db.subscriptionPlan.create({
          data: {
            name,
            description: offerDescription(def.name, offer.label),
            price: offer.price,
            regularPrice: offer.regularPrice,
            discountPercentage: offer.discountPercentage,
            currency: 'INR',
            durationDays: offer.durationDays,
            isActive: true,
          },
        });
        planId = created.id;
        summary.plansCreated += 1;
      }

      // Ensure exactly one link to this catalog vault (no duplicates).
      await db.planVault.upsert({
        where: { planId_vaultId: { planId, vaultId } },
        update: {},
        create: { planId, vaultId },
      });
      summary.planVaultLinks += 1;
    }
  }

  // ---------------------------------------------------------------------------
  // Archive (never delete) legacy plans that are not part of the new catalog.
  // ---------------------------------------------------------------------------
  const legacyPlanUpdate = await db.subscriptionPlan.updateMany({
    where: { name: { in: LEGACY_PLAN_NAMES }, deletedAt: null },
    data: { isActive: false, deletedAt: new Date() },
  });
  summary.plansArchived = legacyPlanUpdate.count;

  // ---------------------------------------------------------------------------
  // Archive (never delete) vaults that are not part of the new catalog.
  // ---------------------------------------------------------------------------
  const vaultUpdate = await db.vault.updateMany({
    where: { name: { in: NON_CATALOG_VAULT_NAMES }, deletedAt: null },
    data: { status: 'ARCHIVED', deletedAt: new Date() },
  });
  summary.vaultsArchived = vaultUpdate.count;

  return summary;
}

function offerDescription(vaultName: string, label: string): string {
  return `${label} access to the ${vaultName}.`;
}
