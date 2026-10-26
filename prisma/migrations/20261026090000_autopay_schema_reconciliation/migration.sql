-- Opportunity Vault AutoPay schema reconciliation.
--
-- This migration is additive. It intentionally never deletes or rewrites a
-- subscription/payment row. The duplicate checks fail closed with a clear
-- message so an operator can remediate records deliberately before adding the
-- unique indexes.

ALTER TABLE "SubscriptionPlan"
  ADD COLUMN IF NOT EXISTS "razorpayPlanId" TEXT;

ALTER TABLE "Subscription"
  ADD COLUMN IF NOT EXISTS "autoRenew" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "nextBillingDate" TIMESTAMP(3);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "SubscriptionPlan"
    WHERE "razorpayPlanId" IS NOT NULL
    GROUP BY "razorpayPlanId" HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add SubscriptionPlan_razorpayPlanId_key: duplicate non-null Razorpay plan IDs exist. Resolve them manually before retrying.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "Subscription"
    WHERE "razorpaySubscriptionId" IS NOT NULL
    GROUP BY "razorpaySubscriptionId" HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add Subscription_razorpaySubscriptionId_key: duplicate non-null Razorpay subscription IDs exist. Resolve them manually before retrying.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "Payment"
    WHERE "razorpayPaymentId" IS NOT NULL
    GROUP BY "razorpayPaymentId" HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add Payment_razorpayPaymentId_key: duplicate non-null Razorpay payment IDs exist. Resolve them manually before retrying.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionPlan_razorpayPlanId_key"
  ON "SubscriptionPlan"("razorpayPlanId");

CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_razorpaySubscriptionId_key"
  ON "Subscription"("razorpaySubscriptionId");

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_razorpayPaymentId_key"
  ON "Payment"("razorpayPaymentId");
