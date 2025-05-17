# Integrating PSP with Playwright

This guide explains how to integrate the Persistent Sessions Protocol (PSP) with your existing Playwright automation projects.

## Installation

First, install the PSP core package and Playwright adapter:

```bash
npm install @psp/core @psp/playwright
```

## Basic Integration

### Capturing a Session

```javascript
const { chromium } = require('playwright');
const { createPSPClient } = require('@psp/playwright');

async function captureLoginSession() {
  // Initialize PSP client
  const psp = createPSPClient({
    storage: {
      type: 'local',
      path: './sessions'
    }
  });
  
  // Launch browser and navigate to site
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Navigate to login page
  await page.goto('https://example.com/login');
  
  // Perform login
  await page.fill('#username', 'user@example.com');
  await page.fill('#password', 'password123');
  await page.click('#login-button');
  
  // Wait for login to complete
  await page.waitForURL('https://example.com/dashboard');
  
  // Capture the session
  const sessionId = await psp.captureSession(page, {
    name: 'Example Login',
    description: 'Authenticated dashboard session',
    tags: ['login', 'dashboard']
  });
  
  console.log(`Session saved with ID: ${sessionId}`);
  await browser.close();
  
  return sessionId;
}
```

### Restoring a Session

```javascript
const { chromium } = require('playwright');
const { createPSPClient } = require('@psp/playwright');

async function restoreSession(sessionId) {
  // Initialize PSP client (same configuration as capture)
  const psp = createPSPClient({
    storage: {
      type: 'local',
      path: './sessions'
    }
  });
  
  // Launch a new browser
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Restore the session
  await psp.restoreSession(page, sessionId);
  
  // Now you can navigate directly to authenticated pages
  await page.goto('https://example.com/dashboard/profile');
  
  // The session is fully restored, no login required
  return page;
}
```

## Advanced Integration

### With Testing Frameworks

#### Using with Jest

```javascript
const { chromium } = require('playwright');
const { createPSPClient } = require('@psp/playwright');

let sessionId;
let psp;

// Before all tests, capture a login session once
beforeAll(async () => {
  psp = createPSPClient({
    storage: {
      type: 'local',
      path: './sessions'
    }
  });
  
  // Use existing session or create new one
  try {
    const sessions = await psp.listSessions({
      tags: ['login'],
      limit: 1
    });
    
    if (sessions.length > 0) {
      sessionId = sessions[0].id;
      console.log(`Using existing session: ${sessionId}`);
    } else {
      sessionId = await captureLoginSession();
    }
  } catch (error) {
    // Capture new session if anything fails
    sessionId = await captureLoginSession();
  }
});

// Helper function to get authenticated page for each test
async function getAuthenticatedPage() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await psp.restoreSession(page, sessionId);
  return { browser, page };
}

test('User can access profile page', async () => {
  const { browser, page } = await getAuthenticatedPage();
  
  try {
    await page.goto('https://example.com/profile');
    const username = await page.textContent('.username');
    expect(username).toBe('user@example.com');
  } finally {
    await browser.close();
  }
});
```

#### Using with Playwright Test

```javascript
// psp-setup.js
const { createPSPClient } = require('@psp/playwright');
const psp = createPSPClient({
  storage: {
    type: 'local',
    path: './sessions'
  }
});

let sessionId = null;

async function getSessionId() {
  if (sessionId) return sessionId;
  
  try {
    const sessions = await psp.listSessions({
      tags: ['login'],
      limit: 1
    });
    
    if (sessions.length > 0) {
      sessionId = sessions[0].id;
    } else {
      // You'd need to implement this function to capture a new session
      sessionId = await captureLoginSession();
    }
    return sessionId;
  } catch (error) {
    throw new Error(`Failed to get session ID: ${error.message}`);
  }
}

// playwright.config.js
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  globalSetup: './psp-setup.js',
  use: {
    // Save the session ID in the context
    extraHTTPHeaders: {
      'x-psp-session-id': process.env.PSP_SESSION_ID
    }
  }
});

// tests/profile.spec.js
const { test, expect } = require('@playwright/test');
const { createPSPClient } = require('@psp/playwright');

test('Profile page works', async ({ page, context }) => {
  // Get session ID from context
  const sessionId = context.extraHTTPHeaders['x-psp-session-id'];
  
  // Restore session
  const psp = createPSPClient({
    storage: {
      type: 'local',
      path: './sessions'
    }
  });
  
  await psp.restoreSession(page, sessionId);
  
  // Now test with authenticated state
  await page.goto('https://example.com/profile');
  await expect(page.locator('.username')).toHaveText('user@example.com');
});
```

### With CI/CD

