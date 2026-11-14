-- Connect the three UAE & Global Access Vault plans to the new Razorpay
-- "New UAE & Global" plans. The new plans charge the full list price, so the
-- displayed discount becomes 0 and price == regularPrice.
--
-- Deterministic catalog ids (see PRICING_CATALOG in pricing-catalog.ts):
--   22222222-2222-4222-8222-222222002001  Monthly
--   22222222-2222-4222-8222-222222002002  3 Months
--   22222222-2222-4222-8222-222222002003  6 Months

UPDATE "SubscriptionPlan"
SET
  "price" = 2499,
  "regularPrice" = 2499,
  "discountPercentage" = 0,
  "razorpayPlanId" = 'plan_TzxMOPz61AEuiq',
  "updatedAt" = NOW()
WHERE id = '22222222-2222-4222-8222-222222002001';

UPDATE "SubscriptionPlan"
SET
  "price" = 7499,
  "regularPrice" = 7499,
  "discountPercentage" = 0,
  "razorpayPlanId" = 'plan_TzxNF2wp9VKXFA',
  "updatedAt" = NOW()
WHERE id = '22222222-2222-4222-8222-222222002002';

UPDATE "SubscriptionPlan"
SET
  "price" = 14999,
  "regularPrice" = 14999,
  "discountPercentage" = 0,
  "razorpayPlanId" = 'plan_TzxOFZdgI95Ptm',
  "updatedAt" = NOW()
WHERE id = '22222222-2222-4222-8222-222222002003';
