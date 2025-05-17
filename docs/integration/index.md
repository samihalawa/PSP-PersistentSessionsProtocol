# PSP Integration Guides

The Persistent Sessions Protocol (PSP) is designed to be easily integrated with existing browser automation projects. These guides will walk you through how to integrate PSP with various popular frameworks.

## Available Integration Guides

- [Playwright Integration](./playwright.md)
- [Selenium Integration](./selenium.md)

## Common Integration Patterns

Regardless of the framework you're using, there are several common patterns for integrating PSP into your projects:

### 1. Authentication Caching

One of the most common uses for PSP is to avoid repetitive login steps in your tests:

```javascript
async function getAuthenticatedBrowser() {
  // Try to find an existing session
  const sessions = await psp.listSessions({ tags: ['login'] });
  
  if (sessions.length > 0) {
    // Restore existing session
    const browser = await launchBrowser();
    await psp.restoreSession(browser, sessions[0].id);
    return browser;
  }
  
  // No session found, perform login and capture
  const browser = await launchBrowser();
  await performLogin(browser);
  await psp.captureSession(browser, { tags: ['login'] });
  return browser;
}
```

### 2. Environment Branching

For projects that run against multiple environments:

```javascript
// Configure environment-specific sessions
const env = process.env.TEST_ENV || 'dev';

// Get a session for this environment
const sessions = await psp.listSessions({ 
  tags: ['login', env],
  sort: { field: 'timestamp', order: 'desc' }
});

// Use environment-specific session or create new one
```

### 3. Session Rotation

Automatically rotate sessions that may expire:

```javascript
function isSessionExpired(session, maxAgeHours = 24) {
  const captureTime = new Date(session.timestamp);
  const now = new Date();
  const ageHours = (now - captureTime) / (1000 * 60 * 60);
  return ageHours > maxAgeHours;
}

async function getValidSession() {
  const sessions = await psp.listSessions({ tags: ['login'] });
  
  // Filter out expired sessions
  const validSessions = sessions.filter(s => !isSessionExpired(s));
  
  if (validSessions.length > 0) {
    return validSessions[0].id;
  }
  
  // No valid sessions, create new one
  return await captureNewSession();
}
```

### 4. Multiple User Roles

Manage sessions for different user types:

```javascript
async function getSessionForRole(role) {
  const sessions = await psp.listSessions({ 
    tags: ['login', role],
    limit: 1
  });
  
  if (sessions.length > 0) {
    return sessions[0].id;
  }
  
  // Create new session for this role
  return await captureSessionForRole(role);
}

// Usage:
const adminSessionId = await getSessionForRole('admin');
const userSessionId = await getSessionForRole('user');
```

### 5. Test Fixtures/Helpers

Integrate with testing frameworks:

```javascript
// With Jest
beforeAll(async () => {
  // Set up sessions before tests run
  global.sessionId = await getOrCreateSession();
});

beforeEach(async () => {
  // Set up browser with session for each test
  browser = await getBrowser();
  await psp.restoreSession(browser, global.sessionId);
});

// With Mocha
before(async function() {
  this.sessionId = await getOrCreateSession();
});

beforeEach(async function() {
  this.browser = await getBrowser();
  await psp.restoreSession(this.browser, this.sessionId);
});
```

## Common Configuration Patterns

### Environment Variables

Configure PSP using environment variables:

```javascript
const psp = createPSPClient({
  storage: {
    type: process.env.PSP_STORAGE_TYPE || 'local',
    
    // Local storage config
    path: process.env.PSP_LOCAL_PATH,
    
    // Cloud storage config
    endpoint: process.env.PSP_CLOUDFLARE_ENDPOINT,
    apiKey: process.env.PSP_API_KEY,
    
    // S3 config
    region: process.env.PSP_S3_REGION,
    bucket: process.env.PSP_S3_BUCKET,
    accessKeyId: process.env.PSP_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.PSP_S3_SECRET_ACCESS_KEY
  }
});
```

### Configuration Files

Use dedicated configuration files:

```javascript
// config.js
module.exports = {
  psp: {
    storage: {
      type: process.env.PSP_STORAGE_TYPE || 'local',
      path: './sessions',
      // Other config options...
    }
  },
  // Other app config...
};

// usage.js
const config = require('./config');
const psp = createPSPClient(config.psp);
```

### Different Configs by Environment

```javascript
// config/base.js
module.exports = {
  storage: {
    type: 'local',
    path: './sessions'
  }
};

// config/production.js
module.exports = {
  storage: {
    type: 'cloudflare',
    endpoint: 'https://psp-worker.example.com',
    apiKey: process.env.PSP_API_KEY
  }
};

// usage.js
const env = process.env.NODE_ENV || 'development';
const config = require(`./config/${env === 'production' ? 'production' : 'base'}`);
const psp = createPSPClient(config);
```

## Next Steps

After reviewing the integration guide for your framework, check out:

- [Storage Configuration](../deployment-guide.md) - Learn how to configure different storage backends
- [Environment Setup](../environment-setup.md) - Detailed environment setup instructions
- [Protocol Specification](../protocol/spec.md) - Full details of the PSP specification

If you need help integrating PSP with a framework not listed here, please open an issue on the GitHub repository.