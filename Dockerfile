# Use Node.js LTS as base image
FROM node:20-alpine AS base

# ---- Dependencies ----
FROM base AS dependencies
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile
COPY apps/api/prisma/schema.prisma apps/api/prisma/schema.prisma
RUN pnpm --filter @studypilot/api db:generate

# ---- Build ----
FROM dependencies AS builder
WORKDIR /app
COPY . .
RUN pnpm --filter @studypilot/api build

# ---- Production ----
FROM base AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["node", "dist/main"]
