const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/lib/checkout-retry.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
});
const loaded = { exports: {} };
new Function('exports', 'module', compiled.outputText)(loaded.exports, loaded);
const { retryCheckout } = loaded.exports;
const session = { paymentId: 'old', planId: 'plan', vaultId: 'vault', recurring: true };

test('awaits cleanup before creating a fresh AutoPay session', async () => {
  let finish;
  const cleanup = new Promise((resolve) => {
    finish = resolve;
  });
  const calls = [];
  const retry = retryCheckout(session, {
    failPayment: async (id) => {
      calls.push(['fail', id]);
      await cleanup;
      return { status: 'FAILED' };
    },
    purchasePlan: async (...args) => {
      calls.push(['purchase', ...args]);
      return { paymentId: 'new', recurring: true };
    },
  });
  await Promise.resolve();
  assert.deepEqual(calls, [['fail', 'old']]);
  finish();
  assert.deepEqual(await retry, { paymentId: 'new', recurring: true });
  assert.deepEqual(calls[1], ['purchase', 'plan', 'vault', undefined, true]);
});

test('blocks a fresh purchase on cleanup failure, including a lost response', async () => {
  let purchased = false;
  await assert.rejects(
    retryCheckout(session, {
      failPayment: async () => {
        throw new Error('cleanup pending');
      },
      purchasePlan: async () => {
        purchased = true;
      },
    }),
    /cleanup pending/,
  );
  assert.equal(purchased, false);
});

test('preserves AutoPay from the gateway subscription when recurring flag is absent', async () => {
  let args;
  await retryCheckout(
    { ...session, recurring: undefined, razorpaySubscriptionId: 'sub_old' },
    {
      failPayment: async () => ({ status: 'FAILED' }),
      purchasePlan: async (...received) => {
        args = received;
      },
    },
  );
  assert.equal(args[3], true);
});

test('preserves one-time checkout and coupon details', async () => {
  let args;
  await retryCheckout(
    { ...session, recurring: false, couponCode: 'SAVE' },
    {
      failPayment: async () => ({ status: 'FAILED' }),
      purchasePlan: async (...received) => {
        args = received;
      },
    },
  );
  assert.deepEqual(args, ['plan', 'vault', 'SAVE', false]);
});

test('does not start a new purchase when cancellation returns an unexpected payment status', async () => {
  let purchased = false;
  await assert.rejects(
    retryCheckout(session, {
      failPayment: async () => ({ status: 'SUCCESS' }),
      purchasePlan: async () => {
        purchased = true;
      },
    }),
    /not confirmed/,
  );
  assert.equal(purchased, false);
});
