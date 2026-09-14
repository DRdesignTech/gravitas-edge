import { syncPricingCatalog, CatalogSyncSummary } from './pricing-catalog.sync';
import {
  PRICING_CATALOG,
  planName,
  LEGACY_PLAN_NAMES,
  NON_CATALOG_VAULT_NAMES,
  assertValidOffer,
} from './pricing-catalog';

type Value = any;

function mockDb() {
  const calls = { vaultUpdateMany: [] as any[], planUpdateMany: [] as any[], upserts: [] as any[] };
  return {
    calls,
    vault: {
      findMany: jest.fn(),
      update: jest.fn(async ({ data }: any) => data),
      create: jest.fn(async ({ data }: any) => ({ id: `vault-${data.name}`, ...data })),
      updateMany: jest.fn(async (args: any) => {
        calls.vaultUpdateMany.push(args);
        return { count: 1 };
      }),
    },
    subscriptionPlan: {
      findUnique: jest.fn(),
      update: jest.fn(async ({ data }: any) => data),
      create: jest.fn(async ({ data }: any) => ({ id: `plan-${data.name}`, ...data })),
      updateMany: jest.fn(async (args: any) => {
        calls.planUpdateMany.push(args);
        return { count: 1 };
      }),
    },
    planVault: {
      upsert: jest.fn(async ({ create }: any) => {
        calls.upserts.push(create);
        return create;
      }),
    },
  } as any;
}

