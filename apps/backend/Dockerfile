# ==========================================
# Backend Service Dockerfile
# Monorepo context: apps/backend
# ==========================================

FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

# Copy root monorepo configs & workspace package definitions
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY shared/package.json ./shared/

# Install dependencies
RUN npm ci || npm install

# Copy backend & shared source
COPY shared ./shared
COPY backend ./backend

# Generate Prisma Client & compile TypeScript
RUN npm run db:generate --workspace=backend
RUN npm run build --workspace=backend

# ==========================================
# Production Runner Image
# ==========================================
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/package.json ./backend/package.json
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/shared ./shared

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy --schema=backend/prisma/schema.prisma && node backend/dist/server.js"]
