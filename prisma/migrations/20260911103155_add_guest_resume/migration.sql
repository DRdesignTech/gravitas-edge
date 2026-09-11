-- CreateTable
CREATE TABLE "GuestResume" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "originalName" TEXT NOT NULL,
    "storageName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storageProvider" TEXT NOT NULL DEFAULT 'local',
    "storagePath" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linkedUserId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestResume_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuestResume_tokenHash_key" ON "GuestResume"("tokenHash");

-- CreateIndex
CREATE INDEX "GuestResume_email_idx" ON "GuestResume"("email");

-- CreateIndex
CREATE INDEX "GuestResume_linkedUserId_idx" ON "GuestResume"("linkedUserId");

-- CreateIndex
CREATE INDEX "GuestResume_deletedAt_idx" ON "GuestResume"("deletedAt");

-- AddForeignKey
ALTER TABLE "GuestResume" ADD CONSTRAINT "GuestResume_linkedUserId_fkey" FOREIGN KEY ("linkedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
