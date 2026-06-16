# Builder GPS — Next.js frontend (pnpm monorepo)
# Build context is the REPO ROOT so this Dockerfile can see
# pnpm-workspace.yaml + packages/shared/.
#
# Railway config:
#   Root Directory = .                       (repo root)
#   Dockerfile Path = apps/web/Dockerfile
#
# Three stages:
#   deps    -> install pnpm workspace deps (cached on lockfile changes)
#   builder -> compile Next.js with output:"standalone"
#   runner  -> minimal alpine + node, run the standalone server.js

# ---------- deps ----------
FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy workspace manifests for max layer caching.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile

# ---------- builder ----------
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Pull the resolved node_modules from deps.
# packages/shared has no runtime deps of its own, so pnpm doesn't create
# a node_modules folder there — only copy the ones that exist.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Now the source.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/web ./apps/web
COPY packages/shared ./packages/shared

# NEXT_PUBLIC_* vars are INLINED AT BUILD TIME — Railway must pass these in
# as build args/env or the bundle will contain empty strings.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_DEVPOST_URL
ARG NEXT_PUBLIC_GITHUB_URL
ARG NEXT_PUBLIC_DEMO_VIDEO_URL
ARG NEXT_PUBLIC_MCP_PACKAGE_PUBLISHED
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_DEVPOST_URL=${NEXT_PUBLIC_DEVPOST_URL}
ENV NEXT_PUBLIC_GITHUB_URL=${NEXT_PUBLIC_GITHUB_URL}
ENV NEXT_PUBLIC_DEMO_VIDEO_URL=${NEXT_PUBLIC_DEMO_VIDEO_URL}
ENV NEXT_PUBLIC_MCP_PACKAGE_PUBLISHED=${NEXT_PUBLIC_MCP_PACKAGE_PUBLISHED}

RUN pnpm --filter @builder-gps/web build

# ---------- runner ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Next.js standalone bundles node_modules it actually uses + a thin server.js.
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000

# Bind to 0.0.0.0 (default in standalone server) so Railway can reach it.
CMD ["node", "apps/web/server.js"]
