# ==============================================================================
# WelfareIntel Frontend Production Dockerfile (TanStack Start + Nitro Server)
# ==============================================================================

# Stage 1: Build the TanStack Start full-stack bundle
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package configurations and install dependencies
COPY package*.json ./
RUN npm ci --legacy-peer-deps || npm install

# Copy application source and configuration
COPY . .

# Set production API fallback and build output via Nitro
ENV NODE_ENV=production
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Minimal Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=8081 \
    HOST=0.0.0.0

# Copy built artifacts from stage 1
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package*.json ./

EXPOSE 8081

# Start the Nitro standalone server bundle
CMD ["node", ".output/server/index.mjs"]
