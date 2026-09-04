# Railway Production Deployment

This document describes the Railway native Nixpacks deployment for the Job Search Portal monorepo.

## Overview

- **Platform**: Railway (native Node.js / Nixpacks)
- **Services**: API (NestJS), Website (Next.js), Admin (Next.js), PostgreSQL
- **Build**: `npm run build --workspaces` per service
- **Start**: Each service reads `process.env.PORT` (Railway provides this)
- **Docker**: The existing `Dockerfile` at repo root is for local development only; Railway uses Nixpacks natively.

---

## Railway Project Services

| Service | Root Directory | Build Command | Start Command |
|---|---|---|---|
| **API** | `apps/api` | `npm run build` | `npm run start:prod` |
| **Website** | `apps/website` | `npm run build` | `npm run start` |
| **Admin** | `apps/admin` | `npm run build` | `npm run start` |
| **PostgreSQL** | Railway managed | — | — |

*Nixpacks auto-detects the build command from `package.json` scripts. No `.nixpacks` file required.*

---

## PostgreSQL Setup

1. In the Railway dashboard, add a **PostgreSQL** service/plugin.
2. Railway will automatically provide a `DATABASE_URL` environment variable to all services in the project.
3. The `DATABASE_URL` format from Railway typically includes `sslmode=require`; Prisma handles this correctly.
4. **Do not** set `DATABASE_URL` manually unless you have a custom connection string requirement.
5. Prisma schema targets `postgresql` — no schema changes needed.

*If `DATABASE_URL` is not auto-propagated, set it manually in each service's Variables panel using the Railway Postgres connection string.*

---

## API Service Configuration

**Root directory**: `apps/api`

### Required Environment Variables (Railway Variables panel)

| Variable | Source | Notes |
|---|---|---|
| `ENVIRONMENT` | `.env.example` | Set to `production` |
| `DATABASE_URL` | Railway Postgres auto-provided OR set manually | Format: `postgresql://user:password@containers.internal:5432/railway?sslmode=require` |
| `JWT_ACCESS_SECRET` | **Must set manually** | Strong random secret (32+ chars). Used by `jwt.strategy.ts` and `auth.service.ts`. Generated via: `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | **Must set manually** | Strong random secret (32+ chars). Used by `auth.service.ts`. Generated via: `openssl rand -hex 32` |
| `JWT_ACCESS_EXPIRES_IN` | `.env.example` | Default: `15m`. Format: number + unit (`m`, `h`, `d`, `s`). |
| `JWT_REFRESH_EXPIRES_IN` | `.env.example` | Default: `7d`. Format: number + unit. |
| `RAZORPAY_KEY_ID` | `.env.example` | Placeholder: `rzp_test_placeholder`. Not used at runtime. |
| `RAZORPAY_KEY_SECRET` | `.env.example` | Placeholder: `change_me_razorpay_secret`. Not used at runtime. |
| `RAZORPAY_WEBHOOK_SECRET` | `.env.example` | Placeholder: `change_me_razorpay_webhook_secret`. Not used at runtime. |
| `STORAGE_DRIVER` | `.env.example` | Set to `local`. |
| `STORAGE_LOCAL_PATH` | `.env.example` | Set to `./storage`. Railway creates `/app/storage` (per Dockerfile). |
| `STORAGE_LOCAL_PUBLIC_URL` | `.env.example` | Set to `https://api-url.up.railway.app` (replace with actual API Railway URL). |
| `MAX_FILE_SIZE` | `.env.example` | Set to `5242880` (5MB). |
| `CORS_ORIGINS` | **Must set manually** | Comma-separated, no spaces. Production: `https://website-url.up.railway.app,https://admin-url.up.railway.app`. Local: `http://localhost:3000,http://localhost:3001`. |

### Build & Start

- **Build**: `npm run build` — runs `nest build`, which generates the Prisma client and compiles NestJS code.
- **Start**: `npm run start:prod` — runs `node dist/main`.
- **Prisma during build**: `npm run build` implicitly runs `prisma generate` (configured via the NestJS `ConfigModule` which loads `.env`; Prisma client is generated as part of the build pipeline). On first deploy, ensure the start command runs migrations if needed (see Migration section).

*Port handling*: The API reads `process.env.PORT || 5000` (see `src/main.ts:54`). Railway provides `$PORT`; local development uses `5000` default. Do not change this behavior.

### Migration Command (Production)

> **Safest first-deployment migration command:**
> ```
> npx prisma migrate deploy --schema=prisma/schema.prisma
> ```
> This applies any pending migrations from the existing migration folders
> (`20260903061432_init`, `20260903070000_plan_and_slab_constraints`,
> `20260903071014_auth_refresh_tokens`).
>
> **Do not** use `prisma db push` in production.
> **Do not** run migrations on every restart unnecessarily.
> The migration SQL files already exist — `migrate deploy` is the correct production approach.

