# Job Search Portal — Remaining Work Roadmap (Phase 8+)

Analysis Date: September 2026
Client Requirements vs Current Implementation

---

## 1. Current Project Status

### Architecture
- apps/website — Next.js User Website (localhost:3000)
- apps/admin — Next.js Admin Panel (localhost:3001)
- apps/api — NestJS REST API (localhost:5000)
- PostgreSQL + Prisma ORM
- packages/shared — shared package (empty)
- docs/ — railway.md, architecture.md, database.md

### Phase Status
- Phases 1-7: COMPLETED
- Phase 8-13: PENDING (this roadmap)

---

## 2. Completed Requirements (Phases 1-7)

### Core Platform
- User Signup/Login with JWT auth + refresh tokens
- User Profile management (update profile DTO + page)
- Subscription Plans with vault associations
- Multiple Vaults (INDIA/GLOBAL/MIDDLE_EAST/INTERNATIONAL)
- Vault-wise Access/Entitlement (junction tables, frontend filtering)
- Public & Premium Content filtering
- Job/Opportunity Listing with search/filters
- Pagination (custom component, 9 items/page)
- Mobile Job Cards/List View (responsive Tailwind)
- Desktop Data Grid

### India Opportunities
- Career (0-5 yrs), Professional (5-10 yrs), Leadership (10-15 yrs), Executive (15+ yrs)
- Vault-wise access & subscription

### Global Opportunities
- Global Access, Middle East, International vault types defined

### Referral Module (Partial)
- Referral model with unique code, referrer/referred tracking
- ReferralCommission model with status enum
- ReferralSlab model with minReferrals unique

### Resume Module (Partial)
- Resume model with local storage abstraction
- ResumeProcessing status enum defined
- CandidateProfile model with 20+ fields and sub-tables

### Admin Dashboard
- Users CRUD with status/roles management
- Opportunities CRUD with CSV/Excel import
- Subscriptions management with status filtering
- Vault management with experience level linking
- Plan management with vault linking
- Experience levels CRUD
- Analytics with Recharts (revenue, vault performance, user growth, opportunity distribution)
- Three-dot action menus across all pages

### Security
- Server-side authorization (NestJS guards)
- Vault-level access control (Prisma junction tables)
- Subscription-based access checks
- Database-level security (Prisma constraints)
- Protected premium data (server-side filtering)
- Private resume storage (local driver)

### Infrastructure
- Railway deployment documentation (docs/railway.md)
- Architecture documentation
- Database documentation
- CORS configuration (local + production)
- Dockerfile for local development

---

## 3. Partially Completed Requirements

| Requirement | Status | What Exists | What's Missing |
|---|---|---|---|
| Referral User Dashboard | Partial | Referral model, unique code | User-facing API, referral list, earnings display |
| Referral Admin Management | Partial | ReferralSlab model | Admin controller/service, approval flow |
| Commission Approval Flow | Partial | Commission status enum | Approve/reject/paid logic, admin API |
| Resume Upload | Partial | Resume model, local storage | Upload endpoint, file validation |
| Text Extraction | Partial | ResumeProcessing enum | Basic PDF/DOCX parsing |
| Candidate Profile Editing | Partial | CandidateProfile model | Edit/confirm workflow |
| Rate Limiting | Partial | Infrastructure ready | @nestjs/throttler package |
| Security Headers | Partial | CORS configured | Helmet middleware |
| Duplicate Webhook Protection | Partial | Payment model | Signature verification |

---

## 4. Pending Requirements

| Requirement | Notes |
|---|---|
| Full referral commission admin flow | Approve/suspend/payout |
| Resume text extraction | Basic PDF/DOCX parsing (no AI/OCR) |
| Rate limiting | @nestjs/throttler |
| Enhanced analytics | Date range filters, additional KPIs |
| CI/CD pipeline | GitHub Actions for Railway |
| Testing framework | Unit + integration tests |

---

## 5. Future / Out of Scope

- AI Resume parsing, job matching, semantic skill extraction
- Real Razorpay integration (placeholder keys only)
- Custom domain setup (Railway handles SSL)
- Automated payout integration
- Supabase/Vercel migration (current is self-hosted)
- OCR processing
- AI industry/function classification

---

## 6. Remaining Work Roadmap (Phase 8-13)

### Phase 8 — Referral Module Completion
Objective: Complete referral module with user dashboard, admin management, and commission flow.
Dependencies: None (models already exist)
Estimated: 1-2 weeks

### Phase 9 — Resume & Candidate Profile Enhancement
Objective: Implement resume upload, text extraction, and candidate profile editing.
Dependencies: None
Estimated: 1-2 weeks

### Phase 10 — Security Hardening
Objective: Implement rate limiting, security headers, webhook protection.
Dependencies: None
Estimated: 1 week

### Phase 11 — Analytics & Reporting Enhancements
Objective: Enhance admin analytics with date ranges and additional metrics.
Dependencies: None
Estimated: 3-5 days

### Phase 12 — Infrastructure & DevOps
Objective: CI/CD pipeline, testing framework, production readiness.
Dependencies: Phases 8-11
Estimated: 1-2 weeks

### Phase 13 — Production Deployment & Verification
Objective: Deploy to production and verify both environments.
Dependencies: Phases 8-12
Estimated: 3-5 days

---

## 7. Dependencies Between Phases

Phase 8 (Referral) → Phase 9 (Resume) → Phase 10 (Security) → Phase 11 (Analytics) → Phase 12 (CI/CD) → Phase 13 (Production)

Phases 8-11 are largely independent; can be parallelized.
Phase 12 requires all feature phases stable.
Phase 13 requires Phase 12 complete.

---

## 8. Blockers and Clarifications

- Referral commission payout: manual vs automated (automated = future)
- Resume text extraction library: pdf-parse, docx, etc. (must work without AI/OCR)
- Rate limit thresholds: per-IP vs per-user
- Railway env vars must be set in dashboard (not code)

---

## 9. Testing Requirements

Per phase:
- Backend API testing
- Database and migration testing
- Authentication and authorization
- Subscription and entitlement logic
- Vault-level access
- Admin permissions
- Frontend integration
- Responsive behavior
- Error handling
- CORS
- Local development verification
- Production deployment verification
- Regression testing for completed functionality

---

## 10. Statement

No files were changed, no deployment was performed, and no code was written during this analysis.
This roadmap is based on existing code inspection and client requirements comparison.
