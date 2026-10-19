-- Unify resumes into a single store: merge GuestResume into Resume.
-- userId NULL marks a guest upload; guestTokenHash keeps the opaque guest handle.

-- AlterTable
ALTER TABLE "Resume" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "Resume" ADD COLUMN "fullName" TEXT,
ADD COLUMN "email" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "guestTokenHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Resume_guestTokenHash_key" ON "Resume"("guestTokenHash");

CREATE INDEX "Resume_email_idx" ON "Resume"("email");

-- MigrateGuestResumeData: existing guest submissions become Resume rows
-- (same id, userId stays NULL, tokenHash → guestTokenHash)
INSERT INTO "Resume" (
    "id",
    "userId",
    "fullName",
    "email",
    "phone",
    "guestTokenHash",
    "originalName",
    "storageName",
    "fileType",
    "fileSize",
    "storageProvider",
    "storagePath",
    "storageKey",
    "uploadStatus",
    "uploadedAt",
    "processedAt",
    "createdAt",
    "updatedAt",
    "deletedAt"
)
SELECT
    "id",
    NULL,
    "fullName",
    "email",
    "phone",
    "tokenHash",
    "originalName",
    "storageName",
    "fileType",
    "fileSize",
    "storageProvider",
    "storagePath",
    NULL,
    'UPLOADED',
    "uploadedAt",
    NULL,
    "createdAt",
    "updatedAt",
    "deletedAt"
FROM "GuestResume";

-- DropTable
DROP TABLE "GuestResume";