*If the database is fresh (no prior migrations), you may need to run `npx prisma migrate reset` locally before first Railway deploy, but on Railway, `migrate deploy` against the existing migration history is safest.*

### Health Check

- **Path**: `GET /api/health`
- **Handler**: `src/health/health.controller.ts` — returns `{ status: 'ok', timestamp: '...', uptime: ... }` with HTTP 200.
- **Railway**: Add a health check in the Railway dashboard pointing to `https://api-service-url.up.railway.app/api/health`.
- The endpoint is already implemented; no code changes needed.

*Do not claim Railway automatically discovers it — explicitly configure the healthcheck URL in the Railway dashboard.*

---

## Website Service Configuration

**Root directory**: `apps/website`

### Required Environment Variables

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api-url.up.railway.app/api` | Must match the deployed API service URL (without trailing slash on the Railway URL, but the `/api` suffix is part of the value). Used by Next.js rewrites (`next.config.js`) AND inlined into client bundles at build time. |

### Build & Start

- **Build**: `npm run build` — runs `next build`. During build, `NEXT_PUBLIC_API_URL` is inlined by Next.js.
- **Start**: `npm run start` — runs `next start -p $PORT`. Railway provides `$PORT`; local defaults to `3000` (see `package.json:6`: `dev: next dev -p 3000`).

*CORS*: The website does not set its own CORS — it relies on the API's `CORS_ORIGINS`. Ensure the API's `CORS_ORIGINS` includes the deployed website URL.

---

## Admin Service Configuration

**Root directory**: `apps/admin`

### Required Environment Variables

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api-url.up.railway.app/api` | Must match the deployed API service URL. Used by Next.js rewrites AND inlined at build time. |

### Build & Start

- **Build**: `npm run build` — runs `next build`.
- **Start**: `npm run start` — runs `next start -p $PORT`. Railway provides `$PORT`; local defaults to `3001` (see `package.json:6`: `dev: next dev -p 3001`).

*CORS*: Same as Website — relies on the API's `CORS_ORIGINS`.

---

## CORS Configuration

- **Source**: API `src/main.ts:11` reads `process.env.CORS_ORIGINS`.
- **Production value**: `CORS_ORIGINS=https://website-url.up.railway.app,https://admin-url.up.railway.app`
  - Replace `website-url.up.railway.app` and `admin-url.up.railway.app` with the actual Railway-provided URLs.
- **Local development value**: `CORS_ORIGINS=http://localhost:3000,http://localhost:3001` (preserved from `.env`).
- **Do not hardcode Railway URLs** in the code — set them as Railway environment variables.
- The `next.config.js` files have `rewrites` that use `NEXT_PUBLIC_API_URL` — separate from CORS.

---

## Domain Setup

1. In the Railway dashboard, add custom domains for each service (e.g., `api.job-portal.com`, `job-portal.com`, `admin.job-portal.com`).
2. The `NEXT_PUBLIC_API_URL` and `CORS_ORIGINS` must use the final custom domain(s), not the `.up.railway.app` subdomain.
3. SSL is handled automatically by Railway.

---

## Deployment Verification

After setting all variables and deploying:

1. **API health**: `GET <api-url>/api/health` → `200 { status: 'ok', ... }`
2. **API root**: `GET <api-url>/` → NestJS Swagger docs at `/api/docs`
3. **Website**: Load the website URL; API calls should resolve to the correct backend.
4. **Admin**: Load the admin URL; API calls should resolve correctly.
5. **Database**: Verify data is accessible via Prisma (seed data from `prisma/seed.ts` should be present if migrations ran successfully).
6. **Logs**: Check Railway logs for any `JWT_ACCESS_SECRET` or `DATABASE_URL` missing errors on first deploy.

---

## Rollback / Reset

- To reset the database to demo seed: use the `db:reset-demo` script locally (`npm run db:reset-demo --workspace=apps/api`). **Do not** use this on production Railway; it drops and recreates the database.
- To re-run migrations: `npm run db:migrate:prod --workspace=apps/api` → `prisma migrate deploy`.
- To regenerate Prisma client: `npm run db:generate --workspace=apps/api` → `prisma generate`.

---

## Local Development (unchanged)

- Run `npm run dev` at repo root (starts API, website, admin concurrently).
- Set local `.env` files as provided (`.env` for API, `.env.local` for website/admin).
- Local ports: API `5000`, Website `3000`, Admin `3001`.
- Do not commit `.env` files — they are listed in `.dockerignore` and should not be in version control.

---

## Summary of Modified / Created Files

| File | Action |
|---|---|
| `docs/railway.md` | **Created** — complete deployment guide |
| (no code changes required) | The existing NestJS/NextJS code already reads the correct env var names (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGINS`, `NEXT_PUBLIC_API_URL`, `DATABASE_URL`, `d PORT`). No implementation changes needed — only Railway variable setup. |

*The only required actions are: set the listed environment variables in the Railway dashboard, and configure the health check URL. The code is production-ready once variables are set.*