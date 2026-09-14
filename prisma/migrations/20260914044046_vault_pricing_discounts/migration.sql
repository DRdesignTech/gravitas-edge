-- Add wholesale/retail pricing fields to SubscriptionPlan.
--
-- `price` stays the ACTUAL amount charged (discounted price).
-- `regularPrice` is the original/list price (display only, never used for
-- payment). `discountPercentage` is the displayed discount and is stored, never
-- recomputed, so it always matches the marketing figure.

ALTER TABLE "SubscriptionPlan"
  ADD COLUMN "discountPercentage" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "regularPrice" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- Backfill the exact 18 active catalog pricing options (6 vaults x 3
-- durations). Values match PRICING_CATALOG in pricing-catalog.ts source of
-- truth. The deterministic ids were created by the 20260914120000 migration,
-- so this is a pure UPDATE on rows that always exist in a migrated DB, and a
-- no-op where they don't.
--
-- Vault index order (1-based):
--   1 Remote, 2 UAE & Global, 3 Executive, 4 Leadership, 5 Management,
--   6 Early Career
-- Offer index order (1-based):
--   1 Monthly (30d), 2 3 Months (90d), 3 6 Months (180d)
-- ---------------------------------------------------------------------------

-- 1. Remote Access Vault
UPDATE "SubscriptionPlan" SET "regularPrice" = 1999,  "discountPercentage" = 25 WHERE id = '22222222-2222-4222-8222-222222001001';
UPDATE "SubscriptionPlan" SET "regularPrice" = 5999,  "discountPercentage" = 17 WHERE id = '22222222-2222-4222-8222-222222001002';
UPDATE "SubscriptionPlan" SET "regularPrice" = 11999, "discountPercentage" = 14 WHERE id = '22222222-2222-4222-8222-222222001003';

-- 2. UAE & Global Access Vault
UPDATE "SubscriptionPlan" SET "regularPrice" = 2499,  "discountPercentage" = 20 WHERE id = '22222222-2222-4222-8222-222222002001';
UPDATE "SubscriptionPlan" SET "regularPrice" = 7499,  "discountPercentage" = 20 WHERE id = '22222222-2222-4222-8222-222222002002';
UPDATE "SubscriptionPlan" SET "regularPrice" = 14999, "discountPercentage" = 20 WHERE id = '22222222-2222-4222-8222-222222002003';

-- 3. Executive Access Vault
UPDATE "SubscriptionPlan" SET "regularPrice" = 2999,  "discountPercentage" = 17 WHERE id = '22222222-2222-4222-8222-222222003001';
UPDATE "SubscriptionPlan" SET "regularPrice" = 8999,  "discountPercentage" = 17 WHERE id = '22222222-2222-4222-8222-222222003002';
UPDATE "SubscriptionPlan" SET "regularPrice" = 17999, "discountPercentage" = 14 WHERE id = '22222222-2222-4222-8222-222222003003';

-- 4. Leadership Access Vault
UPDATE "SubscriptionPlan" SET "regularPrice" = 1499, "discountPercentage" = 33 WHERE id = '22222222-2222-4222-8222-222222004001';
UPDATE "SubscriptionPlan" SET "regularPrice" = 4499, "discountPercentage" = 22 WHERE id = '22222222-2222-4222-8222-222222004002';
UPDATE "SubscriptionPlan" SET "regularPrice" = 8999, "discountPercentage" = 22 WHERE id = '22222222-2222-4222-8222-222222004003';

-- 5. Management Access Vault
UPDATE "SubscriptionPlan" SET "regularPrice" = 799,  "discountPercentage" = 25 WHERE id = '22222222-2222-4222-8222-222222005001';
UPDATE "SubscriptionPlan" SET "regularPrice" = 2399, "discountPercentage" = 19 WHERE id = '22222222-2222-4222-8222-222222005002';
UPDATE "SubscriptionPlan" SET "regularPrice" = 4799, "discountPercentage" = 23 WHERE id = '22222222-2222-4222-8222-222222005003';

-- 6. Early Career Access Vault
UPDATE "SubscriptionPlan" SET "regularPrice" = 499,  "discountPercentage" = 40 WHERE id = '22222222-2222-4222-8222-222222006001';
UPDATE "SubscriptionPlan" SET "regularPrice" = 1399, "discountPercentage" = 29 WHERE id = '22222222-2222-4222-8222-222222006002';
UPDATE "SubscriptionPlan" SET "regularPrice" = 2699, "discountPercentage" = 19 WHERE id = '22222222-2222-4222-8222-222222006003';

-- ---------------------------------------------------------------------------
-- Legacy / non-catalog plans: keep them valid (regular price defaults to the
-- actual price so discounted <= regular holds) and mark discount 0. No data is
-- deleted; subscriptions/payments referencing them are untouched.
-- ---------------------------------------------------------------------------
UPDATE "SubscriptionPlan"
  SET "regularPrice" = "price", "discountPercentage" = 0
  WHERE "regularPrice" = 0;