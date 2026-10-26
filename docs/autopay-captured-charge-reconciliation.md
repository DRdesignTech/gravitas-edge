# Captured AutoPay charge left pending: investigation and recovery plan

## Evidence boundaries

The repository was clean at `c389420a55d3f48988c909525de5963a79c6a113` when this
investigation began. Production deployment SHA, raw recorded webhook JSON, and
live gateway records were not supplied or independently accessed. The code defect
below is reproduced from that commit; matching it to the exact production payload
still requires inspecting the recorded fields. No production data has been repaired.

Reported identifiers:

- Gateway subscription: `sub_TsRCS4prgPP799`
- Gateway captured payment: `pay_TsRCfsR92Wl5Wq`, 29900 paise, INR
- Local subscription: `c995fb7c-9270-48ed-9589-9f1f7f5afdd8`
- Local checkout payment: `eac11fec-804f-4304-8611-e09ce43ae825`

## Reproduced code defects

The old charged handler returned early unless `payment.subscription_id` equalled
`subscription.id`. Razorpay's documented subscription webhook payment entity does
not require that field; the subscription and payment appear together in the signed
envelope. The old code therefore classified a captured charge without this field
as mismatched before looking up the subscription or opening a transaction.

The outer dispatcher then set `WebhookEvent.processed = true` because the handler
returned normally. This flag meant "dispatch returned without throwing", not
"a successful payment and entitlement were committed". Re-delivery of the same
receipt was skipped. This exactly reproduces a processed receipt with zero database
transactions and a CREATED checkout session.

The activated handler ignored captured-payment evidence entirely. A second event
could thus also be marked processed without repairing the unpaid local state.
Both webhook and Checkout verification also required boolean `captured === true`;
the documented subscription sample includes a `"1"` representation. The new code
accepts only true, 1, or "1" alongside status `captured`, not arbitrary truthy values.

Checkout verification independently required `fetchedPayment.subscription_id`,
so the same optional-field assumption could produce the user's "Payment failed"
screen even though Razorpay had captured payment. Checkout HMAC already binds
payment_id|subscription_id; the corrected path also fetches and checks the gateway
subscription's ID, mapped plan, and any ownership/customer evidence.

Finally, a cancelled event on a local PENDING subscription entered unpaid cleanup.
Gateway paid_count > 0 caused cleanup to preserve the reservation and throw
ConflictException. The webhook failure path released the claim, producing repeated
retryable errors without reconciling the charge. The new lifecycle handler treats
this as an acknowledged mandate cancellation with capture reconciliation pending;
it neither grants access from paid_count nor retries a logically impossible unpaid
cancellation. A later verified charge preserves paid-through access and keeps
future renewal disabled.

Provider references:
- https://razorpay.com/docs/webhooks/subscriptions/
- https://razorpay.com/docs/api/payments/fetch-with-id/

## Corrected capture invariants

- The webhook controller still verifies the signature over the raw body.
- A signed subscription/payment pair supplies the association when the payment
  omits subscription_id. A present contradictory ID is rejected.
- Local gateway subscription ID and mapped gateway plan must match the event/API
  subscription. Present user/plan notes and customer IDs must agree.
- The existing checkout payment must belong to that local user/subscription/plan,
  have the same remote subscription ID, and match captured amount/currency. Initial
  payment amount is checked against the frozen checkout amount, not today's price.
- Initial checkout history is updated in place; missing or ambiguous history must
  be reviewed, not silently replaced with another SUCCESS record.
- The locked transaction writes payment success, entitlement snapshot, and ACTIVE
  subscription together. Failure rolls everything back and does not mark the charge
  receipt processed. Gateway calls are outside database transactions.
- Authenticated events never grant access. Activated without captured evidence
  remains informational. Duplicate captured payment IDs cannot extend access twice.

The regression fixture uses the documented shape plus the reported IDs/amount.
Its timestamps, notes, plan/customer/invoice/order IDs are explicitly synthetic.
It is not advertised as a byte-for-byte production payload replay.

## Read-only confirmation before release or repair

Obtain the deployed Git SHA/file checksums and compare with the audited commit.
Inspect the raw recorded JSON. The following SELECT extracts diagnostic fields
without printing contact, card, or credential information:

```sql
SELECT "eventId", "eventType", "processed",
       "payload" #>> '{payload,subscription,entity,id}' AS subscription_id,
       "payload" #>> '{payload,subscription,entity,plan_id}' AS plan_id,
       "payload" #>> '{payload,payment,entity,id}' AS payment_id,
       "payload" #>> '{payload,payment,entity,status}' AS payment_status,
       "payload" #>> '{payload,payment,entity,captured}' AS captured,
       "payload" #>> '{payload,payment,entity,subscription_id}' AS payment_subscription_id,
       "payload" #>> '{payload,payment,entity,invoice_id}' AS invoice_id,
       "payload" #>> '{payload,payment,entity,amount}' AS amount,
       "payload" #>> '{payload,payment,entity,currency}' AS currency
FROM "WebhookEvent"
WHERE "payload" #>> '{payload,subscription,entity,id}' = 'sub_TsRCS4prgPP799'
ORDER BY "createdAt";
```

Run no UPDATE and do not clear processed flags to force a blind replay.

## Proposed repair after code review, tests, and separate production approval

`WebhookService.reconcileCapturedPayment(localPaymentId, gatewayPaymentId, apply)`
is an internal operator method, with apply defaulting to false; it has no HTTP
endpoint or scheduled job. It is tested only with an isolated local database.

1. In an approved operator context, run the method with the two reported payment
   IDs and apply omitted/false. It fetches the current gateway payment and the
   subscription recorded on the local checkout; it does not trust processed=true.
2. Require payment ID, captured state, zero refunded amount, 29900 paise/INR,
   matching local user/plan/subscription, and valid local nonterminal states.
   If the fetched payment omits subscription_id, require its fetched invoice to
   match payment_id, subscription_id, invoice_id, and any supplied order_id.
   Missing or conflicting evidence stops the repair. Do not override it manually.
3. Review the dry-run result and current gateway mandate status. If cancelled,
   paid-through entitlement can be recorded, but automatic renewal must stay off.
4. Only after explicit production approval, call the same method with apply=true.
   It uses the normal row-locked capture transaction against the original checkout
   payment and a separate `autopay_reconciliation_<gateway payment ID>` receipt.
   Existing webhook payloads/processed flags and payment history are preserved.
5. Read back the original payment SUCCESS, matching gateway payment ID, ACTIVE
   subscription, correct vault snapshot, and disabled renewal for a cancelled
   mandate. Re-running the method is idempotent; it must not create another payment
   or extend access twice. Confirm the website session endpoint reports SUCCESS.

This plan does not authorize execution. No deploy, gateway mutation, production
SQL mutation, or production reconciliation was performed during this investigation.
