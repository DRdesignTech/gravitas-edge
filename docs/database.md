# Database Design

This document describes the PostgreSQL schema (defined in `prisma/schema.prisma`)
for the Gravitas Edge Consulting job platform. All access is through the NestJS API via Prisma.

## Entity Overview

| Domain            | Models |
|-------------------|--------|
| Users & Auth      | `User`, `Role`, `UserRole`, `UserProfile` |
| Vaults            | `Vault`, `ExperienceLevel`, `VaultExperienceLevel` |
| Subscriptions     | `SubscriptionPlan`, `PlanVault`, `Subscription`, `SubscriptionVaultAccess` |
| Opportunities     | `Opportunity`, `OpportunityVault`, `OpportunityExperienceLevel` |
| Referrals         | `Referral`, `ReferralCommission`, `ReferralSlab` |
| Resumes           | `Resume`, `ResumeProcessing` |
| Candidate Profile | `CandidateProfile`, `CandidateSkill`, `CandidateWorkExperience`, `CandidateEducation`, `CandidateCertification`, `CandidateIndustry`, `CandidateFunctionalArea` |
| Payments          | `Payment` |
| Audit             | `AuditLog` |

All primary keys are UUIDs. `createdAt`/`updatedAt` are maintained on most
tables. Soft delete (`deletedAt`) exists where logical deletion is appropriate
(`User`, `Vault`, `SubscriptionPlan`, `Opportunity`, `Referral`, `Resume`).

---

## Users & Authorization

```
User 1──1 UserProfile
User M──M Role  (via UserRole)
```

- `User.email` and `User.phone` are `@unique`.
- No plaintext passwords: only `passwordHash` is stored (hashed in a later auth phase).
- Roles are generic (`ADMIN`, `USER` seeded); more can be added without schema change.
- `UserRole` has `@@unique([userId, roleId])` so a user cannot hold the same role twice.

## Vaults & Experience Levels

```
Vault M──M ExperienceLevel  (via VaultExperienceLevel)
```

- A `Vault` (e.g. "India Career") carries `status`, `type` (category), and
  `sortOrder`.
- `VaultExperienceLevel` binds each India vault to its experience range
  (Career 0–5, Professional 5–10, Leadership 10–15, Executive 15+).
- Experience bounds are data (`minYears`, `maxYears`) not hardcoded strings,
  so new levels can be added later without schema changes.
- `vaultExperienCeLevel` unique `(vaultId, experienceLevelId)`.

## Subscription Plans

```
SubscriptionPlan M──M Vault  (via PlanVault)
```

- A plan (`name` unique, `price`, `currency`, `durationDays`, `isActive`)
  grants access to one or more vaults through `PlanVault`.
- Same vault can belong to many plans. Vault/plan IDs are never hardcoded.

## Subscriptions

```
User 1──M Subscription M──1 SubscriptionPlan
Subscription 1──M SubscriptionVaultAccess M──1 Vault
```

- Tracks `startDate`, `endDate`, `status`, `paymentReference`,
  `razorpaySubscriptionId`, and cancellation metadata.
- `status` enum: `ACTIVE, EXPIRED, CANCELLED, PENDING, FAILED`.
- Access control uses server-side `endDate`/`status`, never the frontend.
- `SubscriptionVaultAccess` snapshots the vaults a subscription entitles the
  user to, enabling fast, server-side vault authorization.

## Opportunities

```
Opportunity M──M Vault          (via OpportunityVault)
Opportunity M──M ExperienceLevel (via OpportunityExperienceLevel)
```

- Rich job fields: title, description, company, location, country,
  employment type, industry, functional area, experience range,
  application URL/contact, source, status, publish/expiry dates.
- `category` enum (`INDIA, GLOBAL, MIDDLE_EAST, INTERNATIONAL, OTHER`) plus
  `status` enum (`DRAFT, PUBLISHED, ARCHIVED, EXPIRED`).
- Opportunities can be **public** (not linked to any vault),
  **premium/vault-specific** (linked via `OpportunityVault`), or scoped to an
  experience level.

## Referrals

```
User(referrer) 1──M Referral M──1 User(referred)
Referral 1──1 ReferralCommission
Referral 1──1 Subscription (via commission, optional)
```

- `Referral.code` is unique; `@@unique([referrerId, referredUserId])` prevents a
  user being referred by the same referrer twice.
- Self-referral is prevented at the application layer (schema cannot express it).
- `status` enum: `PENDING, SUCCESSFUL, INVALID, SUSPENDED`.

### Commissions

- `ReferralCommission.referralId` is `@unique` — one commission per referral.
- `ReferralCommission.subscriptionId` is also `@unique` — prevents duplicate
  commission for the same qualifying subscription/payment.
- `status` enum: `PENDING, APPROVED, PAID, REJECTED, CANCELLED`.

### Slabs

- `ReferralSlab` configures percentage commission by cumulative referral count
  with `minReferrals` unique (open-ended `maxReferrals` for the top slab).
- Percents are data, not code, and slabs are admin-configurable
  (`isActive`), with no periodic reset.

## Resumes

```
User 1──M Resume 1──1 ResumeProcessing
Resume 1──1 CandidateProfile
```

- `Resume` stores `storageProvider` (default `local`), `storagePath`,
  `storageKey`, file metadata, and `uploadStatus`.
