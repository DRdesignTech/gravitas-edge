const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Execute the real page's effects and event handlers with controlled hook/API
// dependencies. This is not a browser or Razorpay integration test.
const source = fs.readFileSync(
  path.join(__dirname, '../src/app/checkout/[paymentId]/page.tsx'), 'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const session = { paymentId: 'payment', planId: 'plan', status: 'CREATED',
  orderId: 'order', keyId: 'key', currency: 'INR', finalAmount: 499, originalAmount: 499 };

function harness({ returnTo = '', checkout = false, fetchSession = async () => session,
  verify = async () => ({}), recurring = false } = {}) {
  const redirects = []; const phases = []; const effects = [];
  let options; let stateIndex = 0;
  const modules = {
    react: {
      useRef: (value) => ({ current: value }),
      useState: (initial) => {
        const index = stateIndex++;
        const value = checkout && index === 0 ? { ...session, recurring, razorpaySubscriptionId: recurring ? 'sub' : undefined }
          : checkout && index === 1 ? false : initial;
        return [value, (next) => { if (index === 3) phases.push(next); }];
      },
      useEffect: (effect) => effects.push(effect),
    },
    'react/jsx-runtime': require('react/jsx-runtime'),
    'next/link': { default: 'Link' },
    'next/navigation': {
      useRouter: () => ({ replace: (route) => redirects.push(route) }),
      useParams: () => ({ paymentId: 'payment' }),
      useSearchParams: () => new Map([['returnTo', returnTo]]),
    },
    '@/lib/auth': { useAuth: () => ({ refreshAccess: async () => {} }) },
    '@/lib/services': { fetchPaymentSession: fetchSession, verifyPayment: verify,
      verifySubscriptionPayment: verify, failPayment: async () => { throw new Error('capture race'); } },
    '@/lib/checkout-retry': { cancelCheckout: async (_id, fail) => fail(), retryCheckout: async () => {} },
    '@/lib/format': { formatMoney: String },
    '@/lib/errors': { getErrorMessage: (error) => error.message },
    '@/components/ui': { Button: 'Button', Skeleton: 'Skeleton', Input: 'Input', Card: 'Card', Badge: 'Badge' },
  };
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', 'window', 'setTimeout', compiled)(
    (id) => { assert.ok(id in modules, `Unexpected dependency: ${id}`); return modules[id]; },
    loaded, loaded.exports,
    { Razorpay: class { constructor(value) { options = value; } open() {} } },
    (callback) => callback(),
  );
  const element = loaded.exports.default();
  const tree = element.type(element.props);
  function findPay(node) {
    if (!node || typeof node !== 'object') return;
    if (node.props?.onClick?.name === 'pay') return node.props.onClick;
    const children = node.props?.children;
    for (const child of Array.isArray(children) ? children.flat(Infinity) : [children]) {
      const found = findPay(child); if (found) return found;
    }
  }
  return { redirects, phases, load: effects[0], async open() {
    const pay = findPay(tree); assert.ok(pay, 'Checkout pay button exists');
    await pay(); assert.ok(options, 'Razorpay options created'); return options;
  } };
}
const flush = () => new Promise(setImmediate);

for (const destination of ['', '/vaults/remote']) {
  test(`page-load SUCCESS redirects once to ${destination || '/dashboard'}`, async () => {
    const h = harness({ returnTo: destination, fetchSession: async () => ({ ...session, status: 'SUCCESS' }) });
    h.load(); h.load(); // React effect replay must not duplicate navigation.
    await flush();
    assert.deepEqual(h.redirects, [destination || '/dashboard']);
  });
  test(`dismissal recovery SUCCESS redirects to ${destination || '/dashboard'}`, async () => {
    const h = harness({ checkout: true, returnTo: destination,
      fetchSession: async () => ({ ...session, status: 'SUCCESS' }) });
    const options = await h.open();
    assert.deepEqual(h.redirects, []);
    await options.modal.ondismiss();
    assert.deepEqual(h.redirects, [destination || '/dashboard']);
  });
}

for (const status of ['PENDING', 'FAILED', 'CREATED']) {
  test(`${status} server responses never redirect on load or dismissal recovery`, async () => {
    const h = harness({ checkout: true, fetchSession: async () => ({ ...session, status }) });
    h.load(); await flush();
    const options = await h.open(); await options.modal.ondismiss();
    assert.deepEqual(h.redirects, []);
  });
}

test('server request failures do not redirect', async () => {
  const h = harness({ checkout: true, fetchSession: async () => { throw new Error('offline'); } });
  h.load(); await flush();
  const options = await h.open(); await options.modal.ondismiss();
  assert.deepEqual(h.redirects, []);
});

test('verification failure does not redirect and dismissal cannot bypass it', async () => {
  const h = harness({ checkout: true, verify: async () => { throw new Error('verification failed'); } });
  const options = await h.open();
  await options.handler({ razorpay_order_id: 'order', razorpay_signature: 'signature' });
  await options.modal.ondismiss();
  assert.deepEqual(h.redirects, []);
  assert.ok(h.phases.includes('failure'));
});

test('success handler racing with dismissal recovery redirects only once', async () => {
  let resolve;
  const status = new Promise((done) => { resolve = done; });
  const h = harness({ checkout: true, fetchSession: () => status });
  const options = await h.open();
  const dismissal = options.modal.ondismiss();
  await flush();
  await options.handler({ razorpay_order_id: 'order', razorpay_signature: 'signature' });
  resolve({ ...session, status: 'SUCCESS' });
  await dismissal;
  assert.deepEqual(h.redirects, ['/dashboard']);
});

test('AutoPay polling and page-load success share the single redirect guard', async () => {
  const h = harness({ checkout: true, recurring: true, verify: async () => ({ status: 'PENDING' }),
    fetchSession: async () => ({ ...session, status: 'SUCCESS' }) });
  const options = await h.open();
  await options.handler({ razorpay_subscription_id: 'sub', razorpay_signature: 'signature' });
  h.load(); await flush();
  assert.deepEqual(h.redirects, ['/dashboard']);
});
