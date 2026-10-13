-- Password reset support for the auth flow.
--
-- Purely additive: two nullable columns on "User". No existing data is
-- touched, so this migration is safe to apply in production with
-- `prisma migrate deploy`.
--
--   passwordResetToken      - hash of a one-time reset token (SHA-256, stored
--                             deterministically so reset can look up the user
--                             by hash instead of scanning all accounts).
--   passwordResetExpiresAt  - UTC expiry for the token (1 hour).

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetExpiresAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "passwordResetToken" TEXT;