- The abstraction supports switching to S3 later without schema change and
  keeps files private (never public URLs as the security mechanism).
- `ResumeProcessing` tracks parse/OCR lifecycle:
  `status` enum `UPLOADED, QUEUED, PROCESSING, COMPLETED, FAILED, OCR_REQUIRED,
  OCR_COMPLETED, ERROR` plus `startedAt`, `completedAt`, `errorMessage`,
  `parserVersion`, `ocrUsed`.

## Candidate Profile

- Core scalars on `CandidateProfile` (name, email, phone, location, experience,
  current role, current company, `resumeText`) — not one giant blob.
- Structured sub-tables hold multiple skills, workplaces, education entries,
  certifications, industries, and functional areas, each tagged with a
  `source` (`EXTRACTED` or `USER_CONFIRMED`).
- `confirmationStatus` enum: `EXTRACTED, CONFIRMED`.

## Payments

```
User 1──M Payment M──1 Subscription
```

- `razorpayPaymentId` and `razorpayOrderId` are `@unique`; a composite unique
  `(razorpayOrderId, razorpayPaymentId)` guards duplicates.
- Store `amount`, `currency`, `status` (`CREATED, PENDING, SUCCESS, FAILED,
  REFUNDED, CANCELLED`), `webhookEvent`, and `metadata`.

## Admin Audit

- `AuditLog` records administrative actions: `action`, `entityType`,
  `entityId`, optional `details` (JSON), and `ipAddress`, tied to the acting
  admin user.

---

## Key Constraints

| Table | Constraint |
|-------|-----------|
| `User` | `email` unique, `phone` unique |
| `Role` | `name` unique |
| `UserRole` | unique `(userId, roleId)` |
| `SubscriptionPlan` | `name` unique |
| `PlanVault` | unique `(planId, vaultId)` |
| `Subscription` | unique `(userId, planId, startDate)` |
| `SubscriptionVaultAccess` | unique `(subscriptionId, vaultId)` |
| `Vault` | `name` unique |
| `VaultExperienceLevel` | unique `(vaultId, experienceLevelId)` |
| `ExperienceLevel` | `slug` unique, `code` unique |
| `OpportunityVault` | unique `(opportunityId, vaultId)` |
| `OpportunityExperienceLevel` | unique `(opportunityId, experienceLevelId)` |
| `Referral` | `code` unique, unique `(referrerId, referredUserId)` |
| `ReferralCommission` | `referralId` unique, `subscriptionId` unique |
| `ReferralSlab` | `minReferrals` unique |
| `ResumeProcessing` | `resumeId` unique |
| `CandidateProfile` | `resumeId` unique, `CandidateSkill` unique `(candidateProfileId, name)`, `CandidateIndustry` unique `(candidateProfileId, name)`, `CandidateFunctionalArea` unique `(candidateProfileId, name)` |
| `Payment` | `razorpayPaymentId` unique, `razorpayOrderId` unique, unique `(razorpayOrderId, razorpayPaymentId)` |

Referential integrity: most child tables cascade on parent delete; `Subscription`
and `Payment` use `Restrict`/`SetNull` on plan/subscription references to
protect financial and subscription history.

---

## Key Indexes

Indexes target expected high-frequency query patterns:

- **Users**: email, phone, status, role (`UserRole`), deletedAt
- **Subscriptions**: userId, planId, status, endDate (expiry), combined `(userId, status, endDate)`
- **Vaults**: status, type
- **Opportunities**: status, category, location, country, industry, publishedDate,
  expiryDate, and combined `(status, category, expiryDate)`
- **Referrals**: code, status, referrer (via referrerId), referred (via referredUserId),
  and commission status
- **Resumes**: userId, uploadStatus, processing status, ocrUsed
- **Candidate profiles**: userId, confirmationStatus
- **Payments**: userId, subscriptionId, status, razorpaySubscriptionId
- **AuditLogs**: action, entityType, entityId, adminUserId, createdAt

---

## Relationship Summary (ER style)

```
User ─┬─ UserProfile
      ├─ UserRole ─ Role
      ├─ Subscription ── SubscriptionPlan ── PlanVault ─ Vault ─┬─ VaultExperienceLevel ─ ExperienceLevel
      │      └─ SubscriptionVaultAccess ─ Vault               ──┘
      ├─ Referral (referrer) ─ ReferralCommission ─ Subscription
      ├─ Referral (referred)
      ├─ Resume ─ ResumeProcessing ─ CandidateProfile ─ (CandidateSkill/WorkExperience/Education/Certification/Industry/FunctionalArea)
      ├─ Payment ─ Subscription
      ├─ Opportunity (creator)
      └─ AuditLog (admin)

Opportunity ─ OpportunityVault ─ Vault
Opportunity ─ OpportunityExperienceLevel ─ ExperienceLevel

ReferralSlab  (standalone config)
```

## Migration Workflow

```bash
npm run db:migrate -- --name <migration_name>   # create & apply (interactive; use a TTY)
npm run db:migrate:prod                          # apply pending migrations (deploy)
npm run db:seed                                  # seed reference data
npm run db:studio                                # browse tables
```

> Note: plain `migrate dev` prompts for confirmation in a non-interactive shell.
> Use `migrate deploy` (non-interactive) or a TTY for `migrate dev`.
