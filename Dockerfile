# PSP Server - Cloud Run Dockerfile
# Multi-stage build for optimized production image

FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/adapters/package.json ./packages/adapters/
COPY packages/server/package.json ./packages/server/

# Install all dependencies
RUN npm install

# Copy source files
COPY packages/types ./packages/types
COPY packages/adapters ./packages/adapters
COPY packages/server ./packages/server
COPY tsconfig.json ./

# Build all packages
RUN npm run build

# Production image
FROM node:20-slim

# Install Chromium for Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf \
    libxss1 libx11-xcb1 libxcomposite1 libxcursor1 libxdamage1 libxi6 libxtst6 \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libgbm1 libasound2 \
    dumb-init \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

WORKDIR /app

# Copy built packages
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/packages/adapters/dist ./packages/adapters/dist
COPY --from=builder /app/packages/adapters/package.json ./packages/adapters/
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/server/package.json ./packages/server/

# Install production dependencies only
WORKDIR /app/packages/server
RUN npm install --omit=dev --ignore-scripts

# Create data directory
RUN mkdir -p /app/data && chmod 777 /app/data

ENV PORT=8080
ENV DATA_DIR=/app/data

EXPOSE 8080

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/index.js"]
