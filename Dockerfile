# PSP Server - Fast Cloud Run Dockerfile
# Uses ghcr.io/puppeteer/puppeteer which has Chromium pre-installed

# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/adapters/package.json ./packages/adapters/
COPY packages/server/package.json ./packages/server/

# Skip Chromium - we'll use the pre-installed one in production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Install dependencies quickly
RUN npm install

# Copy source files
COPY packages/types ./packages/types
COPY packages/adapters ./packages/adapters
COPY packages/server ./packages/server
COPY tsconfig.json ./

# Build packages in order
RUN npm run build:types && npm run build:adapters && npm run build:server

# Production stage - use official Puppeteer image with Chromium
FROM ghcr.io/puppeteer/puppeteer:24.15.0

USER root

WORKDIR /app

# Copy built packages
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/packages/adapters/dist ./packages/adapters/dist
COPY --from=builder /app/packages/adapters/package.json ./packages/adapters/
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/server/package.json ./packages/server/

# Install production dependencies
WORKDIR /app/packages/server
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN npm install --omit=dev

# Create data directory
RUN mkdir -p /app/data && chmod 777 /app/data

ENV PORT=8080
ENV DATA_DIR=/app/data
ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "dist/index.js"]
