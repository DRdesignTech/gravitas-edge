-- Enforce one non-deleted account per case- and whitespace-insensitive email.
-- This deliberately fails closed when duplicates already exist; it does not
-- rewrite, merge, soft-delete, or remove any account.
-- SELECT lower(btrim("email")) AS normalized_email, COUNT(*) AS account_count,
--        array_agg("id" ORDER BY "createdAt") AS user_ids
-- FROM "User" WHERE "deletedAt" IS NULL
-- GROUP BY lower(btrim("email")) HAVING COUNT(*) > 1;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "User"
    WHERE "deletedAt" IS NULL
    GROUP BY lower(btrim("email"))
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce case-insensitive active user email uniqueness: resolve duplicate active emails first';
  END IF;
END
$$;

CREATE UNIQUE INDEX "User_email_lower_active_key"
  ON "User" (lower(btrim("email")))
  WHERE "deletedAt" IS NULL;
