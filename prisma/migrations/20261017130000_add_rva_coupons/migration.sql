-- Recruitment Vendor Access (RVA) coupon codes.
--
-- Purely additive: four new tables. No existing table is altered and no
-- existing data is touched, so this migration is safe to apply to production
-- with `prisma migrate deploy`. The `CouponDiscountType` enum already exists
-- (created by the Opportunity Vault coupon migration) and is reused.
--
-- These tables are intentionally separate from the vault `Coupon*` tables so
-- RVA discounts can only ever target `RecruitmentVendorPlan` rows:
--
--   RecruitmentVendorCoupon      - the code itself (stored trimmed/upper-cased),
--                                  discount value, validity window, usage limits.
--   RecruitmentVendorCouponPlan  - optional RVA plan allow-list (empty = every plan).
--   RecruitmentVendorCouponUser  - optional user allow-list for specific-users
--                                  coupons (appliesToAllUsers = false).
--   RecruitmentVendorCouponUsage - one row per redemption with the full server-
--                                  calculated price breakdown and payment /
--                                  subscription references. paymentId is UNIQUE
--                                  so a payment session reserves a usage at most
--                                  once.

-- CreateTable
CREATE TABLE "RecruitmentVendorCoupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" "CouponDiscountType" NOT NULL,
    "discountValue" DECIMAL(10,2) NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "usageLimit" INTEGER,
    "perUserUsageLimit" INTEGER NOT NULL DEFAULT 1,
    "appliesToAllUsers" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RecruitmentVendorCoupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruitmentVendorCouponPlan" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,

    CONSTRAINT "RecruitmentVendorCouponPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruitmentVendorCouponUser" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "RecruitmentVendorCouponUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruitmentVendorCouponUsage" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "recruitmentVendorSubscriptionId" TEXT,
    "originalAmount" DECIMAL(12,2) NOT NULL,
    "discountAmount" DECIMAL(12,2) NOT NULL,
    "finalAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecruitmentVendorCouponUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecruitmentVendorCoupon_code_key" ON "RecruitmentVendorCoupon"("code");

-- CreateIndex
CREATE INDEX "RecruitmentVendorCoupon_isActive_idx" ON "RecruitmentVendorCoupon"("isActive");

-- CreateIndex
CREATE INDEX "RecruitmentVendorCoupon_deletedAt_idx" ON "RecruitmentVendorCoupon"("deletedAt");

-- CreateIndex
CREATE INDEX "RecruitmentVendorCoupon_validUntil_idx" ON "RecruitmentVendorCoupon"("validUntil");

-- CreateIndex
CREATE INDEX "RecruitmentVendorCouponPlan_planId_idx" ON "RecruitmentVendorCouponPlan"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "RecruitmentVendorCouponPlan_couponId_planId_key" ON "RecruitmentVendorCouponPlan"("couponId", "planId");

-- CreateIndex
CREATE INDEX "RecruitmentVendorCouponUser_userId_idx" ON "RecruitmentVendorCouponUser"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RecruitmentVendorCouponUser_couponId_userId_key" ON "RecruitmentVendorCouponUser"("couponId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "RecruitmentVendorCouponUsage_paymentId_key" ON "RecruitmentVendorCouponUsage"("paymentId");

-- CreateIndex
CREATE INDEX "RecruitmentVendorCouponUsage_couponId_idx" ON "RecruitmentVendorCouponUsage"("couponId");

-- CreateIndex
CREATE INDEX "RecruitmentVendorCouponUsage_userId_idx" ON "RecruitmentVendorCouponUsage"("userId");

-- CreateIndex
CREATE INDEX "RecruitmentVendorCouponUsage_couponId_userId_idx" ON "RecruitmentVendorCouponUsage"("couponId", "userId");

-- CreateIndex
CREATE INDEX "RecruitmentVendorCouponUsage_planId_idx" ON "RecruitmentVendorCouponUsage"("planId");

-- CreateIndex
CREATE INDEX "RecruitmentVendorCouponUsage_recruitmentVendorSubscriptionId_idx" ON "RecruitmentVendorCouponUsage"("recruitmentVendorSubscriptionId");

-- CreateIndex
CREATE INDEX "RecruitmentVendorCouponUsage_usedAt_idx" ON "RecruitmentVendorCouponUsage"("usedAt");

-- AddForeignKey
ALTER TABLE "RecruitmentVendorCouponPlan" ADD CONSTRAINT "RecruitmentVendorCouponPlan_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "RecruitmentVendorCoupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitmentVendorCouponPlan" ADD CONSTRAINT "RecruitmentVendorCouponPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "RecruitmentVendorPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitmentVendorCouponUser" ADD CONSTRAINT "RecruitmentVendorCouponUser_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "RecruitmentVendorCoupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitmentVendorCouponUser" ADD CONSTRAINT "RecruitmentVendorCouponUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitmentVendorCouponUsage" ADD CONSTRAINT "RecruitmentVendorCouponUsage_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "RecruitmentVendorCoupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitmentVendorCouponUsage" ADD CONSTRAINT "RecruitmentVendorCouponUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitmentVendorCouponUsage" ADD CONSTRAINT "RecruitmentVendorCouponUsage_planId_fkey" FOREIGN KEY ("planId") REFERENCES "RecruitmentVendorPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitmentVendorCouponUsage" ADD CONSTRAINT "RecruitmentVendorCouponUsage_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitmentVendorCouponUsage" ADD CONSTRAINT "RecruitmentVendorCouponUsage_recruitmentVendorSubscriptionId_fkey" FOREIGN KEY ("recruitmentVendorSubscriptionId") REFERENCES "RecruitmentVendorSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
