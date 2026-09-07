# syntax=docker/dockerfile:1
# =============================================================================
# Gravits Edge Consultant — Job Search Portal (monorepo)
#
# A single root Dockerfile for all three deployable services.
#
#   Build a specific service with:
#     docker build --build-arg APP=api        -t jp-api .
#     docker build --build-arg APP=website    -t jp-website .
#     docker build --build-arg APP=admin      -t jp-admin .
#
# The build context MUST be the repository root so that npm workspaces, the
# shared package and the root `prisma/` schema are all visible.
#
# Railway service settings:
#   Root directory : (empty / repository root)
#   Dockerfile     : Dockerfile
#   Build args     : APP set per service (api | website | admin)
#                    NEXT_PUBLIC_API_URL for website/admin
# =============================================================================

ARG NODE_VERSION=20

# ---------------------------------------------------------------------------
# deps — install all workspace dependencies (hoisted to /app/node_modules)
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Copy manifests first for better layer caching
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/website/package.json apps/website/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY prisma ./prisma

RUN npm ci

# Generate the Prisma client from the root schema
RUN npx prisma generate --schema=prisma/schema.prisma

# ---------------------------------------------------------------------------
# build — compile the requested service
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js inlines NEXT_PUBLIC_* values at build time, so it must be a build arg
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages

# Build the shared package first (skipped gracefully if unused/empty)
RUN npm run build --workspace=@job-portal/shared 2>/dev/null || true

# Build only the selected service
ARG APP=api
ENV APP=$APP
RUN NODE_OPTIONS="--max-old-space-size=4096" sh -c \
    'case "$APP" in \
       api)     npm run build --workspace=apps/api ;; \
       website) npm run build --workspace=apps/website ;; \
       admin)   npm run build --workspace=apps/admin ;; \
       *) echo "Unknown APP=$APP"; exit 1 ;; \
     esac'

# ---------------------------------------------------------------------------
# prod — production-only dependency tree
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS prod
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
RUN npm prune --omit=dev

# ---------------------------------------------------------------------------
# runtime — slim final image
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

ARG APP=api
ENV APP=$APP

# Writable local-storage dir (multer local driver)
RUN mkdir -p /app/storage && chown -R node:node /app/storage

COPY --from=prod --chown=node:node /app/node_modules ./node_modules
COPY --from=prod --chown=node:node /app/prisma ./prisma
COPY --from=prod --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/apps ./apps
COPY --from=build --chown=node:node /app/packages ./packages

USER node
EXPOSE 8080

CMD ["sh", "-c", \
  "case \"$APP\" in \
     api) \
       npx prisma migrate deploy --schema=prisma/schema.prisma && \
       node apps/api/dist/main.js ;; \
     website) \
       cd apps/website && npx next start -p ${PORT:-8080} ;; \
     admin) \
       cd apps/admin && npx next start -p ${PORT:-8080} ;; \
     *) echo \"Unknown APP=$APP\"; exit 1 ;; \
   esac"]
