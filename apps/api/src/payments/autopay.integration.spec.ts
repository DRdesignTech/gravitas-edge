import { AdminRvaSubscriptionsService } from '../admin/recruitment-vendor/admin-rva-subscriptions.service';
import { RvaAccessService } from '../recruitment-vendor/rva-access.service';
import { RvaPricingService } from '../recruitment-vendor/rva-pricing.service';
import { RvaSubscriptionsService } from '../recruitment-vendor/rva-subscriptions.service';
import { RVA_AUTOPAY_PLANS } from './rva-autopay';
import { subscriptionContractEvent } from './fixtures/razorpay-subscription-contract';
import { UserSubscriptionsService } from '../subscriptions/user-subscriptions.service';
import { PrismaClient } from '@prisma/client';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PricingService } from '../subscriptions/pricing.service';
import { SubscriptionAccessService } from '../access/subscription-access.service';
import { WebhookService } from './webhook.service';
import { CLEANUP_PENDING, reconcileAutoPayCleanup } from './autopay-cleanup';

// Opt-in only: this suite must never connect to a configured application DB.
const url = process.env.AUTOPAY_TEST_DATABASE_URL;
const localOnly =
  url && /^postgresql:\/\/autopay_test@127\.0\.0\.1:55439\/autopay_test(?:\?|$)/.test(url);
if (url && !localOnly)
  throw new Error('AutoPay integration tests require the isolated local test database');
const suite = localOnly ? describe : describe.skip;
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

