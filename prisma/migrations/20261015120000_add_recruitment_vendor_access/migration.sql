-- CreateEnum
CREATE TYPE "RecruitmentVendorCategory" AS ENUM ('VENDOR_ENABLEMENT', 'RFP_EOI_RFQ', 'STAFFING_RPO', 'EXECUTIVE_SEARCH', 'OTHER');

-- CreateEnum
CREATE TYPE "RecruitmentVendorOpportunityStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'EXPIRED');

-- AlterTable
ALTER TABLE "CouponUsage" ADD COLUMN     "recruitmentVendorSubscriptionId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "recruitmentVendorSubscriptionId" TEXT;

-- CreateTable
CREATE TABLE "RecruitmentVendorOpportunity" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "role" TEXT,
    "sector" TEXT,
    "category" "RecruitmentVendorCategory" NOT NULL DEFAULT 'OTHER',
    "company" TEXT,
    "organization" TEXT,
    "budget" TEXT,
    "salary" TEXT,
    "commercialValue" TEXT,
    "location" TEXT,
    "geography" TEXT,
    "country" TEXT,
    "experienceText" TEXT,
    "minExperience" INTEGER,
    "maxExperience" INTEGER,
    "eligibility" TEXT,
    "qualification" TEXT,
    "requirements" TEXT,
    "otherDetails" TEXT,
    "howToApply" TEXT,
    "applicationUrl" TEXT,
    "applicationContact" TEXT,
    "source" TEXT,
    "referenceId" TEXT,
    "jobId" TEXT,
    "publishedDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "status" "RecruitmentVendorOpportunityStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RecruitmentVendorOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruitmentVendorPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "regularPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discountPercentage" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "durationDays" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RecruitmentVendorPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruitmentVendorSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "paymentReference" TEXT,
    "razorpaySubscriptionId" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecruitmentVendorSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruitmentVendorFaq" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RecruitmentVendorFaq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruitmentVendorEnrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT,
    "contactName" TEXT,
    "vendorType" TEXT,
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ENROLLED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RecruitmentVendorEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecruitmentVendorOpportunity_status_idx" ON "RecruitmentVendorOpportunity"("status");

-- CreateIndex
CREATE INDEX "RecruitmentVendorOpportunity_category_idx" ON "RecruitmentVendorOpportunity"("category");

-- CreateIndex
CREATE INDEX "RecruitmentVendorOpportunity_location_idx" ON "RecruitmentVendorOpportunity"("location");

-- CreateIndex
CREATE INDEX "RecruitmentVendorOpportunity_country_idx" ON "RecruitmentVendorOpportunity"("country");

-- CreateIndex
CREATE INDEX "RecruitmentVendorOpportunity_sector_idx" ON "RecruitmentVendorOpportunity"("sector");

-- CreateIndex
CREATE INDEX "RecruitmentVendorOpportunity_publishedDate_idx" ON "RecruitmentVendorOpportunity"("publishedDate");

-- CreateIndex
CREATE INDEX "RecruitmentVendorOpportunity_expiryDate_idx" ON "RecruitmentVendorOpportunity"("expiryDate");

-- CreateIndex
CREATE INDEX "RecruitmentVendorOpportunity_deletedAt_idx" ON "RecruitmentVendorOpportunity"("deletedAt");

-- CreateIndex
CREATE INDEX "RecruitmentVendorOpportunity_status_category_expiryDate_idx" ON "RecruitmentVendorOpportunity"("status", "category", "expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "RecruitmentVendorPlan_name_key" ON "RecruitmentVendorPlan"("name");

-- CreateIndex
CREATE INDEX "RecruitmentVendorPlan_isActive_idx" ON "RecruitmentVendorPlan"("isActive");

-- CreateIndex
CREATE INDEX "RecruitmentVendorPlan_deletedAt_idx" ON "RecruitmentVendorPlan"("deletedAt");

-- CreateIndex
CREATE INDEX "RecruitmentVendorPlan_durationDays_idx" ON "RecruitmentVendorPlan"("durationDays");

-- CreateIndex
CREATE INDEX "RecruitmentVendorSubscription_userId_idx" ON "RecruitmentVendorSubscription"("userId");

-- CreateIndex
CREATE INDEX "RecruitmentVendorSubscription_planId_idx" ON "RecruitmentVendorSubscription"("planId");

-- CreateIndex
CREATE INDEX "RecruitmentVendorSubscription_status_idx" ON "RecruitmentVendorSubscription"("status");

-- CreateIndex
CREATE INDEX "RecruitmentVendorSubscription_endDate_idx" ON "RecruitmentVendorSubscription"("endDate");

-- CreateIndex
CREATE INDEX "RecruitmentVendorSubscription_userId_status_endDate_idx" ON "RecruitmentVendorSubscription"("userId", "status", "endDate");

-- CreateIndex
CREATE INDEX "RecruitmentVendorFaq_isActive_sortOrder_idx" ON "RecruitmentVendorFaq"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "RecruitmentVendorFaq_category_idx" ON "RecruitmentVendorFaq"("category");

-- CreateIndex
CREATE INDEX "RecruitmentVendorFaq_deletedAt_idx" ON "RecruitmentVendorFaq"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RecruitmentVendorEnrollment_userId_key" ON "RecruitmentVendorEnrollment"("userId");

-- CreateIndex
CREATE INDEX "RecruitmentVendorEnrollment_status_idx" ON "RecruitmentVendorEnrollment"("status");

-- CreateIndex
CREATE INDEX "RecruitmentVendorEnrollment_deletedAt_idx" ON "RecruitmentVendorEnrollment"("deletedAt");

-- CreateIndex
CREATE INDEX "CouponUsage_recruitmentVendorSubscriptionId_idx" ON "CouponUsage"("recruitmentVendorSubscriptionId");

-- CreateIndex
CREATE INDEX "Payment_recruitmentVendorSubscriptionId_idx" ON "Payment"("recruitmentVendorSubscriptionId");

-- AddForeignKey
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_recruitmentVendorSubscriptionId_fkey" FOREIGN KEY ("recruitmentVendorSubscriptionId") REFERENCES "RecruitmentVendorSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitmentVendorOpportunity" ADD CONSTRAINT "RecruitmentVendorOpportunity_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitmentVendorSubscription" ADD CONSTRAINT "RecruitmentVendorSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitmentVendorSubscription" ADD CONSTRAINT "RecruitmentVendorSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "RecruitmentVendorPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitmentVendorEnrollment" ADD CONSTRAINT "RecruitmentVendorEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_recruitmentVendorSubscriptionId_fkey" FOREIGN KEY ("recruitmentVendorSubscriptionId") REFERENCES "RecruitmentVendorSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

