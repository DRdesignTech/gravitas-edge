# Gravitas Edge Consulting

Production-grade monorepo for the Gravitas Edge Consulting job platform — local development only.

## Architecture

```
job-portal/
├── apps/
│   ├── website/     # Next.js user website        (localhost:3000)
│   ├── admin/       # Next.js admin panel          (localhost:3001)
│   └── api/         # NestJS REST API              (localhost:5000)
├── packages/
│   └── shared/      # Shared types & utilities
├── prisma/          # Prisma schema (PostgreSQL)
├── docs/            # Documentation
└── package.json     # npm workspaces root
```

Data flow (frontend never touches PostgreSQL directly):

```
Website / Admin
      ↓  (REST)
  NestJS API
      ↓  (Prisma)
  PostgreSQL
```

## Tech Stack

- Website / Admin: Next.js 14 + TypeScript + Tailwind CSS
- Backend: NestJS 10 + TypeScript + Prisma ORM
- Database: PostgreSQL
- Payments: Razorpay (test mode, local)
- File storage: Local abstraction (switchable to S3 later)

## Prerequisites

- Node.js >= 18
- PostgreSQL running locally

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy each `.env.example` to its real file and fill in values:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/website/.env.example apps/website/.env.local
cp apps/admin/.env.example apps/admin/.env.local
```

Never commit real `.env` files.

### 3. Database

```bash
# Create the database (one time)
createdb job_portal

# Generate Prisma client
npm run db:generate

# Push schema (or use migrations in later phases)
npm run db:push
```

### 4. Run everything

```bash
npm run dev
```

Or run individually:

```bash
npm run dev:api       # http://localhost:5000
npm run dev:website   # http://localhost:3000
npm run dev:admin     # http://localhost:3001
```

## Ports

| Service  | URL                    |
|----------|------------------------|
| Website  | http://localhost:3000  |
| Admin    | http://localhost:3001  |
| API      | http://localhost:5000  |
| API docs | http://localhost:5000/api/docs |

## Scripts

| Command            | Description                          |
|--------------------|--------------------------------------|
| `npm run dev`      | Start all apps concurrently          |
| `npm run build`    | Build all workspaces                  |
| `npm run lint`     | Lint all workspaces                   |
| `npm run format`   | Format all code with Prettier         |
| `npm run db:push`  | Push Prisma schema to DB              |
| `npm run db:studio`| Open Prisma Studio                    |

## Repo audit

This is a brand-new codebase. No existing business modules (users,
subscriptions, referrals, resumes, opportunities, payments, analytics)
are implemented yet. They will be added incrementally.