suite('AutoPay with real PostgreSQL transactions', () => {
  const db = new PrismaClient({ datasources: { db: { url: url || 'postgresql://unused' } } });
  let pricing: PricingService;
  let webhooks: WebhookService;
  let access: SubscriptionAccessService;
  let gateway: any;
  let userId: string;
  let planId: string;
  let vaultId: string;
  let remotes: Map<string, any>;
  let gatewayPayments: Map<string, any>;

  beforeAll(async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    // Test fixture constraint, not a migration deployment. This DB is disposable.
    await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS autopay_test_unique
      ON "Subscription" ("userId", "planId") WHERE "autoRenew" = true AND "status" IN ('PENDING', 'ACTIVE')`);
  });
  afterAll(async () => {
    await db.$disconnect();
    jest.restoreAllMocks();
  });
  beforeEach(async () => {
    userId = (await db.user.create({ data: { email: `${randomUUID()}@autopay.test` } })).id;
    const vault = await db.vault.create({ data: { name: randomUUID() } });
    vaultId = vault.id;
    planId = (
      await db.subscriptionPlan.create({
        data: {
          name: randomUUID(),
          price: 499,
          durationDays: 30,
          razorpayPlanId: `plan_${randomUUID()}`,
          vaults: { create: { vaultId } },
        },
      })
    ).id;
    remotes = new Map();
    gatewayPayments = new Map();
    gateway = {
      createOrder: jest.fn(async () => ({ id: `order_${randomUUID()}` })),
      createSubscription: jest.fn(async (options) => {
        const remote = {
          id: `sub_${randomUUID()}`,
          status: 'created',
          plan_id: options.planId,
          notes: options.notes,
          paid_count: 0,
          total_count: options.totalCount,
          short_url: 'https://example.test/checkout',
        };
        remotes.set(remote.id, remote);
        return { ...remote };
      }),
      fetchSubscription: jest.fn(async (id) => ({ ...remotes.get(id) })),
      cancelSubscription: jest.fn(async (id) => {
        remotes.get(id).status = 'cancelled';
        return { ...remotes.get(id) };
      }),
      validateRazorpayPlanId: jest.fn(),
      getKeyId: jest.fn(() => 'test_key'),
      verifySubscriptionSignature: jest.fn(() => true),
      verifySignature: jest.fn(() => true),
      fetchPayment: jest.fn(async (id) => gatewayPayments.get(id)),
    };
    access = new SubscriptionAccessService(
      db as any,
      { handleSubscriptionActivated: jest.fn() } as any,
    );
    pricing = new PricingService(db as any, access, {} as any, gateway);
    webhooks = new WebhookService(db as any, gateway, access);
  });
  const buy = () => pricing.purchase(userId, { planId, vaultId, recurring: true }) as Promise<any>;
  function event(
    purchase: any,
    type = 'subscription.charged',
    paymentId = `pay_${randomUUID()}`,
    paidCount = 1,
  ): any {
    return {
      id: randomUUID(),
      event: type,
      entity: 'event',
      account_id: 'test',
      contains: [],
      payload: {
        subscription: {
          entity: {
            id: purchase.razorpaySubscriptionId,
            plan_id: remotes.get(purchase.razorpaySubscriptionId).plan_id,
            notes: { userId, planId },
            paid_count: paidCount,
            auth_attempts: 3,
            charge_at: 0,
            current_end: Math.floor(Date.now() / 1000) + paidCount * 30 * 86400,
          },
        },
        payment: {
          entity: {
            id: paymentId,
            subscription_id: purchase.razorpaySubscriptionId,
            status: type.includes('failed') ? 'failed' : 'captured',
            captured: !type.includes('failed'),
            amount: 49900,
            currency: 'INR',
            order_id: null,
            created_at: 1,
          },
        },
      },
    };
  }
  async function verify(purchase: any, paymentId = `pay_${randomUUID()}`) {
    gatewayPayments.set(paymentId, {
      id: paymentId,
      subscription_id: purchase.razorpaySubscriptionId,
      status: 'captured',
      captured: true,
      amount: 49900,
      currency: 'INR',
    });
    return pricing.verifySubscriptionPayment(userId, {
      paymentId: purchase.paymentId,
      razorpay_payment_id: paymentId,
      razorpay_subscription_id: purchase.razorpaySubscriptionId,
      razorpay_signature: 'test',
    });
  }

  it('verifies RVA checkout, renews once per captured charge, and keeps paid access after stopping AutoPay', async () => {
    const plan = await db.recruitmentVendorPlan.create({
      data: {
        name: randomUUID(),
        price: 10999,
        regularPrice: 10999,
        durationDays: 90,
        currency: 'INR',
      },
    });
    const billing = RVA_AUTOPAY_PLANS[90]!;
    gateway.fetchPlan = jest.fn(async () => ({
      id: billing.id,
      period: 'monthly',
      interval: billing.months,
      item: { amount: billing.amount * 100, currency: 'INR' },
    }));
    const rva = new RvaPricingService(db as any, gateway, {} as any);
    const rvaAccess = new RvaAccessService(db as any);
    const rvaSubscriptions = new RvaSubscriptionsService(db as any, rvaAccess, gateway);
    const stale = await rva.purchase(userId, plan.id, undefined, true);
    if (!('razorpaySubscriptionId' in stale) || !stale.razorpaySubscriptionId)
      throw new Error('Expected RVA AutoPay checkout');
    const staleRemote = remotes.get(stale.razorpaySubscriptionId);
    staleRemote.total_count = 8;
    const checkout = await rva.purchase(userId, plan.id, undefined, true);
    expect(checkout.paymentId).not.toBe(stale.paymentId);
    expect(staleRemote.status).toBe('cancelled');
    expect(await db.payment.findUnique({ where: { id: stale.paymentId } })).toMatchObject({
      status: 'CANCELLED',
    });
    const retry = await rva.purchase(userId, plan.id, undefined, true);
    expect(retry.paymentId).toBe(checkout.paymentId);
    expect(gateway.createSubscription).toHaveBeenCalledTimes(2);
    expect(gateway.createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ totalCount: 20 }),
    );
    expect(await rvaAccess.hasActiveSubscription(userId)).toBe(false);
    await expect(rva.confirmPurchase(userId, checkout.paymentId)).rejects.toThrow('verified');

    const first = event(checkout, 'subscription.charged');
    const remote = first.payload.subscription.entity;
    remote.status = 'active';
    remote.current_start = Math.floor(Date.now() / 1000) - 1;
    remote.charge_at = remote.current_end;
    remotes.set(remote.id, remote);
    const charge = first.payload.payment.entity;
    const verification = {
      paymentId: checkout.paymentId,
      razorpay_payment_id: charge.id,
      razorpay_subscription_id: remote.id,
      razorpay_signature: 'test',
    };
    gatewayPayments.set(charge.id, { ...charge, amount: 1 });
    await expect(rva.verifyRecurring(userId, verification)).rejects.toThrow('mismatched');
    expect(await rvaAccess.hasActiveSubscription(userId)).toBe(false);
    charge.amount = billing.amount * 100;
    gatewayPayments.set(charge.id, { ...charge, status: 'authorized', captured: false });
    await expect(rva.verifyRecurring(userId, verification)).resolves.toEqual({ status: 'PENDING' });
    expect(await rvaAccess.hasActiveSubscription(userId)).toBe(false);
    gatewayPayments.set(charge.id, charge);
    await Promise.all([rva.verifyRecurring(userId, verification), webhooks.handleWebhook(first)]);

    const paid = await rvaSubscriptions.getMyAccess(userId);
    expect(paid.hasAccess).toBe(true);
    expect(await rvaAccess.requireAccess(userId)).toEqual({
      authorized: true,
      subscriptionId: paid.subscription?.id,
    });
    expect(paid.subscription?.autoRenew).toBe(true);
    expect(await db.payment.count({ where: { razorpaySubscriptionId: remote.id } })).toBe(1);
    expect(await access.hasActiveSubscription(userId)).toBe(false);

    const renewal = event(checkout, 'subscription.charged', undefined, 2);
    renewal.payload.subscription.entity.status = 'active';
    renewal.payload.payment.entity.amount = billing.amount * 100;
    await webhooks.handleWebhook(renewal);
    await webhooks.handleWebhook({ ...renewal, id: randomUUID() });
    expect(await db.payment.count({ where: { razorpaySubscriptionId: remote.id } })).toBe(2);
    const renewed = await rvaSubscriptions.getMyAccess(userId);
    expect(renewed.subscription?.endDate.getTime()).toBeGreaterThan(
      paid.subscription!.endDate.getTime(),
    );

    await rvaSubscriptions.stopAutoPay(userId, renewed.subscription!.id);
    expect(gateway.cancelSubscription).toHaveBeenCalledWith(remote.id, true);
    const stopped = await rvaSubscriptions.getMyAccess(userId);
    expect(stopped.hasAccess).toBe(true);
    expect(stopped.subscription?.autoRenew).toBe(false);
    expect(stopped.subscription?.endDate).toEqual(renewed.subscription?.endDate);
  });

  it('grants audited RVA access without creating a payment or mandate', async () => {
    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
    const plan = await db.recruitmentVendorPlan.create({
      data: {
        name: randomUUID(),
        price: 3999,
        regularPrice: 3999,
        durationDays: 30,
        currency: 'INR',
      },
    });
    const admin = new AdminRvaSubscriptionsService(db as any);
    const input = { email: user.email!.toUpperCase(), planId: plan.id, reason: 'Support access' };
    const grant = await admin.grant(input, userId);
    expect(grant.created).toBe(true);
    expect(await admin.grant(input, userId)).toEqual({ id: grant.id, created: false });
    const rvaAccess = new RvaAccessService(db as any);
    expect(await rvaAccess.hasActiveSubscription(userId)).toBe(true);
    expect(await db.payment.count({ where: { recruitmentVendorSubscriptionId: grant.id } })).toBe(
      0,
    );
    expect(
      await db.auditLog.count({
        where: { entityId: grant.id, action: 'ADMIN_MANUAL_RVA_ACCESS_GRANTED' },
      }),
    ).toBe(1);
  });

  it('cancels checkout idempotently and creates a fresh AutoPay purchase', async () => {
    const first = await buy();
    await pricing.failPayment(userId, first.paymentId);
    await pricing.failPayment(userId, first.paymentId);
    const next = await buy();
    expect(next.recurring).toBe(true);
    expect(next.paymentId).not.toBe(first.paymentId);
    expect(next.razorpaySubscriptionId).not.toBe(first.razorpaySubscriptionId);
    expect(gateway.cancelSubscription).toHaveBeenCalledTimes(1);
    expect(await access.hasActiveSubscription(userId)).toBe(false);
    expect((await db.payment.findUniqueOrThrow({ where: { id: first.paymentId } })).status).toBe(
      'FAILED',
    );
  });

  it('cleans up initial failure, preserves payment history, and permits retry', async () => {
    const first = await buy();
    const failure = event(first, 'subscription.payment_failed');
    await webhooks.handleWebhook(failure);
    await webhooks.handleWebhook(failure);
    expect(remotes.get(first.razorpaySubscriptionId).status).toBe('cancelled');
    expect(
      await db.payment.count({ where: { subscriptionId: first.subscriptionId, status: 'FAILED' } }),
    ).toBe(1);
    expect((await buy()).recurring).toBe(true);
  });

  it('blocks purchase after remote cancellation failure, then repairs on repeated failure request', async () => {
    const first = await buy();
    gateway.cancelSubscription.mockRejectedValueOnce(new Error('gateway unavailable'));
    await expect(pricing.failPayment(userId, first.paymentId)).rejects.toThrow(
      'cleanup is pending',
    );
    const sub = await db.subscription.findUniqueOrThrow({ where: { id: first.subscriptionId } });
    expect(sub).toMatchObject({
      status: 'PENDING',
      autoRenew: true,
      cancellationReason: CLEANUP_PENDING,
    });
    await expect(buy()).rejects.toThrow('active AutoPay');
    await pricing.failPayment(userId, first.paymentId);
    expect((await buy()).paymentId).not.toBe(first.paymentId);
  });

  it('reconciles interrupted cleanup and an abandoned browser session', async () => {
    const first = await buy();
    await db.subscription.update({
      where: { id: first.subscriptionId },
      data: { createdAt: new Date(Date.now() - 3600000) },
    });
    expect(await reconcileAutoPayCleanup(db as any, gateway)).toContainEqual({
      id: first.subscriptionId,
      repaired: true,
    });
    expect((await buy()).recurring).toBe(true);
  });

  it('preserves a capture that wins while cancellation is waiting on the gateway', async () => {
    const first = await buy();
    const entered = deferred();
    const release = deferred();
    gateway.cancelSubscription.mockImplementationOnce(async (id: string) => {
      entered.resolve();
      await release.promise;
      remotes.get(id).status = 'cancelled';
    });
    const cancellation = pricing.failPayment(userId, first.paymentId);
    // Attach rejection handler before unblocking to avoid an unhandled rejection.
    const outcome = cancellation.catch((error) => error);
    await entered.promise;
    await verify(first);
    remotes.get(first.razorpaySubscriptionId).paid_count = 1;
    release.resolve();
    expect((await outcome).message).toContain('captured');
    expect(await db.payment.findUniqueOrThrow({ where: { id: first.paymentId } })).toMatchObject({
      status: 'SUCCESS',
    });
    expect(
      await db.subscription.findUniqueOrThrow({ where: { id: first.subscriptionId } }),
    ).toMatchObject({ status: 'ACTIVE', autoRenew: false });
    expect(await access.hasActiveSubscription(userId)).toBe(true);
    await expect(pricing.failPayment(userId, first.paymentId)).rejects.toThrow();
  });

  it('does not overwrite capture with a stale authorized verification response', async () => {
    const first = await buy();
    const entered = deferred();
    const release = deferred();
    gateway.fetchPayment.mockImplementationOnce(async (paymentId: string) => {
      entered.resolve();
      await release.promise;
      return {
        id: paymentId,
        subscription_id: first.razorpaySubscriptionId,
        amount: 49900,
        currency: 'INR',
        status: 'authorized',
        captured: false,
      };
    });
    const pending = pricing.verifySubscriptionPayment(userId, {
      paymentId: first.paymentId,
      razorpay_subscription_id: first.razorpaySubscriptionId,
      razorpay_payment_id: 'pay_pending',
      razorpay_signature: 'test',
    });
    await entered.promise;
    await webhooks.handleWebhook(event(first));
    release.resolve();
    expect(await pending).toMatchObject({ status: 'SUCCESS' });
    expect((await db.payment.findUniqueOrThrow({ where: { id: first.paymentId } })).status).toBe(
      'SUCCESS',
    );
  });

  it('rejects stale capture verification after cancellation wins the database lock', async () => {
    const first = await buy();
    const entered = deferred();
    const release = deferred();
    gateway.fetchPayment.mockImplementationOnce(async (paymentId: string) => {
      entered.resolve();
      await release.promise;
      return {
        id: paymentId,
        subscription_id: first.razorpaySubscriptionId,
        amount: 49900,
        currency: 'INR',
        status: 'captured',
        captured: true,
      };
    });
    const pending = verify(first).catch((error) => error);
    await entered.promise;
    await pricing.failPayment(userId, first.paymentId);
    release.resolve();
    expect((await pending).message).toContain('reconciliation');
    expect(await access.hasActiveSubscription(userId)).toBe(false);
  });

  it('keeps retry blocked if Razorpay reports a capture before its webhook', async () => {
    const first = await buy();
    remotes.get(first.razorpaySubscriptionId).paid_count = 1;
    await expect(pricing.failPayment(userId, first.paymentId)).rejects.toThrow('captured');
    await expect(buy()).rejects.toThrow('active AutoPay');
    await webhooks.handleWebhook(event(first));
    expect(await access.hasActiveSubscription(userId)).toBe(true);
  });

  it('deduplicates concurrent charge events and preserves access on stale failure/lifecycle events', async () => {
    const first = await buy();
    const charge = event(first);
    await Promise.all([
      webhooks.handleWebhook(charge),
      webhooks.handleWebhook({ ...charge, id: randomUUID() }),
    ]);
    expect(
      await db.payment.count({
        where: { subscriptionId: first.subscriptionId, status: 'SUCCESS' },
      }),
    ).toBe(1);
    const end = (await db.subscription.findUniqueOrThrow({ where: { id: first.subscriptionId } }))
      .endDate;
    for (const type of [
      'subscription.payment_failed',
      'subscription.pending',
      'subscription.authenticated',
      'subscription.activated',
      'subscription.cancelled',
      'subscription.completed',
      'subscription.expired',
    ]) {
      await webhooks.handleWebhook({ ...charge, id: randomUUID(), event: type });
    }
    expect(await access.hasActiveSubscription(userId)).toBe(true);
    expect(
      (await db.subscription.findUniqueOrThrow({ where: { id: first.subscriptionId } })).endDate,
    ).toEqual(end);
  });

  it('processes renewals out of order without double-extending or shortening access', async () => {
    const first = await buy();
    const later = event(first, 'subscription.charged', 'pay_later_' + randomUUID(), 3);
    await webhooks.handleWebhook(later);
    const end = (await db.subscription.findUniqueOrThrow({ where: { id: first.subscriptionId } }))
      .endDate;
    await webhooks.handleWebhook(
      event(first, 'subscription.charged', 'pay_earlier_' + randomUUID(), 2),
    );
    await webhooks.handleWebhook({ ...later, id: randomUUID() });
    expect(
      (await db.subscription.findUniqueOrThrow({ where: { id: first.subscriptionId } })).endDate,
    ).toEqual(end);
    expect(
      await db.payment.count({
        where: { subscriptionId: first.subscriptionId, status: 'SUCCESS' },
      }),
    ).toBe(2);
  });

  it('retries a failed webhook after remote cleanup failure', async () => {
    const first = await buy();
    const failure = event(first, 'subscription.payment_failed');
    gateway.cancelSubscription.mockRejectedValueOnce(new Error('temporary error'));
    await expect(webhooks.handleWebhook(failure)).rejects.toThrow('cleanup is pending');
    expect(await db.webhookEvent.findUnique({ where: { eventId: failure.id } })).toBeNull();
    await webhooks.handleWebhook(failure);
    expect((await buy()).recurring).toBe(true);
  });

  it('never grants access from authenticated, activated without capture, or client-only confirmation', async () => {
    const first = await buy();
    await webhooks.handleWebhook(event(first, 'subscription.authenticated'));
    const activation = event(first, 'subscription.activated');
    delete activation.payload.payment;
    await webhooks.handleWebhook(activation);
    await expect(pricing.confirmPurchase(userId, { paymentId: first.paymentId })).rejects.toThrow(
      'captured',
    );
    expect(await access.hasActiveSubscription(userId)).toBe(false);
  });

  it('repairs an already-failed session with an incompletely cleaned pending subscription', async () => {
    const first = await buy();
    await db.payment.update({ where: { id: first.paymentId }, data: { status: 'FAILED' } });
    await pricing.failPayment(userId, first.paymentId);
    await pricing.failPayment(userId, first.paymentId);
    expect((await buy()).recurring).toBe(true);
  });

  it('database uniqueness rejects concurrent creation and cancels the losing remote subscription', async () => {
    const bothRead = deferred();
    let reads = 0;
    const originalFind = db.webhookEvent.findFirst.bind(db.webhookEvent);
    const find = (jest.spyOn(db.webhookEvent, 'findFirst') as jest.SpyInstance).mockImplementation(
      async (args: any) => {
        const found = await originalFind(args);
        if (++reads === 2) bothRead.resolve();
        await bothRead.promise;
        return found;
      },
    );
    const bothEntered = deferred();
    let count = 0;
    const original = gateway.createSubscription.getMockImplementation();
    gateway.createSubscription.mockImplementation(async (options: any) => {
      if (++count === 2) bothEntered.resolve();
      await bothEntered.promise;
      return original(options);
    });
    const results = await Promise.allSettled([buy(), buy()]);
    find.mockRestore();
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(
      await db.subscription.count({
        where: { userId, planId, status: 'PENDING', autoRenew: true },
      }),
    ).toBe(1);
    expect([...remotes.values()].filter((s) => s.status === 'cancelled')).toHaveLength(1);
    expect(await db.payment.count({ where: { userId } })).toBe(1);
  });

  it('persists and reconciles losing creation cleanup failure before allowing future purchases', async () => {
    // Simulate a local transaction rollback after the gateway created a subscription.
    const create = jest
      .spyOn(db, '$transaction')
      .mockRejectedValueOnce(new Error('transaction unavailable'));
    gateway.cancelSubscription.mockRejectedValueOnce(new Error('gateway unavailable'));
    await expect(buy()).rejects.toThrow('cleanup failed');
    create.mockRestore();
    await expect(buy()).rejects.toThrow('earlier AutoPay creation');
    const intent = await db.webhookEvent.findFirstOrThrow({
      where: {
        eventType: 'autopay.creation',
        processed: false,
        payload: { path: ['userId'], equals: userId },
      },
    });
    await db.webhookEvent.update({
      where: { id: intent.id },
      data: { createdAt: new Date(Date.now() - 3600000) },
    });
    expect(await reconcileAutoPayCleanup(db as any, gateway)).toContainEqual({
      id: intent.id,
      repaired: true,
    });
    expect((await buy()).recurring).toBe(true);
  });
  it('keeps terminal cancelled attempts terminal on a late captured webhook', async () => {
    const first = await buy();
    await pricing.failPayment(userId, first.paymentId);
    await expect(webhooks.handleWebhook(event(first))).rejects.toThrow('reconciliation required');
    expect(await access.hasActiveSubscription(userId)).toBe(false);
    expect(
      (await db.subscription.findUniqueOrThrow({ where: { id: first.subscriptionId } })).status,
    ).toBe('CANCELLED');
  });

  it('repairs cleanup after remote cancellation succeeded but the final local transaction failed', async () => {
    const first = await buy();
    const original = db.$transaction.bind(db);
    const spy = jest.spyOn(db, '$transaction');
    spy
      .mockImplementationOnce(original as any)
      .mockRejectedValueOnce(new Error('local write failed'));
    await expect(pricing.failPayment(userId, first.paymentId)).rejects.toThrow(
      'local write failed',
    );
    spy.mockRestore();
    expect(remotes.get(first.razorpaySubscriptionId).status).toBe('cancelled');
    await expect(buy()).rejects.toThrow('active AutoPay');
    await pricing.failPayment(userId, first.paymentId);
    expect((await buy()).recurring).toBe(true);
  });

  it('blocks ambiguous gateway creation timeouts and reports manual reconciliation when the remote ID is unknown', async () => {
    gateway.createSubscription.mockRejectedValueOnce(new Error('gateway timeout'));
    await expect(buy()).rejects.toThrow('gateway timeout');
    await expect(buy()).rejects.toThrow('earlier AutoPay creation');
    const intent = await db.webhookEvent.findFirstOrThrow({
      where: {
        eventType: 'autopay.creation',
        processed: false,
        payload: { path: ['userId'], equals: userId },
      },
    });
    await db.webhookEvent.update({
      where: { id: intent.id },
      data: { createdAt: new Date(Date.now() - 3600000) },
    });
    expect(await reconcileAutoPayCleanup(db as any, gateway)).toContainEqual({
      id: intent.id,
      repaired: false,
      error: expect.stringContaining('operator must locate'),
    });
    await expect(buy()).rejects.toThrow('earlier AutoPay creation');
  });

  it('does not fail or activate a refunded payment on repeated client requests', async () => {
    const first = await buy();
    await db.payment.update({ where: { id: first.paymentId }, data: { status: 'REFUNDED' } });
    await expect(pricing.failPayment(userId, first.paymentId)).rejects.toThrow('current state');
    await expect(verify(first)).rejects.toThrow('current state');
    expect(await access.hasActiveSubscription(userId)).toBe(false);
  });

  it('never mutates state on invalid signatures, including a stale request after capture', async () => {
    const first = await buy();
    gateway.verifySubscriptionSignature.mockReturnValueOnce(false);
    await expect(verify(first)).rejects.toThrow('signature');
    expect((await db.payment.findUniqueOrThrow({ where: { id: first.paymentId } })).status).toBe(
      'CREATED',
    );
    await verify(first);
    gateway.verifySubscriptionSignature.mockReturnValueOnce(false);
    expect(await verify(first)).toMatchObject({ status: 'SUCCESS' });
    expect(await access.hasActiveSubscription(userId)).toBe(true);
  });
  it('preserves refunded payment history when a stale captured webhook is delivered', async () => {
    const first = await buy();
    const charge = event(first);
    await webhooks.handleWebhook(charge);
    await db.payment.update({
      where: { razorpayPaymentId: charge.payload.payment.entity.id },
      data: { status: 'REFUNDED' },
    });
    await webhooks.handleWebhook({ ...charge, id: randomUUID() });
    expect(
      (
        await db.payment.findUniqueOrThrow({
          where: { razorpayPaymentId: charge.payload.payment.entity.id },
        })
      ).status,
    ).toBe('REFUNDED');
  });

  it('user cancellation preserves paid-through access and surfaces gateway failure for retry', async () => {
    const first = await buy();
    await verify(first);
    const users = new UserSubscriptionsService(db as any, access, gateway);
    gateway.cancelSubscription.mockRejectedValueOnce(new Error('gateway unavailable'));
    await expect(users.cancelSubscription(userId, first.subscriptionId)).rejects.toThrow(
      'gateway unavailable',
    );
    expect(
      (await db.subscription.findUniqueOrThrow({ where: { id: first.subscriptionId } })).autoRenew,
    ).toBe(true);
    await users.cancelSubscription(userId, first.subscriptionId);
    await users.cancelSubscription(userId, first.subscriptionId);
    expect(await access.hasActiveSubscription(userId)).toBe(true);
    expect(
      (await db.subscription.findUniqueOrThrow({ where: { id: first.subscriptionId } })).autoRenew,
    ).toBe(false);
    expect(gateway.cancelSubscription).toHaveBeenCalledTimes(2);
  });
  it('keeps the original checkout session successful when capture wins initial failure cleanup', async () => {
    const first = await buy();
    const failure = event(first, 'subscription.payment_failed');
    const entered = deferred();
    const release = deferred();
    gateway.cancelSubscription.mockImplementationOnce(async (id: string) => {
      entered.resolve();
      await release.promise;
      remotes.get(id).status = 'cancelled';
    });
    const processing = webhooks.handleWebhook(failure);
    await entered.promise;
    await webhooks.handleWebhook(
      event(first, 'subscription.charged', failure.payload.payment.entity.id),
    );
    remotes.get(first.razorpaySubscriptionId).paid_count = 1;
    release.resolve();
    await processing;
    expect((await pricing.getPaymentSession(userId, first.paymentId)).status).toBe('SUCCESS');
    expect(
      await db.payment.count({
        where: { subscriptionId: first.subscriptionId, status: 'SUCCESS' },
      }),
    ).toBe(1);
    expect(await access.hasActiveSubscription(userId)).toBe(true);
  });
  async function oneTime() {
    const purchase = (await pricing.purchase(userId, { planId, vaultId, recurring: false })) as any;
    const paymentId = `pay_${randomUUID()}`;
    gatewayPayments.set(paymentId, {
      id: paymentId,
      order_id: purchase.orderId,
      amount: 49900,
      currency: 'INR',
      status: 'captured',
      captured: true,
    });
    return {
      purchase,
      dto: {
        paymentId: purchase.paymentId,
        razorpay_payment_id: paymentId,
        razorpay_order_id: purchase.orderId,
        razorpay_signature: 'test',
      },
    };
  }

  it('deduplicates concurrent one-time verification and commits one entitlement', async () => {
    const { purchase, dto } = await oneTime();
    await Promise.all([pricing.verifyPayment(userId, dto), pricing.verifyPayment(userId, dto)]);
    expect(await db.subscription.count({ where: { userId } })).toBe(1);
    expect((await pricing.getPaymentSession(userId, purchase.paymentId)).status).toBe('SUCCESS');
    expect(await access.hasActiveSubscription(userId)).toBe(true);
  });

  it('rolls back one-time entitlement when a later transaction statement fails', async () => {
    const { purchase, dto } = await oneTime();
    // Force an actual PostgreSQL statement failure after creating the snapshot.
    const original = access.createSubscriptionWithSnapshot.bind(access);
    const snapshot = jest
      .spyOn(access, 'createSubscriptionWithSnapshot')
      .mockImplementation(async (...args) => {
        const created = await original(...args);
        await args[3]!.$executeRawUnsafe('SELECT 1 / 0');
        return created;
      });
    await expect(pricing.verifyPayment(userId, dto)).rejects.toThrow();
    snapshot.mockRestore();
    expect(await db.subscription.count({ where: { userId } })).toBe(0);
    expect((await pricing.getPaymentSession(userId, purchase.paymentId)).status).toBe('CREATED');
  });

  it('rejects one-time capture verification when cancellation has already committed', async () => {
    const { purchase, dto } = await oneTime();
    const entered = deferred();
    const release = deferred();
    const remote = gatewayPayments.get(dto.razorpay_payment_id);
    gateway.fetchPayment.mockImplementationOnce(async () => {
      entered.resolve();
      await release.promise;
      return remote;
    });
    const verifying = pricing.verifyPayment(userId, dto).catch((error) => error);
    await entered.promise;
    await pricing.failPayment(userId, purchase.paymentId);
    release.resolve();
    expect((await verifying).message).toContain('no longer eligible');
    expect(await access.hasActiveSubscription(userId)).toBe(false);
  });

  it('rejects one-time payment with mismatched captured amount', async () => {
    const { dto } = await oneTime();
    gatewayPayments.get(dto.razorpay_payment_id).amount = 1;
    await expect(pricing.verifyPayment(userId, dto)).rejects.toThrow('matching captured payment');
    expect(await access.hasActiveSubscription(userId)).toBe(false);
  });
  async function contractPurchase(exactLocalIds = false) {
    await db.subscriptionPlan.update({ where: { id: planId }, data: { price: 299 } });
    const first = await buy();
    const previousId = first.razorpaySubscriptionId;
    // Only the incident reproduction uses exact IDs; other cases keep unique
    // gateway IDs so test cases do not share records in this real database.
    if (exactLocalIds) {
      const localSub = await db.subscription.update({
        where: { id: first.subscriptionId },
        data: {
          id: 'c995fb7c-9270-48ed-9589-9f1f7f5afdd8',
          razorpaySubscriptionId: 'sub_TsRCS4prgPP799',
        },
      });
      const localPayment = await db.payment.update({
        where: { id: first.paymentId },
        data: {
          id: 'eac11fec-804f-4304-8611-e09ce43ae825',
          razorpaySubscriptionId: 'sub_TsRCS4prgPP799',
        },
      });
      first.subscriptionId = localSub.id;
      first.paymentId = localPayment.id;
      first.razorpaySubscriptionId = localSub.razorpaySubscriptionId;
      remotes.set(first.razorpaySubscriptionId, {
        ...remotes.get(previousId),
        id: first.razorpaySubscriptionId,
      });
    }
    const charge = subscriptionContractEvent(
      'subscription.charged',
      remotes.get(first.razorpaySubscriptionId).plan_id,
      userId,
      planId,
    ) as any;
    charge.payload.subscription.entity.id = first.razorpaySubscriptionId;
    if (!exactLocalIds) {
      charge.payload.payment.entity.id = `pay_${randomUUID()}`;
      charge.payload.payment.entity.order_id = `order_${randomUUID()}`;
      charge.payload.payment.entity.invoice_id = `inv_${randomUUID()}`;
    }
    return { first, charge };
  }

  it('reproduces the reported IDs/299 INR and processes charged + activated + stale cancelled atomically', async () => {
    const { first, charge } = await contractPurchase(true);
    expect(charge.payload.payment.entity).not.toHaveProperty('subscription_id');
    expect((await db.payment.findUniqueOrThrow({ where: { id: first.paymentId } })).status).toBe(
      'CREATED',
    );
    await webhooks.handleWebhook(charge);
    const afterCharge = await db.payment.findUniqueOrThrow({ where: { id: first.paymentId } });
    expect(afterCharge).toMatchObject({
      status: 'SUCCESS',
      razorpayPaymentId: 'pay_TsRCfsR92Wl5Wq',
      webhookEvent: 'subscription.charged',
    });
    expect(Number(afterCharge.amount)).toBe(299);
    await webhooks.handleWebhook({ ...charge, event: 'subscription.activated' });
    const end = (await db.subscription.findUniqueOrThrow({ where: { id: first.subscriptionId } }))
      .endDate;
    const cancelled = {
      ...charge,
      event: 'subscription.cancelled',
      payload: {
        ...charge.payload,
        subscription: { entity: { ...charge.payload.subscription.entity, status: 'cancelled' } },
      },
    };
    await webhooks.handleWebhook(cancelled);
    await webhooks.handleWebhook(cancelled);
    expect(
      await db.subscription.findUniqueOrThrow({ where: { id: first.subscriptionId } }),
    ).toMatchObject({ status: 'ACTIVE', autoRenew: false, endDate: end });
    expect(await access.hasActiveSubscription(userId)).toBe(true);
    expect(await db.payment.count({ where: { subscriptionId: first.subscriptionId } })).toBe(1);
    expect(
      await db.webhookEvent.count({
        where: {
          eventType: {
            in: ['subscription.charged', 'subscription.activated', 'subscription.cancelled'],
          },
          payload: { path: ['payload', 'payment', 'entity', 'id'], equals: 'pay_TsRCfsR92Wl5Wq' },
          processed: true,
        },
      }),
    ).toBe(3);
    expect(gateway.cancelSubscription).not.toHaveBeenCalled();
  });

  it.each([true, 1, '1'])(
    'processes activated with captured=%s without requiring payment.subscription_id',
    async (captured) => {
      const { first, charge } = await contractPurchase();
      charge.event = 'subscription.activated';
      charge.payload.payment.entity.captured = captured;
      await webhooks.handleWebhook(charge);
      expect((await pricing.getPaymentSession(userId, first.paymentId)).status).toBe('SUCCESS');
      expect(await access.hasActiveSubscription(userId)).toBe(true);
    },
  );

  it('acknowledges cancellation before capture reconciliation without granting or releasing an unpaid replacement', async () => {
    const { first, charge } = await contractPurchase();
    const cancelled = { ...charge, event: 'subscription.cancelled' };
    await webhooks.handleWebhook(cancelled);
    await webhooks.handleWebhook({ ...cancelled, id: randomUUID() });
    expect((await pricing.getPaymentSession(userId, first.paymentId)).status).toBe('CREATED');
    expect(await access.hasActiveSubscription(userId)).toBe(false);
    await expect(buy()).rejects.toThrow('active AutoPay');
    await webhooks.handleWebhook(charge);
    expect(
      await db.subscription.findUniqueOrThrow({ where: { id: first.subscriptionId } }),
    ).toMatchObject({ status: 'ACTIVE', autoRenew: false });
    expect(gateway.cancelSubscription).not.toHaveBeenCalled();
  });

  it('acknowledges cancellation when its payload says unpaid but the gateway already knows about capture', async () => {
    const { first, charge } = await contractPurchase();
    remotes.get(first.razorpaySubscriptionId).paid_count = 1;
    remotes.get(first.razorpaySubscriptionId).status = 'cancelled';
    const cancelled = {
      ...charge,
      event: 'subscription.cancelled',
      payload: {
        subscription: { entity: { ...charge.payload.subscription.entity, paid_count: 0 } },
      },
    };
    await webhooks.handleWebhook(cancelled);
    expect(await access.hasActiveSubscription(userId)).toBe(false);
    await webhooks.handleWebhook(charge);
    expect(
      await db.subscription.findUniqueOrThrow({ where: { id: first.subscriptionId } }),
    ).toMatchObject({ status: 'ACTIVE', autoRenew: false });
  });

  it.each([
    'user',
    'plan',
    'amount',
    'currency',
    'subscription',
    'local_user',
    'local_plan',
    'local_remote_id',
    'customer',
  ])(
    'rejects captured evidence with mismatched %s and does not mark the event processed',
    async (mismatch) => {
      const { first, charge } = await contractPurchase();
      if (mismatch === 'user') charge.payload.subscription.entity.notes.userId = 'another_user';
      if (mismatch === 'plan') charge.payload.subscription.entity.plan_id = 'another_plan';
      if (mismatch === 'amount') charge.payload.payment.entity.amount = 1;
      if (mismatch === 'currency') charge.payload.payment.entity.currency = 'USD';
      if (mismatch === 'subscription') charge.payload.payment.entity.subscription_id = 'sub_other';
      if (mismatch === 'customer') charge.payload.payment.entity.customer_id = 'cust_other';
      if (mismatch === 'local_user') {
        const other = await db.user.create({ data: { email: `${randomUUID()}@autopay.test` } });
        await db.payment.update({ where: { id: first.paymentId }, data: { userId: other.id } });
      }
      if (mismatch === 'local_plan')
        await db.payment.update({
          where: { id: first.paymentId },
          data: { metadata: { planId: 'wrong' } },
        });
      if (mismatch === 'local_remote_id')
        await db.payment.update({
          where: { id: first.paymentId },
          data: { razorpaySubscriptionId: 'sub_wrong' },
        });
      await expect(webhooks.handleWebhook(charge)).rejects.toThrow();
      expect(await access.hasActiveSubscription(userId)).toBe(false);
      expect((await db.payment.findUniqueOrThrow({ where: { id: first.paymentId } })).status).toBe(
        'CREATED',
      );
      expect(
        await db.webhookEvent.count({
          where: {
            payload: {
              path: ['payload', 'payment', 'entity', 'id'],
              equals: charge.payload.payment.entity.id,
            },
            processed: true,
          },
        }),
      ).toBe(0);
    },
  );

  it('rolls back capture and releases its receipt when entitlement activation fails', async () => {
    const { first, charge } = await contractPurchase();
    await db.subscription.update({
      where: { id: first.subscriptionId },
      data: { cancellationReason: 'autopay_test_fail_activation' },
    });
    await db.$executeRawUnsafe(`CREATE FUNCTION autopay_test_fail_activation() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'activation database failure'; END $$`);
    await db.$executeRawUnsafe(`CREATE TRIGGER autopay_test_fail_activation BEFORE UPDATE ON "Subscription"
      FOR EACH ROW WHEN (OLD."cancellationReason" = 'autopay_test_fail_activation' AND NEW."status" = 'ACTIVE')
      EXECUTE FUNCTION autopay_test_fail_activation()`);
    try {
      await expect(webhooks.handleWebhook(charge)).rejects.toThrow('activation database failure');
    } finally {
      await db.$executeRawUnsafe('DROP TRIGGER autopay_test_fail_activation ON "Subscription"');
      await db.$executeRawUnsafe('DROP FUNCTION autopay_test_fail_activation()');
    }
    expect((await db.payment.findUniqueOrThrow({ where: { id: first.paymentId } })).status).toBe(
      'CREATED',
    );
    expect(
      (await db.subscription.findUniqueOrThrow({ where: { id: first.subscriptionId } })).status,
    ).toBe('PENDING');
    await webhooks.handleWebhook(charge);
    expect((await pricing.getPaymentSession(userId, first.paymentId)).status).toBe('SUCCESS');
  });

  it('checkout HMAC verification accepts the documented fetched-payment shape without subscription_id', async () => {
    const { first, charge } = await contractPurchase();
    gatewayPayments.set(charge.payload.payment.entity.id, charge.payload.payment.entity);
    const result = await pricing.verifySubscriptionPayment(userId, {
      paymentId: first.paymentId,
      razorpay_payment_id: charge.payload.payment.entity.id,
      razorpay_subscription_id: first.razorpaySubscriptionId,
      razorpay_signature: 'test',
    });
    expect(result).toMatchObject({ status: 'SUCCESS' });
    expect(await access.hasActiveSubscription(userId)).toBe(true);
  });

  it('gateway-verified reconciliation dry-runs, then repairs old processed=true receipts idempotently', async () => {
    const { first, charge } = await contractPurchase();
    const payment = charge.payload.payment.entity;
    for (const eventType of ['subscription.charged', 'subscription.activated']) {
      await db.webhookEvent.create({
        data: {
          eventId: `old_${eventType}_${payment.id}`,
          eventType,
          payload: { ...charge, event: eventType },
          processed: true,
        },
      });
    }
    gatewayPayments.set(payment.id, payment);
    remotes.set(first.razorpaySubscriptionId, {
      ...charge.payload.subscription.entity,
      status: 'cancelled',
    });
    gateway.fetchInvoice = jest.fn().mockResolvedValue({
      id: payment.invoice_id,
      payment_id: payment.id,
      subscription_id: first.razorpaySubscriptionId,
      order_id: payment.order_id,
    });
    expect(await webhooks.reconcileCapturedPayment(first.paymentId, payment.id)).toMatchObject({
      applied: false,
    });
    expect((await pricing.getPaymentSession(userId, first.paymentId)).status).toBe('CREATED');
    gateway.fetchInvoice.mockResolvedValueOnce({
      id: payment.invoice_id,
      payment_id: 'pay_wrong',
      subscription_id: first.razorpaySubscriptionId,
    });
    await expect(
      webhooks.reconcileCapturedPayment(first.paymentId, payment.id, true),
    ).rejects.toThrow('invoice');
    expect((await pricing.getPaymentSession(userId, first.paymentId)).status).toBe('CREATED');
    await webhooks.reconcileCapturedPayment(first.paymentId, payment.id, true);
    await webhooks.reconcileCapturedPayment(first.paymentId, payment.id, true);
    expect(
      (await db.subscription.findUniqueOrThrow({ where: { id: first.subscriptionId } })).autoRenew,
    ).toBe(false);
    expect((await pricing.getPaymentSession(userId, first.paymentId)).status).toBe('SUCCESS');
    expect(await db.payment.count({ where: { subscriptionId: first.subscriptionId } })).toBe(1);
    expect(await access.hasActiveSubscription(userId)).toBe(true);
    expect(
      await db.webhookEvent.count({
        where: { eventId: { startsWith: 'old_', endsWith: payment.id }, processed: true },
      }),
    ).toBe(2);
  });
  it.each([false, 0, '0', 'false', 'true'])(
    'does not treat captured=%s as captured evidence',
    async (captured) => {
      const { first, charge } = await contractPurchase();
      charge.payload.payment.entity.captured = captured;
      await expect(webhooks.handleWebhook(charge)).rejects.toThrow('Non-captured');
      expect((await pricing.getPaymentSession(userId, first.paymentId)).status).toBe('CREATED');
      expect(await access.hasActiveSubscription(userId)).toBe(false);
    },
  );

  it('refuses multiple initial checkout sessions instead of marking an arbitrary one successful', async () => {
    const { first, charge } = await contractPurchase();
    await db.payment.create({
      data: {
        userId,
        subscriptionId: first.subscriptionId,
        razorpaySubscriptionId: first.razorpaySubscriptionId,
        amount: 299,
        currency: 'INR',
        status: 'CREATED',
        metadata: { planId },
      },
    });
    await expect(webhooks.handleWebhook(charge)).rejects.toThrow('Multiple initial checkout');
    expect(
      await db.payment.count({
        where: { subscriptionId: first.subscriptionId, status: 'SUCCESS' },
      }),
    ).toBe(0);
  });
  it('does not acknowledge a captured event lacking a gateway payment ID', async () => {
    const { first, charge } = await contractPurchase();
    delete charge.payload.payment.entity.id;
    await expect(webhooks.handleWebhook(charge)).rejects.toThrow('Non-captured');
    expect((await pricing.getPaymentSession(userId, first.paymentId)).status).toBe('CREATED');
  });
});
