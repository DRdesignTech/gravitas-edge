# Architecture

## Overview

The Gravitas Edge Consulting job platform is a monorepo with three deployable applications and one
shared package, orchestrated with npm workspaces.

```
Website (Next.js :3000)                    Admin (Next.js :3001)
        │                                        │
        │  REST (NEXT_PUBLIC_API_URL)            │  REST
        ▼                                        ▼
             NestJS API (:5000)  /api
                    │
              Prisma Service
                    │
                PostgreSQL :5432
```

## Frontend (Next.js App Router)

- `apps/website` — public-facing job platform for users
- `apps/admin` — internal administration panel
- Both use App Router, TypeScript strict mode, Tailwind CSS
- Both talk only to the backend via REST; never directly to PostgreSQL

## Backend (NestJS)

- `apps/api` — REST API at prefix `/api`
- Global `ValidationPipe` for DTO validation (whitelist + transform)
- Global CORS limited to the two frontend origins in development
- Swagger docs at `/api/docs`
- `PrismaService` for all database access
- Health endpoints: `GET /api/health`, `GET /api/health/db`

## Database (PostgreSQL + Prisma)

- Single shared Prisma schema at `prisma/schema.prisma`
- Client generated into the API workspace
- Business models will be added incrementally

## Shared (`packages/shared`)

- `@job-portal/shared` — common TS types/utilities shared across apps

## Environment Configuration

Each app reads its own environment file (see `.env.example`). Root and shared
packages do not hold secrets. No secrets are committed.