When running in CI/CD environments, you might want to use a remote storage provider:

```javascript
const { chromium } = require('playwright');
const { createPSPClient } = require('@psp/playwright');

// Read configuration from environment variables
const psp = createPSPClient({
  storage: {
    type: process.env.PSP_STORAGE_TYPE || 'local',
    
    // For Cloudflare storage
    endpoint: process.env.PSP_CLOUDFLARE_ENDPOINT,
    apiKey: process.env.PSP_CLOUDFLARE_API_KEY,
    
    // For S3 storage
    region: process.env.PSP_S3_REGION,
    bucket: process.env.PSP_S3_BUCKET,
    accessKeyId: process.env.PSP_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.PSP_S3_SECRET_ACCESS_KEY,
    
    // For local storage
    path: process.env.PSP_LOCAL_PATH || './sessions'
  }
});
```

## Best Practices

1. **Authenticate once, test many times**:
   - Capture authentication sessions separately from your tests
   - Reuse sessions when possible to reduce login burden

2. **Use meaningful metadata**:
   - Add descriptive names and tags to your sessions
   - Include expiration dates for sensitive sessions

3. **Handle failure gracefully**:
   - Always include fallback login logic if session restoration fails
   - Regularly refresh long-lived sessions

4. **Organize sessions by feature**:
   - Use different sessions for different feature areas
   - Use tags to categorize sessions

5. **Clean up old sessions**:
   - Implement a cleanup strategy for outdated sessions
   - Set appropriate TTL values

## Troubleshooting

### Session Restoration Fails

If session restoration fails, check these common issues:

1. **Session expired**: The server may have invalidated the session. Create a new session.
2. **Different domains**: Ensure you're restoring on the same domain where you captured.
3. **HttpOnly cookies**: Some cookies can't be programmatically accessed or restored.
4. **Session format mismatch**: Ensure you're using the same PSP version for capture and restore.

### Storage Connection Issues

If you're having trouble connecting to storage:

1. **Check credentials**: Verify API keys and access credentials are correct.
2. **Network issues**: Ensure your environment has access to the storage service.
3. **Permissions**: Verify the storage account has appropriate permissions.

## Complete Example Project

Here's a full example project structure:

```
playwright-psp-example/
├── package.json
├── playwright.config.js
├── psp-setup.js
├── sessions/
└── tests/
    ├── auth.setup.js
    ├── profile.spec.js
    └── dashboard.spec.js
```

```javascript
// auth.setup.js
const { chromium } = require('playwright');
const { createPSPClient } = require('@psp/playwright');

async function captureLoginSession() {
  const psp = createPSPClient({
    storage: {
      type: 'local',
      path: './sessions'
    }
  });
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto('https://example.com/login');
    await page.fill('#username', 'user@example.com');
    await page.fill('#password', 'password123');
    await page.click('#login-button');
    await page.waitForURL('https://example.com/dashboard');
    
    return await psp.captureSession(page, {
      name: 'Example Login',
      description: 'Basic authenticated session',
      tags: ['login']
    });
  } finally {
    await browser.close();
  }
}

module.exports = { captureLoginSession };
```

This structure allows for a clean separation of session management from your actual tests, making maintenance easier.

## Using PSP with Playwright Test Fixtures

You can create a custom fixture to automatically provide authenticated pages:

```javascript
// fixtures.js
const base = require('@playwright/test');
const { createPSPClient } = require('@psp/playwright');

const psp = createPSPClient({
  storage: {
    type: 'local',
    path: './sessions'
  }
});

// Define a custom fixture for an authenticated page
exports.test = base.test.extend({
  // Define an authedPage fixture
  authedPage: async ({ page, browser }, use) => {
    // Get or create session ID
    let sessionId;
    try {
      const sessions = await psp.listSessions({ limit: 1, tags: ['login'] });
      if (sessions.length > 0) {
        sessionId = sessions[0].id;
      } else {
        // Capture a new session
        // Implementation of captureSession function would go here
        sessionId = await captureSession(browser);
      }
      
      // Restore the session to the page
      await psp.restoreSession(page, sessionId);
      
      // Use the authenticated page
      await use(page);
    } catch (error) {
      console.error('Failed to create authenticated page:', error);
      throw error;
    }
  }
});

exports.expect = base.expect;
```

Then in your tests:

```javascript
const { test, expect } = require('./fixtures');

test('User profile works with authenticated fixture', async ({ authedPage }) => {
  // The page is already authenticated
  await authedPage.goto('https://example.com/profile');
  await expect(authedPage.locator('.username')).toBeVisible();
});
```

This approach makes tests much cleaner as the authentication logic is completely separated from the test code.