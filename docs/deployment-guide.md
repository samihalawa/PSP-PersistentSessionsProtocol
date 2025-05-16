# PSP Deployment Guide

This guide walks through the setup and deployment of the various components in the Persistent Sessions Protocol (PSP) ecosystem.

## Table of Contents

- [Storage Providers](#storage-providers)
  - [Local Storage](#local-storage)
  - [Cloudflare Workers](#cloudflare-workers)
  - [AWS S3 / S3-Compatible](#aws-s3--s3-compatible)
  - [Supabase](#supabase)
- [UI Deployment](#ui-deployment)
  - [Simple UI](#simple-ui)
- [Client Libraries](#client-libraries)
  - [Browser Clients](#browser-clients)
  - [Automation Frameworks](#automation-frameworks)
- [Environment Variables](#environment-variables)
- [Security Considerations](#security-considerations)

## Storage Providers

PSP offers multiple storage options to fit your specific needs, from simple local storage to fully managed cloud services.

### Local Storage

The simplest storage method, requiring no setup but only accessible on the local machine.

**Setup:**

1. Configure in your application:

```javascript
const { createStorageProvider } = require('@psp/core');

const storage = createStorageProvider({
  type: 'local',
  basePath: './sessions' // Path to store session files
});
```

**Pros:**
- Simple, no external dependencies
- No latency for local testing

**Cons:**
- Not accessible from other machines
- No backup or redundancy

### Cloudflare Workers

Deploy a serverless API for session storage using Cloudflare Workers and KV/R2 storage.

**Prerequisites:**
- Cloudflare account
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed

**Deployment Steps:**

1. Clone or copy the worker code:

```bash
mkdir psp-worker && cd psp-worker
cp /path/to/PSP-PersistentSessionsProtocol/packages/storage-worker/* ./
```

2. Update `wrangler.toml` with your Cloudflare KV namespace ID:

```toml
name = "psp-worker"
main = "src/index.ts"
compatibility_date = "2023-05-17"

[vars]
# Optional API keys for securing your endpoints
# API_KEYS = "key1,key2,key3"

[[kv_namespaces]]
binding = "PSP_SESSIONS"
id = "YOUR_KV_NAMESPACE_ID"
```

3. Create the KV namespace if you haven't already:

```bash
wrangler kv:namespace create "PSP_SESSIONS"
# Note the ID returned and update wrangler.toml
```

4. Deploy the worker:

```bash
wrangler publish
```

5. Configure your client to use the worker:

```javascript
const { createStorageProvider } = require('@psp/core');

const storage = createStorageProvider({
  type: 'cloudflare',
  endpoint: 'https://psp-worker.your-domain.workers.dev',
  apiKey: 'your-api-key' // If configured
});
```

**R2 Configuration (Optional):**

For larger sessions, you can use Cloudflare R2 storage:

1. Create an R2 bucket:

```bash
wrangler r2 bucket create psp-sessions
```

2. Update `wrangler.toml`:

```toml
[[r2_buckets]]
binding = "PSP_SESSIONS_BUCKET"
bucket_name = "psp-sessions"
```

### AWS S3 / S3-Compatible

Use AWS S3 or S3-compatible storage (MinIO, Backblaze B2, etc.) for session data.

**Prerequisites:**
- AWS account or S3-compatible service
- S3 bucket created
- IAM user with appropriate permissions

**Setup:**

1. Create a bucket for session storage.

2. Create an IAM user with these permissions:
   - `s3:GetObject`
   - `s3:PutObject`
   - `s3:DeleteObject`
   - `s3:ListBucket`

3. Configure your client:

```javascript
const { createStorageProvider } = require('@psp/core');

const storage = createStorageProvider({
  type: 's3',
  region: 'us-east-1',
  bucket: 'your-psp-sessions-bucket',
  prefix: 'sessions/',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});
```

**For S3-compatible services:**

```javascript
const storage = createStorageProvider({
  type: 's3',
  region: 'us-east-1',
  bucket: 'your-psp-sessions-bucket',
  endpoint: 'https://s3.your-service.com',
  forcePathStyle: true, // Usually true for non-AWS services
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY
});
```

### Supabase

Use Supabase for both authentication and session storage.

**Prerequisites:**
- Supabase account
- Supabase project created

**Setup:**

1. Create a new Supabase project.

2. Create a storage bucket:
   - Go to Storage in the Supabase dashboard
   - Create a new bucket named "sessions"
   - Set appropriate RLS policies

3. (Optional) Create a metadata table:

```sql
CREATE TABLE psp_sessions (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  origin TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  tags TEXT[],
  created_by TEXT,
  framework TEXT
);

-- RLS policies to control access
ALTER TABLE psp_sessions ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own sessions
CREATE POLICY "Users can view their own sessions" ON psp_sessions
  FOR SELECT USING (auth.uid()::text = created_by);

-- Allow users to create their own sessions
CREATE POLICY "Users can create their own sessions" ON psp_sessions
  FOR INSERT WITH CHECK (auth.uid()::text = created_by);

-- Allow users to update their own sessions
CREATE POLICY "Users can update their own sessions" ON psp_sessions
  FOR UPDATE USING (auth.uid()::text = created_by);

-- Allow users to delete their own sessions
CREATE POLICY "Users can delete their own sessions" ON psp_sessions
  FOR DELETE USING (auth.uid()::text = created_by);
```

4. Configure your client:

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

### Simple UI

The PSP Simple UI provides a web interface for managing sessions.

**Deployment Steps:**

1. Prepare the UI files:

```bash
cd /path/to/PSP-PersistentSessionsProtocol/packages/simple-ui
```

2. Configure the UI:
   - Edit `config.js` with your Supabase and API endpoints

```javascript
// config.js
const SUPABASE_CONFIG = {
  url: 'https://your-project.supabase.co',
  key: 'your-supabase-anon-key',
};

const DEFAULT_API_ENDPOINT = 'https://your-psp-worker.workers.dev';
```

3. Deploy to a static hosting service (e.g., Netlify, Vercel, GitHub Pages).

For GitHub Pages:
```bash
# Assuming you're in the gh-pages branch
cp -r packages/simple-ui/* docs/ui/
git add docs/ui/
git commit -m "Add simple UI for session management"
git push
```

For Netlify:
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --dir ./
```

## Client Libraries

### Browser Clients

For direct browser integration:

```javascript
// Direct browser usage
import { PSPClient } from '@psp/browser';

const psp = new PSPClient({
  storage: {
    type: 'cloudflare',
    endpoint: 'https://your-psp-worker.workers.dev'
  }
});

// Capture current tab
const sessionId = await psp.captureCurrentTab({
  name: 'My Session',
  description: 'Authentication state for the app'
});

// Restore a session
await psp.restoreSession(sessionId);
```

### Automation Frameworks

For Playwright:

```javascript
// Playwright integration
import { chromium } from 'playwright';
import { PlaywrightPSP } from '@psp/playwright';

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

const psp = new PlaywrightPSP({
  storage: {
    type: 'cloudflare',
    endpoint: 'https://your-psp-worker.workers.dev'
  }
});

// Capture a session
await page.goto('https://example.com');
const sessionId = await psp.captureSession(page);

// Restore a session
await psp.restoreSession(page, sessionId);
```

For Selenium:

```javascript
// Selenium integration
import { Builder } from 'selenium-webdriver';
import { SeleniumPSP } from '@psp/selenium';

const driver = new Builder().forBrowser('chrome').build();

const psp = new SeleniumPSP({
  storage: {
    type: 's3',
    region: 'us-east-1',
    bucket: 'psp-sessions'
  }
});

// Capture a session
await driver.get('https://example.com');
const sessionId = await psp.captureSession(driver);

// Restore a session
await psp.restoreSession(driver, sessionId);
```

## Environment Variables

For secure deployment, use environment variables instead of hardcoding sensitive values:

**Core environment variables:**

```
PSP_STORAGE_TYPE=cloudflare
PSP_CLOUDFLARE_ENDPOINT=https://your-worker.workers.dev
PSP_CLOUDFLARE_API_KEY=your-api-key

# For S3
PSP_S3_REGION=us-east-1
PSP_S3_BUCKET=your-bucket
PSP_S3_ACCESS_KEY_ID=your-access-key
PSP_S3_SECRET_ACCESS_KEY=your-secret-key

# For Supabase
PSP_SUPABASE_URL=https://your-project.supabase.co
PSP_SUPABASE_KEY=your-api-key
PSP_SUPABASE_BUCKET=sessions
```

**Cloudflare Worker environment variables:**

Set these in the Cloudflare dashboard or via wrangler:

```bash
wrangler secret put API_KEYS
# Enter your comma-separated API keys
```

## Security Considerations

1. **API Keys**: Always use API keys to protect your storage endpoints.

2. **Data Encryption**: Sensitive data (cookies, auth tokens) should be encrypted:
   ```javascript
   const psp = new PSPClient({
     encryption: {
       enabled: true,
       password: process.env.PSP_ENCRYPTION_KEY
     }
   });
   ```

3. **Session Expiration**: Set expiration times for sessions:
   ```javascript
   const sessionId = await psp.captureSession(page, {
     expireAfter: 60 * 60 * 24 // 24 hours in seconds
   });
   ```

4. **Permissions**: Use minimal permissions for your storage services:
   - For S3: Limit IAM permissions to specific bucket/path
   - For Supabase: Use Row Level Security policies
   - For Cloudflare: Use Workers service bindings with limited permissions

5. **Content Security**: Never store XSS vectors or malicious content.

6. **Data Minimization**: Only capture the necessary browser state.