-- At most one unpaid or active AutoPay subscription may exist for a user and plan.
-- Terminal attempts (FAILED, CANCELLED, EXPIRED) remain preserved and do not
-- block a new purchase.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Subscription"
    WHERE "autoRenew" = true
      AND "status" IN ('PENDING', 'ACTIVE')
    GROUP BY "userId", "planId"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add active AutoPay uniqueness index: duplicate pending/active subscriptions exist for a user and plan. Resolve them manually before retrying.';
  END IF;
END $$;

CREATE UNIQUE INDEX "Subscription_one_pending_or_active_autorenew_per_user_plan_key"
  ON "Subscription" ("userId", "planId")
  WHERE "autoRenew" = true
    AND "status" IN ('PENDING', 'ACTIVE');
