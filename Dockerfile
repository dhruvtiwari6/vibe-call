# Step 1: Install dependencies only when needed
FROM node:20-slim AS deps
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    gcc \
    libc6-dev \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package manifests
COPY package.json package-lock.json ./
RUN npm ci

# Step 2: Rebuild the source code only when needed
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable telemetry during the build stage
ENV NEXT_TELEMETRY_DISABLED 1

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js app
# NextJS build-time requires dummy environment variables if not provided
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV REDIS_URL="redis://dummy:6379"
ENV NEXTAUTH_SECRET="dummy_secret_at_least_thirty_two_characters_long"

RUN npm run build

# Step 3: Production runner
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy built assets and compiled node_modules from builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/mediasou_fron.js ./mediasou_fron.js

# Expose HTTP port
EXPOSE 3000

# Expose Mediasoup RTC port ranges
EXPOSE 40000-40100/udp
EXPOSE 40000-40100/tcp

# Run migration/push and start server
CMD ["sh", "-c", "npx prisma db push && npm run start"]
