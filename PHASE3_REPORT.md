# Phase 3 Completion Report – Recruitment Vendor Access (RVA)

**Repository:** `/Users/amanyadav/job-portal`  
**Branch:** `main` (uncommitted local changes as requested)  
**Scope:** Phase 3 – idempotent demo seed + public RVA landing page + nav links + dedicated RVA checkout (website-only). No production migrations, no commits/pushes, no auto-seeding production.

## Summary
Phase 3 delivers a complete public flow for Recruitment Vendor Access: an idempotent demo seed, a new landing page at `/recruitment-vendor`, a dedicated Razorpay checkout at `/recruitment-vendor/checkout/[paymentId]`, and navigation links in Header/Footer. Build, TypeScript, and ESLint all pass. The API overview endpoint returns correct data.

## Key Decisions
- **Pricing:** Seeded 3 demo plans with placeholder DEMO prices and `[DEMO]` in description (1/3/6-month: 999/2499/4499 INR, `regularPrice` 1499/3499/6999 INR). Production guard prevents seeding production. These are unapproved placeholders needing admin configuration before production.
- **Scope:** Landing page + RVA checkout (approved). Preview CTAs scroll within the page (`#free-preview`, `#plans`, etc.). No separate list/detail pages.
- **Isolation:** RVA is fully independent from Opportunity Vault. Purchase/verify/fail paths use RVA-specific services; no coupon support on RVA checkout. Access is determined via `RecruitmentVendorSubscription` (separate from OV).

## Database / Seed
- Created `prisma/rva-seed.ts` (idempotent, production-guarded):
  - Production guard: `NODE_ENV === 'production' && ALLOW_RVA_SEED !== 'true'` → logs + exits 1.
  - Plans (3): created-if-absent by `name` (idempotent; preserves admin edits). Fields: name, description (includes `[DEMO]` marker), price, regularPrice, durationDays (30/90/180), durationLabel (Monthly/3 Months/6 Months), sortOrder (0/1/2), isActive true.
  - Opportunities (10): idempotency by `referenceId` (`findFirst({ where: { referenceId, deletedAt: null } })`); all 4 primary categories + 2 OTHER; status: 9 PUBLISHED, 1 DRAFT; deterministic `publishedDate`/`expiryDate` (`daysFromNow`), demo emails `.example`; country nullable (`string | null`).
  - FAQs (6): idempotency by `question` (`findFirst({ where: { question, deletedAt: null } })`).
- Wired seed scripts:
  - `prisma/tsconfig.json` includes `["seed.ts", "rva-seed.ts"]`
  - `apps/api/package.json`: `"db:seed:rva": "ts-node --project ../../prisma/tsconfig.json ../../prisma/rva-seed.ts"`
  - Root `package.json`: `"db:seed:rva": "npm run db:seed:rva --workspace=apps/api"`
- Verified:
  - First run: Plans 3 created, Opportunities 10 created, FAQs 6 created.
  - Second run: 0/0/0 (idempotent).
  - Production attempt: blocked (non-zero exit).
- Seeded state (current DB):
  - RecruitmentVendorOpportunity: PUBLISHED total 9 (VENDOR_ENABLEMENT 2, RFP_EOI_RFQ 2, STAFFING_RPO 2, EXECUTIVE_SEARCH 2, OTHER 1); DRAFT 1 (OTHER).
  - RecruitmentVendorPlan: 3 active (30/90/180 days).
  - RecruitmentVendorFaq: 6 active.

## API (public)
- Overview: `GET /api/recruitment-vendor/overview?previewLimit=` returns vault `recruitment-vendor-access`, `publishedOpportunityCount=9`, categories with counts, preview opportunities (masked), plans, faqs. Verified live (API running on :5000): response correct.
- Other public endpoints used by website/services: `/plans`, `/plans/:id`, `/opportunities`, `/opportunities/:id`, `/faqs`, `POST /purchase`, `POST /purchase/verify`, `POST /purchase/fail`, `GET /payments/:id`. Shapes match `RvaPaymentSession`/`RvaPurchaseResult`/`RvaConfirmResult`.

## Website Changes
### Types (`apps/website/src/lib/types.ts`)
Added RVA types: `RvaCategory`, `RvaPlan`, `RvaLockedPreview`, `RvaOpportunity`, `RvaFaq`, `RvaOverview`, `RvaPurchaseResult`, `RvaPaymentSession`, `RvaConfirmResult`.

### Services (`apps/website/src/lib/services.ts`)
Added RVA client functions: `fetchRvaOverview(previewLimit?)`, `fetchRvaPlans()`, `fetchRvaFaqs()`, `fetchRvaOpportunities(query?)`, `fetchRvaOpportunity(id)`, `purchaseRvaPlan(planId)`, `fetchRvaPaymentSession(paymentId)`, `verifyRvaPayment(payload)`, `failRvaPayment(paymentId)`.

