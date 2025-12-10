FROM node:20-slim

# Install dependencies for Puppeteer (Chrome)
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Skip downloading Chrome we use the installed one
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package.json tsconfig.json ./
RUN npm install

COPY src ./src
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
