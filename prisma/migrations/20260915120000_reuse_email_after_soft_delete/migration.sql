-- Allow an email/phone to be reused by a brand-new account once the previous
-- account was soft-deleted (User.deletedAt IS NOT NULL).
--
-- Before this migration, "User_email_key" and "User_phone_key" were global
-- unique indexes, so the soft-deleted row still blocked re-registration with
-- the same email/phone. They are replaced with partial unique indexes that only
-- constrain rows whose deletedAt IS NULL. This preserves the
-- "one active account per email/phone" guarantee at the database level while
-- freeing the value for reuse after soft deletion. Soft-deleted rows are left
-- intact (original email/phone preserved for history/audit).
--
-- NOTE: partial unique indexes cannot be represented in schema.prisma, so after
-- applying this migration do NOT run `prisma migrate dev` against the affected
-- database (it reports the partial indexes as drift and proposes dropping them).
-- Apply with `prisma migrate deploy`, which executes this SQL as written.

DROP INDEX "User_email_key";
DROP INDEX "User_phone_key";

CREATE UNIQUE INDEX "User_email_key" ON "User"("email") WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone") WHERE "deletedAt" IS NULL;