### Landing Page (`apps/website/src/app/recruitment-vendor/page.tsx`) — NEW
Client component with sections:
- Hero (navy gradient, eyebrow, h1, CTAs: "Explore Free Opportunities" → `#free-preview`, "View Access Plans" → `#plans`), shows published count.
- Categories (`#categories`): grid of 4 primary categories (excludes `OTHER`), counts, blurbs, `CategoryIcon`.
- Free Preview (`#free-preview`): grid of `PreviewCard`s (up to `PREVIEW_LIMIT=6`). Each card expandable; locked preview details masked (per API `lockedPreview`); shows "Unlock Full Access" CTA → `#plans`.
- Plans (`#plans`): 3 `PlanCard`s (90-day marked "Most Popular"), price/regularPrice with strike + savings + `% OFF`, CTA: if unauthenticated → `/register`; if authenticated → `purchaseRvaPlan(plan.id)` then `router.push('/recruitment-vendor/checkout/${paymentId}')`.
- FAQ (`#faq`): accordion of FAQs.
- Final CTA linking to plans/register.

Includes loading skeletons, error/empty states, `useToast` on errors, `scrollToId`. Uses existing UI (`Button`, `Badge`, `Skeleton`, `ErrorState`, `LockIcon`) and design tokens.

### Checkout Page (`apps/website/src/app/recruitment-vendor/checkout/[paymentId]/page.tsx`) — NEW
Dynamic route (`/recruitment-vendor/checkout/[paymentId]`):
- Loads `RvaPaymentSession` via `fetchRvaPaymentSession(paymentId)`.
- States: `form | processing | success | failure`.
- If session `SUCCESS` → success screen (plan summary, "Back to Recruitment Vendor Access", "Go to my dashboard").
- If session `FAILED` → failure screen with retry/back to plans.
- Terminal statuses (`CANCELLED`, `REFUNDED`, `PENDING`) show non-completable state with back-to-plans.
- Pay: loads Razorpay script, opens with `keyId`, `orderId`, amount (paisa), description; on success calls `verifyRvaPayment` → success; on modal dismiss → `form`; no coupons. Calls `failRvaPayment` on explicit cancel.
- Security note: verification server-side only; no sensitive data stored client-side.

### Navigation (`apps/website/src/components/layout/Header.tsx`, `Footer.tsx`)
- Header `navLinks`: added `{ href: '/recruitment-vendor', label: 'Recruitment Vendor' }` (between Plans and FAQ).
- Footer `platformLinks`: added `{ href: '/recruitment-vendor', label: 'Recruitment Vendor Access' }` (between Opportunity Vaults and How It Works).

## Verification
- Website `tsc --noEmit`: 0 errors.
- Website `npm run lint`: 0 errors (pre-existing warnings may exist elsewhere, unchanged).
- Website `npm run build` (Next.js 16): success. Routes include `/recruitment-vendor` (static) and `/recruitment-vendor/checkout/[paymentId]` (dynamic).
- API live check: `GET /api/recruitment-vendor/overview` returns `success=true`, `publishedOpportunityCount=9`, categories/counts correct.
- DB verification: 3 plans active, 9 PUBLISHED + 1 DRAFT opportunities across all 5 categories, 6 FAQs.

## Notes / Caveats
- Placeholder prices are DEMO-only. Do not treat as approved pricing in production. Admin panel should configure actual RVA pricing before launch.
- Seed uses `findFirst` (not `findUnique`) for User lookups because `User.email` is not `@unique` in schema (only `@@index`); this matches Prisma schema constraints.
- Landing page uses RVA-specific services; no coupling to OV coupon/subscription context. `refreshAccess()` is not called on RVA checkout success (intentionally) since RVA access is independent.
- Shared package `@job-portal/shared` was already built; no src→dist changes required beyond prior Phase 2.
- Global Header/Footer are rendered via `Providers.tsx`; individual pages do not re-render them (confirmed).

## Files Created/Modified
**New:**
- `apps/website/src/app/recruitment-vendor/page.tsx`
- `apps/website/src/app/recruitment-vendor/checkout/[paymentId]/page.tsx`
- `prisma/rva-seed.ts`
- `PHASE3_REPORT.md`

**Modified:**
- `apps/website/src/lib/types.ts` (+ RVA types)
- `apps/website/src/lib/services.ts` (+ RVA services)
- `apps/website/src/components/layout/Header.tsx` (+ RVA nav link)
- `apps/website/src/components/layout/Footer.tsx` (+ RVA platform link)
- `prisma/tsconfig.json` (include rva-seed)
- `apps/api/package.json` (db:seed:rva script)
- `package.json` (root db:seed:rva script)
