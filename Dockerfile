FROM node:20-slim AS deps

RUN rm -rf /var/lib/apt/lists/* && \
    apt-get clean && \
    apt-get update --fix-missing && \
    apt-get install -y --no-install-recommends \
        python3 \
        python3-pip \
        make \
        g++ \
        openssl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

# Step 2: Build the application
FROM node:20-slim AS builder

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Generate Prisma Client
RUN npx prisma generate

# Dummy env vars required during Next.js build
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV REDIS_URL="redis://dummy:6379"
ENV NEXTAUTH_SECRET="dummy_secret_at_least_thirty_two_characters_long"

# Build Next.js app
RUN npm run build

# Step 3: Production runner
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy required files from builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# IMPORTANT: Copy the app directory containing app/lib/db.ts
COPY --from=builder /app/app ./app

COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/mediasou_fron.js ./mediasou_fron.js

# Expose HTTP port
EXPOSE 3000

# Expose Mediasoup RTC port range
EXPOSE 40000-40100/udp
EXPOSE 40000-40100/tcp

# Run Prisma sync and start server
CMD ["sh", "-c", "npx prisma db push && npm run start"]