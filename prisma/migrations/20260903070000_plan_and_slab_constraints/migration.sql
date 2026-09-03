-- AlterTable: ReferralSlab - change unique key to minReferrals only
DROP INDEX "ReferralSlab_minReferrals_maxReferrals_key";
CREATE UNIQUE INDEX "ReferralSlab_minReferrals_key" ON "ReferralSlab"("minReferrals");

-- AlterTable: SubscriptionPlan - add unique constraint on name
CREATE UNIQUE INDEX "SubscriptionPlan_name_key" ON "SubscriptionPlan"("name");
