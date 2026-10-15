-- Make the Recruitment Vendor Access Job ID (a.k.a. Opportunity ID) globally
-- unique, mirroring the Opportunity table so an imported job can be detected
-- as a duplicate instead of silently creating a second row.
--
-- Purely additive and backward compatible:
--   * "jobId" is nullable, and PostgreSQL permits multiple NULLs in a unique
--     index, so grandfathered rows without a Job ID never collide.
--   * A Job ID is never generated or overwritten by this migration; no existing
--     data is modified, so this is safe to run on production with
--     `prisma migrate deploy`.

-- CreateIndex
CREATE UNIQUE INDEX "RecruitmentVendorOpportunity_jobId_key" ON "RecruitmentVendorOpportunity"("jobId");
