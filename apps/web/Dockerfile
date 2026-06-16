# Builder GPS — Next.js frontend (standalone single-package build)
# Set Railway "Root Directory" = apps/web and this Dockerfile builds in isolation.
#
# Three stages:
#   deps    -> install pnpm deps for just this app
#   builder -> compile Next.js with output:"standalone"
#   runner  -> minimal node + the standalone server bundle

# ---------- deps ----------
FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --no-frozen-lockfile

# ---------- builder ----------
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

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

RUN pnpm build

# ---------- runner ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Next.js standalone output bundles only what the server actually uses.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
