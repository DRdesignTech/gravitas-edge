# AutoPay checkout cancellation and retry

## Local behavior

A pending AutoPay attempt reserves its user/plan until gateway cancellation is
confirmed. Cleanup records `cancellationReason = 'AutoPay cleanup pending'` while
keeping `PENDING` and `autoRenew = true`. This intentionally continues to block a
replacement purchase. Gateway fetch/cancel/fetch calls happen outside database
transactions. A second transaction re-reads state under the subscription row lock,
fails outstanding checkout payments, and marks the unpaid subscription cancelled.
`AutoPay cleanup confirmed` makes repeated cleanup requests idempotent.

Capture verification, charged webhooks, and cleanup use the same subscription row
lock. A capture committed while cancellation is in flight keeps its SUCCESS payment
and ACTIVE paid-through entitlement. Confirmed remote cancellation disables future
renewal. If the gateway reports paid charges before the local capture is processed,
cleanup keeps the reservation and requires capture reconciliation. A capture that
arrives after confirmed terminal cleanup is rejected for operator reconciliation;
it cannot silently activate a second subscription.

Authenticated and pending events do not grant paid access. Activated events
only grant access when they include a captured payment that passes the same
binding, amount, and transaction checks as a charged event. Failure and mandate
lifecycle events do not revoke a paid-through ACTIVE entitlement. Charged events
require a captured payment, matching subscription, amount, and currency. Charge
idempotency uses the unique gateway payment ID under the subscription lock. Renewal
periods use the gateway period end, keeping the maximum recorded end date so late
or duplicate events cannot double-extend or shorten access.

A durable `WebhookEvent` with type `autopay.creation` is written before gateway
creation and marked processed in the local subscription/payment transaction.
An unresolved creation blocks another purchase for that user/plan. This covers
ambiguous gateway timeouts, local rollback, and failed cleanup of a losing concurrent
creation. It is an internal recovery record, not a received gateway webhook.

Checkout awaits cancellation, validates FAILED, and shows the retry screen. Retry
awaits cleanup again (including after a lost response), creates new identifiers, and
preserves the AutoPay flag. Reloading a session with cleanup pending also shows the
retry screen. No browser unload handler is relied upon for correctness.

The client-only `/subscriptions/purchase/confirm` path now refuses unpaid activation.
One-time verification also requires matching captured gateway payment evidence;
its payment, subscription snapshot, and coupon link are committed atomically.

## Reconciliation required before operating this unattended

`reconcileAutoPayCleanup(prisma, gateway)` is implemented in
`apps/api/src/payments/autopay-cleanup.ts`. It is not scheduled or exposed as a public
endpoint. Run it from an authenticated backend worker/operator context. The worker
must report unresolved items and retry transient failures; no production worker was
installed or executed as part of this change.

- Retry marked pending cleanup, and inspect/cancel unpaid pending sessions older
  than 30 minutes (including abandoned browsers). This 30-minute cutoff is an
  explicit checkout timeout policy and must be agreed before enabling a job.
- Retry unresolved creation records older than 30 minutes when a gateway ID is known.
- If creation timed out without returning an ID, locate the subscription in Razorpay
  using its user/plan notes. An operator must reconcile the record deliberately;
  the automated helper keeps it blocked and reports the ambiguity.
- If the gateway reports a paid charge, replay/repair captured-payment processing
  before deciding whether a replacement purchase is safe. Do not delete payment
  records or mark a paid attempt unpaid to release uniqueness.
- Late captured payments on terminal subscriptions require investigation/refund or
  deliberate entitlement reconciliation. The handler returns an error for retry;
  it does not grant access automatically.
- A process crash after claiming a received webhook can leave `processed = false`.
  An operator/worker must inspect and replay stale claims after ensuring the original
  delivery is no longer running. Internal `autopay.creation` records must be handled
  separately. Never indiscriminately mark all unprocessed events successful.

The distributed gateway/database operation is not one atomic transaction. Recovery
records and blocked retries make uncertainty visible; live gateway behavior still
requires a Razorpay test-mode checkout/webhook exercise before release. Browser UI
coverage here tests the retry/cancellation helper, not a real Checkout modal.

## Migration review and production precheck (read only)

The unmodified migration
`20261026110000_prevent_duplicate_active_autopay/migration.sql` adds uniqueness on
`(userId, planId)` only where `autoRenew = true` and status is PENDING or ACTIVE.
Dates, gateway IDs, and payment state do not change membership. Expired-by-date rows
still marked ACTIVE qualify. Terminal statuses and disabled auto-renewal are excluded.
This matches the rule of one live or unresolved AutoPay mandate per user/plan; paid
entitlement is checked separately.

The preliminary duplicate check raises an error without changing data. The index
also fails if a concurrent writer creates duplicates after that check. The migration
does not delete or repair subscriptions. It uses ordinary CREATE UNIQUE INDEX, so
writes can be blocked during index creation. It is not idempotent; a failed deployment
requires inspecting migration history before an operator decides how to recover.

There are 23 previously tracked migrations, including schema reconciliation at
20261026090000 and WebhookEvent at 20261026100000. The new additive migration sorts
after both and uses their existing columns. Earlier migration SQL is unchanged.
Actual production history, checksums, index state, and duplicates must be checked
read-only before release. This change does not apply the migration anywhere.

Run the following SELECT in a read-only production session; it is not executed by
this change. Zero rows means no duplicates at that snapshot, not a future guarantee.

```sql
BEGIN READ ONLY;
SELECT "userId", "planId", COUNT(*) AS duplicate_count,
       ARRAY_AGG("id" ORDER BY "id") AS subscription_ids
FROM "Subscription"
WHERE "autoRenew" = true
  AND "status" IN ('PENDING', 'ACTIVE')
GROUP BY "userId", "planId"
HAVING COUNT(*) > 1
ORDER BY "userId", "planId";
ROLLBACK;
```

## Local verification

With PostgreSQL command-line tools installed and local port 55439 free:

```sh
bash apps/api/test/run-autopay-local.sh
node --test apps/website/test/checkout-retry.test.cjs
./node_modules/.bin/tsc --noEmit --incremental false -p apps/api/tsconfig.json
./node_modules/.bin/tsc --noEmit --incremental false -p apps/website/tsconfig.json
npm run build:api
git diff --check
```

The script starts a disposable local PostgreSQL cluster, creates its schema from the
Prisma model, and adds a test fixture index with the business predicate. It never
executes the migration file or connects to an application database. The integration
suite refuses database URLs outside its fixed local test address. Gateway calls are
mocked; transaction, lock, rollback, and constraint behavior use real PostgreSQL.
