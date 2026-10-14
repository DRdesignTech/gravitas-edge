-- Add a human-facing, globally unique Job ID to opportunities.
--
-- Purely additive and backward compatible:
--   * "jobId" is nullable, so every existing opportunity row keeps working with
--     no Job ID until an admin (or an import file) supplies one.
--   * The unique index permits multiple NULLs in PostgreSQL, so grandfathered
--     rows without a Job ID do not collide with one another.
-- A Job ID is never generated or overwritten by this migration; no existing
-- data is modified, so this is safe to run on production with
-- `prisma migrate deploy`.

-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN "jobId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_jobId_key" ON "Opportunity"("jobId");
