-- Add an auto-assigned, database-wide display serial ("S. No.") to opportunities.
--
-- Additive and backward compatible:
--   * Existing rows are backfilled 1..N in creation order (oldest first) so the
--     numbering is deterministic and matches the historical record order.
--   * A Postgres sequence then takes over for every future insert, so a new
--     opportunity always receives the next number without any application code.
-- The sequence/default shape mirrors what Prisma generates for a field declared
-- `Int @unique @default(autoincrement())`.

-- AlterTable: add the column without a default so existing rows can be ordered.
ALTER TABLE "Opportunity" ADD COLUMN "serialNo" INTEGER;

-- Backfill existing rows in creation order (id breaks any timestamp ties).
WITH ordered AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, "id" ASC) AS rn
  FROM "Opportunity"
)
UPDATE "Opportunity" AS o
SET "serialNo" = ordered.rn
FROM ordered
WHERE o."id" = ordered."id";

-- Sequence for future rows, starting just after the largest backfilled number.
CREATE SEQUENCE "Opportunity_serialNo_seq" AS integer;
ALTER SEQUENCE "Opportunity_serialNo_seq" OWNED BY "Opportunity"."serialNo";
SELECT setval(
  '"Opportunity_serialNo_seq"',
  (SELECT COALESCE(MAX("serialNo"), 0) FROM "Opportunity") + 1,
  false
);
ALTER TABLE "Opportunity" ALTER COLUMN "serialNo" SET DEFAULT nextval('"Opportunity_serialNo_seq"');

-- Every row now has a number; enforce presence and uniqueness.
ALTER TABLE "Opportunity" ALTER COLUMN "serialNo" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_serialNo_key" ON "Opportunity"("serialNo");
