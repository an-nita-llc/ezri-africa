# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Build stage — runs in CI (GitHub Actions, 16 GB RAM), never on Render's
# 8 GB Starter pipeline and never on a laptop.
# ---------------------------------------------------------------------------
FROM node:24-bookworm-slim AS builder
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN npm install --global pnpm@12.4.1
WORKDIR /app

# Dependencies first, so Docker layer caching survives source-only changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
# NEXT_PUBLIC_* values are inlined into the client bundle at build time.
ARG NEXT_PUBLIC_API_URL=https://api.ezri-africa.com
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
# Only the image build uses standalone output; the Git-backed Render
# service keeps `next start` (which requires non-standalone output).
ENV NEXT_OUTPUT=standalone
RUN pnpm run build

# ---------------------------------------------------------------------------
# Runtime stage — only the traced standalone server. No source, no dev deps,
# no pnpm store. Keeps the image (and Render's pull) small.
# ---------------------------------------------------------------------------
FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
