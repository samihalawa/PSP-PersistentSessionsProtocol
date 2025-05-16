# PSP Environment Setup Guide

This guide walks through setting up your environment for the Persistent Sessions Protocol (PSP) across different platforms and components.

## Table of Contents

- [Development Environment](#development-environment)
- [Playwright Integration](#playwright-integration)
- [Selenium Integration](#selenium-integration) 
- [Storage Backends](#storage-backends)
  - [Local Storage Setup](#local-storage-setup)
  - [Cloudflare Worker Setup](#cloudflare-worker-setup)
  - [S3 Storage Setup](#s3-storage-setup)
  - [Supabase Setup](#supabase-setup)
- [UI Deployment](#ui-deployment)
- [Environment Variables](#environment-variables)
- [Docker Setup](#docker-setup)
- [CI/CD Integration](#cicd-integration)

## Development Environment

### Prerequisites

- Node.js (v14 or newer)
- npm or yarn
- Git

### Basic Setup

1. Clone the repository:

```bash
git clone https://github.com/samihalawa/PSP-PersistentSessionsProtocol.git
cd PSP-PersistentSessionsProtocol
```

2. Install dependencies:

```bash
npm install
```

3. Build the packages:

```bash
npm run build
```

## Playwright Integration

### Prerequisites

- Playwright (v1.18.0 or newer)

### Installation

```bash
# Install Playwright
npm install playwright

# Install PSP Playwright adapter
npm install @psp/core @psp/playwright
```

### Browser Installation

Make sure Playwright browsers are installed:

```bash
npx playwright install
```

### Basic Configuration

Create a configuration file (e.g., `psp.config.js`):

```javascript
// psp.config.js
module.exports = {
  storage: {
    type: 'local',
    path: './sessions'
  },
  browsers: {
    defaultBrowser: 'chromium',
    headless: false
  }
};
```

## Selenium Integration

### Prerequisites

- Selenium WebDriver
- Browser drivers (ChromeDriver, GeckoDriver, etc.)

### Installation

```bash
# Install Selenium
npm install selenium-webdriver

# Install PSP Selenium adapter
npm install @psp/core @psp/selenium
```

### WebDriver Setup

Ensure browser drivers are in your PATH:

```bash
# Example for Chrome (use the correct version for your Chrome installation)
npm install -g chromedriver

# Or for Firefox
npm install -g geckodriver
```

### Basic Configuration

```javascript
// selenium-psp.config.js
module.exports = {
  storage: {
    type: 'local',
    path: './selenium-sessions'
  },
  webdriver: {
    browser: 'chrome',
    capabilities: {
      // Any additional capabilities
    }
  }
};
```

## Storage Backends

PSP supports multiple storage options. Choose the one that best fits your needs.

### Local Storage Setup

This is the simplest setup, requiring no external dependencies:

```javascript
const { createStorageProvider } = require('@psp/core');

const storage = createStorageProvider({
  type: 'local',
  path: './sessions'
});
```

Ensure the directory exists and has proper permissions:

```bash
mkdir -p sessions
chmod 755 sessions
```

### Cloudflare Worker Setup

For global, serverless storage access:

#### Prerequisites

- Cloudflare account
- Wrangler CLI installed (`npm install -g wrangler`)

#### Deployment Steps

1. Navigate to the worker directory:

```bash
cd packages/storage-worker
```

2. Login to Cloudflare (if not already logged in):

```bash
wrangler login
```

3. Create a KV namespace:

```bash
wrangler kv:namespace create PSP_SESSIONS
# Note the ID returned
```

4. Update `wrangler.toml` with your KV namespace ID:

```toml
[[env.production.kv_namespaces]]
binding = "PSP_SESSIONS"
id = "your-kv-namespace-id"
```

5. Deploy the worker:

```bash
wrangler deploy
```

6. Configure your PSP client to use the worker:

```javascript
const { createStorageProvider } = require('@psp/core');

const storage = createStorageProvider({
  type: 'cloudflare',
  endpoint: 'https://your-worker.workers.dev',
  apiKey: 'your-api-key' // If configured
});
```

### S3 Storage Setup

For AWS S3 or S3-compatible storage:

#### Prerequisites

- AWS account or S3-compatible service account
- AWS CLI configured or access credentials

#### Setup Steps

1. Create an S3 bucket:

```bash
aws s3 mb s3://psp-sessions
```

2. Create an IAM user with appropriate permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::psp-sessions",
        "arn:aws:s3:::psp-sessions/*"
      ]
    }
  ]
}
```

3. Configure your PSP client:

```javascript
const { createStorageProvider } = require('@psp/core');

const storage = createStorageProvider({
  type: 's3',
  region: 'us-east-1',
  bucket: 'psp-sessions',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});
```

For S3-compatible services like MinIO:

```javascript
const storage = createStorageProvider({
  type: 's3',
  region: 'us-east-1',
  bucket: 'psp-sessions',
  endpoint: 'https://your-minio-server.com',
  forcePathStyle: true,
  accessKeyId: process.env.MINIO_ACCESS_KEY,
  secretAccessKey: process.env.MINIO_SECRET_KEY
});
```

### Supabase Setup

For storage with built-in authentication:

#### Prerequisites

- Supabase account
- Supabase project created

#### Setup Steps

1. Create a Supabase project at [app.supabase.com](https://app.supabase.com).

2. Create a storage bucket:
   - Go to Storage in the Supabase dashboard
   - Create a new bucket named "sessions"
   - Set RLS policies as needed

3. Get your Supabase URL and anon key from the project settings.

4. Configure your PSP client:

```javascript
const { createStorageProvider } = require('@psp/core');

const storage = createStorageProvider({
  type: 'supabase',
  url: 'https://your-project.supabase.co',
  apiKey: process.env.SUPABASE_KEY,
  bucket: 'sessions'
});
```

## UI Deployment

The Simple UI provides a web interface for session management.

### Prerequisites

- Web server (for production) or `npx serve` (for development)
- Supabase project (for authentication)

### Setup Steps

1. Configure Supabase:
   - Set up authentication in your Supabase project
   - Enable Email/Password sign-in method

2. Update the UI configuration:

```javascript
// config.js in the simple-ui directory
export const SUPABASE_CONFIG = {
  url: 'https://your-project.supabase.co',
  key: 'your-supabase-anon-key',
};

export const DEFAULT_API_ENDPOINT = 'https://your-psp-worker.workers.dev';
```

3. Deploy to a static hosting service:

```bash
# Using Netlify CLI
npm install -g netlify-cli
cd packages/simple-ui
netlify deploy

# Or simply serve locally
npx serve packages/simple-ui
```

## Environment Variables

For secure deployment, use environment variables:

### Core Environment Variables

```bash
# Storage type
PSP_STORAGE_TYPE=cloudflare

# Cloudflare configuration
PSP_CLOUDFLARE_ENDPOINT=https://your-worker.workers.dev
PSP_CLOUDFLARE_API_KEY=your-api-key

# S3 configuration
PSP_S3_REGION=us-east-1
PSP_S3_BUCKET=psp-sessions
PSP_S3_ACCESS_KEY_ID=your-access-key
PSP_S3_SECRET_ACCESS_KEY=your-secret-key

# Supabase configuration
PSP_SUPABASE_URL=https://your-project.supabase.co
PSP_SUPABASE_KEY=your-supabase-key
PSP_SUPABASE_BUCKET=sessions
```

### Loading Environment Variables

In Node.js:

```javascript
// Load from .env file
require('dotenv').config();

const { createPSPClient } = require('@psp/playwright');

// Use environment variables
const psp = createPSPClient({
  storage: {
    type: process.env.PSP_STORAGE_TYPE || 'local',
    // Other configs based on type...
  }
});
```

## Docker Setup

For containerized environments:

### Dockerfile

```dockerfile
FROM node:16-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Build packages
RUN npm run build

# Set environment variables
ENV PSP_STORAGE_TYPE=cloudflare
ENV PSP_CLOUDFLARE_ENDPOINT=https://your-worker.workers.dev

# Run your tests or application
CMD ["npm", "test"]
```

### Docker Compose

For local development with multiple services:

```yaml
version: '3'
services:
  app:
    build: .
    environment:
      - PSP_STORAGE_TYPE=local
      - PSP_LOCAL_PATH=/app/sessions
    volumes:
      - ./sessions:/app/sessions
  
  minio:
    image: minio/minio
    ports:
      - "9000:9000"
    environment:
      - MINIO_ACCESS_KEY=minioadmin
      - MINIO_SECRET_KEY=minioadmin
    command: server /data
```

## CI/CD Integration

### GitHub Actions

```yaml
name: PSP Tests

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: 16
    
    - name: Install dependencies
      run: npm ci
    
    - name: Install Playwright browsers
      run: npx playwright install --with-deps
      
    - name: Build packages
      run: npm run build
      
    - name: Run tests
      env:
        PSP_STORAGE_TYPE: local
        PSP_LOCAL_PATH: ./sessions
      run: npm test
```

### CircleCI

```yaml
version: 2.1
jobs:
  build-and-test:
    docker:
      - image: cimg/node:16.13-browsers
    
    steps:
      - checkout
      
      - run:
          name: Install dependencies
          command: npm install
      
      - run:
          name: Install Playwright browsers
          command: npx playwright install --with-deps
      
      - run:
          name: Build packages
          command: npm run build
      
      - run:
          name: Run tests
          command: npm test
          environment:
            PSP_STORAGE_TYPE: local
            PSP_LOCAL_PATH: ./sessions

workflows:
  version: 2
  build-test:
    jobs:
      - build-and-test
```

## Troubleshooting

### Common Issues

#### Storage Errors

- **Cannot access local storage directory**:
  - Ensure the directory exists and has proper permissions
  - Check for path typos in your configuration

- **Cloudflare connectivity issues**:
  - Verify your API endpoint URL
  - Check API key permissions
  - Inspect Cloudflare Worker logs in the dashboard

- **S3 access denied**:
  - Verify IAM permissions
  - Check bucket policies
  - Ensure access keys are correct

#### Browser Automation Issues

- **Playwright browser not launching**:
  - Run `npx playwright install` to ensure browsers are installed
  - Check for compatibility issues with your Node.js version

- **Selenium WebDriver errors**:
  - Verify browser driver versions match your installed browsers
  - Ensure browser drivers are in your PATH

#### Session Restoration Problems

- **Session not restoring correctly**:
  - Check if the session was captured from a different domain
  - Verify cookies are not HttpOnly (these cannot be fully restored)
  - Ensure the session format hasn't changed between versions

### Getting Help

- File an issue on [GitHub](https://github.com/samihalawa/PSP-PersistentSessionsProtocol/issues)
- Check the [documentation](docs/README.md) for detailed guides
- Join our community discussions