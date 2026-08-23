# Production Dockerfile for RadarFlow Web Dashboard
FROM node:22-alpine AS base
WORKDIR /app
RUN npm install -g pnpm

# Install dependencies
FROM base AS dependencies
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/sdk/package.json ./packages/sdk/
COPY examples/demo-app/package.json ./examples/demo-app/
RUN pnpm install --frozen-lockfile || pnpm install

# Build SDK & Next.js Web App
FROM dependencies AS builder
COPY . .
RUN pnpm --filter @radarflow/sdk build
RUN pnpm --filter @radarflow/web build

# Production Runner
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web ./apps/web
COPY --from=builder /app/packages/sdk ./packages/sdk
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

WORKDIR /app/apps/web
CMD ["pnpm", "start"]
