# PSP Server Lite - Minimal API Server
# No Puppeteer dependency = fast builds

FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (fast - no Puppeteer!)
RUN npm install

# Copy source
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Create data directory
RUN mkdir -p /app/data && chmod 777 /app/data

ENV PORT=8080
ENV DATA_DIR=/app/data
ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "dist/index.js"]