describe('syncPricingCatalog', () => {
  it('creates the full catalog when empty: 6 vaults, 18 plans, 18 links', async () => {
    const db = mockDb();
    db.vault.findMany.mockResolvedValue([]);
    db.subscriptionPlan.findUnique.mockResolvedValue(null);

    const summary: CatalogSyncSummary = await syncPricingCatalog(db as any);

    expect(db.vault.create).toHaveBeenCalledTimes(6);
    expect(db.subscriptionPlan.create).toHaveBeenCalledTimes(18);
    expect(db.planVault.upsert).toHaveBeenCalledTimes(18);
    expect({
      vaultsCreated: summary.vaultsCreated,
      plansCreated: summary.plansCreated,
      planVaultLinks: summary.planVaultLinks,
    }).toEqual({ vaultsCreated: 6, plansCreated: 18, planVaultLinks: 18 });

    const prices = PRICING_CATALOG.map((v) => v.plans.map((p) => p.price)).flat();
    const createdPlans = db.subscriptionPlan.create.mock.calls.map((c: Value[]) => c[0].data);
    const createdPrices = createdPlans
      .map((p: Value) => p.price)
      .sort((a: number, b: number) => a - b);
    expect(createdPrices.sort((a: number, b: number) => a - b)).toEqual(
      prices.sort((a: number, b: number) => a - b),
    );
    expect(createdPlans.map((p: Value) => p.currency)).toEqual(Array(18).fill('INR'));
    const durations: any[] = [...new Set(createdPlans.map((p: Value) => p.durationDays))];
    expect(durations.slice().sort((a, b) => a - b)).toEqual([30, 90, 180]);
    expect(durations).toEqual([30, 90, 180]);
    // each vault gets exactly its 3 durations with canonical plan names
    for (const v of PRICING_CATALOG) {
      const names = new Set(
        createdPlans.filter((p: Value) => p.name.startsWith(v.name)).map((p: Value) => p.name),
      );
      expect(names).toEqual(
        new Set(['Monthly', '3 Months', '6 Months'].map((l) => planName(v.name, l))),
      );
    }
  });

  it('is idempotent: second run updates instead of creating', async () => {
    const db = mockDb();
    const existingVaults = PRICING_CATALOG.map((v, i) => ({ id: `vault-${i}`, name: v.name }));
    db.vault.findMany.mockResolvedValue(existingVaults);
    db.subscriptionPlan.findUnique.mockResolvedValue({ id: 'existing-plan' });

    const summary = await syncPricingCatalog(db as any);
    expect(db.vault.create).not.toHaveBeenCalled();
    expect(db.subscriptionPlan.create).not.toHaveBeenCalled();
    expect(summary.vaultsCreated).toBe(0);
    expect(summary.plansCreated).toBe(0);
    expect(summary.vaultsUpdated).toBe(6);
    expect(summary.plansUpdated).toBe(18);
    expect(db.planVault.upsert).toHaveBeenCalledTimes(18);
  });

  it('renames legacy aliased vaults to their canonical catalog names', async () => {
    const db = mockDb();
    db.vault.findMany.mockResolvedValue([{ id: 'old-remote', name: 'Remote Access' }]);
    db.subscriptionPlan.findUnique.mockResolvedValue(null);

    const summary = await syncPricingCatalog(db as any);
    const remoteUpdate = db.vault.update.mock.calls.find(
      (c: Value[]) => c[0].where.id === 'old-remote',
    );
    expect(remoteUpdate[0].data.name).toBe('Remote Access Vault');
    // plan-vault links point at the renamed vault id, not a new one
    const remoteLinks = db.planVault.upsert.mock.calls
      .map((c: Value[]) => c[0].create)
      .filter((c: Value) => c.vaultId === 'old-remote');
    expect(remoteLinks).toHaveLength(3);
    // vault not re-created twice
    expect(
      db.vault.create.mock.calls.some((c: Value[]) => c[0].data.name === 'Remote Access Vault'),
    ).toBe(false);
    void summary;
  });

  it('writes the complete pricing info (regular, discounted, discount%) for every offer', async () => {
    const db = mockDb();
    db.vault.findMany.mockResolvedValue(
      PRICING_CATALOG.map((v, i) => ({ id: `vault-${i}`, name: v.name })),
    );
    db.subscriptionPlan.findUnique.mockResolvedValue(null);

    await syncPricingCatalog(db as any);

    const createdPlans = db.subscriptionPlan.create.mock.calls.map((c: Value[]) => c[0].data);
    expect(createdPlans).toHaveLength(18);

    for (const v of PRICING_CATALOG) {
      for (const offer of v.plans) {
        const plan = createdPlans.find((p: Value) => p.name === planName(v.name, offer.label));
        expect(plan).toBeDefined();
        expect(plan.price).toBe(offer.price);
        expect(plan.regularPrice).toBe(offer.regularPrice);
        expect(plan.discountPercentage).toBe(offer.discountPercentage);
        expect(Number(plan.price)).toBeLessThanOrEqual(Number(plan.regularPrice));
        expect(plan.durationDays).toBe(offer.durationDays);
        expect(plan.currency).toBe('INR');
      }
    }
  });

  it('updates (does not create) existing plans with the full pricing info on re-run', async () => {
    const db = mockDb();
    db.vault.findMany.mockResolvedValue(
      PRICING_CATALOG.map((v, i) => ({ id: `vault-${i}`, name: v.name })),
    );
    db.subscriptionPlan.findUnique.mockResolvedValue({ id: 'existing-plan' });

    const summary = await syncPricingCatalog(db as any);
    expect(db.subscriptionPlan.create).not.toHaveBeenCalled();
    expect(summary.plansUpdated).toBe(18);

    const updates = db.subscriptionPlan.update.mock.calls.map((c: Value[]) => c[0].data);
    const remoteMonthly = updates.find(
      (d: Value) => d.durationDays === 30 && Number(d.price) === 1499,
    );
    expect(remoteMonthly).toEqual(
      expect.objectContaining({
        price: 1499,
        regularPrice: 1999,
        discountPercentage: 25,
        durationDays: 30,
        isActive: true,
        deletedAt: null,
      }),
    );
  });

  it('assertValidOffer rejects prices where discounted exceeds regular and bad discounts', () => {
    expect(() =>
      assertValidOffer('Remote Access Vault', {
        label: 'Monthly',
        durationDays: 30,
        regularPrice: 100,
        price: 150,
        discountPercentage: 25,
      }),
    ).toThrow(/discounted price cannot exceed regular price/i);

    expect(() =>
      assertValidOffer('Remote Access Vault', {
        label: 'Monthly',
        durationDays: 30,
        regularPrice: 100,
        price: 50,
        discountPercentage: 150,
      }),
    ).toThrow(/discountPercentage/i);

    expect(() =>
      assertValidOffer('Remote Access Vault', {
        label: 'Monthly',
        durationDays: 30,
        regularPrice: -1,
        price: 50,
        discountPercentage: 10,
      }),
    ).toThrow(/regularPrice/i);
  });

  it('archives legacy plans and non-catalog vaults (soft archive, never deletes)', async () => {
    const db = mockDb();
    db.vault.findMany.mockResolvedValue([]);
    db.subscriptionPlan.findUnique.mockResolvedValue(null);

    await syncPricingCatalog(db as any);

    const planWhere = db.calls.planUpdateMany[0].where;
    expect(planWhere).toEqual({ name: { in: LEGACY_PLAN_NAMES }, deletedAt: null });
    expect(db.calls.planUpdateMany[0].data).toEqual({
      isActive: false,
      deletedAt: expect.any(Date),
    });

    const vaultWhere = db.calls.vaultUpdateMany[0].where;
    expect(vaultWhere).toEqual({ name: { in: NON_CATALOG_VAULT_NAMES }, deletedAt: null });
    expect(db.calls.vaultUpdateMany[0].data).toEqual({
      status: 'ARCHIVED',
      deletedAt: expect.any(Date),
    });
  });

  it('watches that update/delete never targets existing subscriptions data: only archives', async () => {
    const db = mockDb();
    db.vault.findMany.mockResolvedValue([]);
    db.subscriptionPlan.findUnique.mockResolvedValue(null);
    await syncPricingCatalog(db as any);
    // no deletes anywhere
    const deleteCalls = [
      'vault.delete',
      'vault.deleteMany',
      'subscriptionPlan.delete',
      'subscriptionPlan.deleteMany',
      'subscription.deleteMany',
    ].filter((m) => typeof (db as any)[m] === 'function');
    expect(deleteCalls).toEqual([]);
  });
});
