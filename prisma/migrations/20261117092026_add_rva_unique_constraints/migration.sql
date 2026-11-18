/*
  Warnings:

  - A unique constraint covering the columns `[razorpayPlanId]` on the table `RecruitmentVendorPlan` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[razorpaySubscriptionId]` on the table `RecruitmentVendorSubscription` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "RecruitmentVendorPlan" ADD COLUMN     "razorpayPlanId" TEXT;

-- AlterTable
ALTER TABLE "RecruitmentVendorSubscription" ADD COLUMN     "autoRenew" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nextBillingDate" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "RecruitmentVendorPlan_razorpayPlanId_key" ON "RecruitmentVendorPlan"("razorpayPlanId");

-- CreateIndex
CREATE INDEX "RecruitmentVendorPlan_razorpayPlanId_idx" ON "RecruitmentVendorPlan"("razorpayPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "RecruitmentVendorSubscription_razorpaySubscriptionId_key" ON "RecruitmentVendorSubscription"("razorpaySubscriptionId");

-- CreateIndex
CREATE INDEX "RecruitmentVendorSubscription_razorpaySubscriptionId_idx" ON "RecruitmentVendorSubscription"("razorpaySubscriptionId");

-- CreateIndex
CREATE INDEX "RecruitmentVendorSubscription_nextBillingDate_idx" ON "RecruitmentVendorSubscription"("nextBillingDate");

-- CreateIndex
CREATE INDEX "Subscription_nextBillingDate_idx" ON "Subscription"("nextBillingDate");

-- CreateIndex
CREATE INDEX "SubscriptionPlan_razorpayPlanId_idx" ON "SubscriptionPlan"("razorpayPlanId");

-- RenameForeignKey
ALTER TABLE "RecruitmentVendorCouponUsage" RENAME CONSTRAINT "RecruitmentVendorCouponUsage_recruitmentVendorSubscriptionId_fk" TO "RecruitmentVendorCouponUsage_recruitmentVendorSubscription_fkey";

-- RenameIndex
ALTER INDEX "RecruitmentVendorCouponUsage_recruitmentVendorSubscriptionId_id" RENAME TO "RecruitmentVendorCouponUsage_recruitmentVendorSubscriptionI_idx";
