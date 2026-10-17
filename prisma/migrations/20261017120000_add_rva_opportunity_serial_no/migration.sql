-- Add the Excel "S. No." display serial to Recruitment Vendor Access opportunities.
--
-- Additive and backward compatible: the column is nullable, so existing rows
-- keep a NULL serial and no data is dropped or rewritten. Imported workbooks
-- that include an "S. No." column populate it; other rows stay NULL.

-- AlterTable
ALTER TABLE "RecruitmentVendorOpportunity" ADD COLUMN "serialNo" INTEGER;
