-- Public marketing content: subscriber testimonials shown on the website
-- homepage.
--
-- Purely additive: new table only. No existing table is modified and no
-- existing data is touched, so this migration is safe to apply to production
-- with `prisma migrate deploy`.
--
--   Testimonial  - name, role, optional result badge, quote, optional
--                  LinkedIn URL (tapping the person's name opens their
--                  profile), display ordering and an isActive toggle so admins
--                  can hide entries without deleting them.

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "badge" TEXT,
    "quote" TEXT NOT NULL,
    "linkedinUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Testimonial_isActive_sortOrder_idx" ON "Testimonial"("isActive", "sortOrder");