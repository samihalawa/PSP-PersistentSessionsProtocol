# Automating Chrome with Existing Profiles using Playwright and TypeScript

## Complete Guide to Chrome Session Persistence with PSP

This article demonstrates how to use the PersistentSessionsProtocol (PSP) to launch Chrome with persistent contexts, maintaining session data across browser restarts. This approach is particularly useful for automation scenarios where you need to preserve authentication states, user preferences, and application data.

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Implementation Examples](#implementation-examples)
4. [Advanced Usage](#advanced-usage)
5. [Session Management](#session-management)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

## Overview

The PSP Chrome Profile approach uses Playwright's `launchPersistentContext` method to create and maintain real Chrome user profiles. This method provides:

- **True Session Persistence**: All browser data (cookies, localStorage, sessionStorage, IndexedDB) is automatically saved
- **Cross-Session Continuity**: Sessions survive browser restarts and system reboots
- **Authentication Preservation**: Login states are maintained without re-authentication
- **Profile Isolation**: Each session uses its own Chrome profile directory

## Core Concepts

### Session Structure

```javascript
const session = {
  metadata: {
    id: 'uuid-v4-string',
    name: 'Human-readable session name',
    description: 'Session description',
    createdAt: timestamp,
    updatedAt: timestamp
  },
  userDataDir: '/path/to/chrome/profile'
};
```

### Storage Architecture

```
~/.psp/
├── sessions/           # Session metadata files
│   ├── session-1.json
│   └── session-2.json
└── profiles/           # Chrome profile directories
    ├── session-1/      # Chrome user data
    └── session-2/      # Chrome user data
```

## Implementation Examples

### Basic Session Creation and Restoration

```javascript
const { chromium } = require('playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');

class SimpleSession {
  constructor(metadata, userDataDir) {
    this.metadata = metadata;
    this.userDataDir = userDataDir;
  }

  static async create(options) {
    const id = crypto.randomUUID();
    const userDataDir = options.userDataDir || 
      path.join(os.homedir(), '.psp', 'profiles', id);
    
    // Ensure profile directory exists
    fs.mkdirSync(userDataDir, { recursive: true });
    
    const metadata = {
      id,
      name: options.name,
      description: options.description,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    const session = new SimpleSession(metadata, userDataDir);
    await session.save();
    return session;
  }

  async save() {
    const sessionDir = path.join(os.homedir(), '.psp', 'sessions');
    fs.mkdirSync(sessionDir, { recursive: true });
    
    const sessionFile = path.join(sessionDir, `${this.metadata.id}.json`);
    fs.writeFileSync(sessionFile, JSON.stringify({
      metadata: this.metadata,
      userDataDir: this.userDataDir
    }, null, 2));
  }

  static async load(sessionId) {
    const sessionDir = path.join(os.homedir(), '.psp', 'sessions');
    const sessionFile = path.join(sessionDir, `${sessionId}.json`);
    
    if (!fs.existsSync(sessionFile)) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    const data = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
    return new SimpleSession(data.metadata, data.userDataDir);
  }

  getUserDataDir() {
    return this.userDataDir;
  }
}
```

### Launching Chrome with Persistent Context

```javascript
async function launchWithPSP(sessionId, options = {}) {
  let session;
  
  if (sessionId) {
    // Load existing session
    session = await SimpleSession.load(sessionId);
    console.log(`Loaded session: ${session.metadata.name}`);
  } else {
    // Create new session
    session = await SimpleSession.create({
      name: options.sessionName || `Session ${new Date().toISOString()}`,
      userDataDir: options.userDataDir
    });
  }
  
  // Launch browser with persistent context
  const context = await chromium.launchPersistentContext(
    session.getUserDataDir(), 
    {
      headless: options.headless ?? false,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security'
      ]
    }
  );
  
  return { context, session };
}
```

### Complete Working Example

```javascript
async function demoSessionPersistence() {
  console.log('🚀 Starting Chrome Session Persistence Demo...\n');
  
  // Step 1: Create and populate session
  const { context, session } = await launchWithPSP(undefined, {
    sessionName: 'Gmail Demo Session',
    headless: true
  });
  
  const page = await context.newPage();
  
  // Navigate to Gmail and set test data
  await page.goto('https://gmail.com');
  
  // Set comprehensive session data
  await page.evaluate(() => {
    // localStorage data
    localStorage.setItem('psp-demo', 'chrome-profile-success');
    localStorage.setItem('user-preferences', JSON.stringify({
      theme: 'dark',
      language: 'en',
      notifications: true
    }));
    
    // Cookies
    document.cookie = 'session-id=demo-12345; path=/';
    document.cookie = 'user-token=abc123xyz; path=/';
    
    // sessionStorage
    sessionStorage.setItem('temp-data', 'session-specific-info');
  });
  
  console.log(`✅ Session created: ${session.metadata.id}`);
  console.log(`📁 Profile location: ${session.getUserDataDir()}`);
  
  await context.close();
  console.log('🔒 First session closed\n');
  
  // Step 2: Restore session
  console.log('🔄 Restoring session...');
  
  const { context: context2 } = await launchWithPSP(session.metadata.id, {
    headless: true
  });
  
  const page2 = await context2.newPage();
  await page2.goto('https://gmail.com');
  
  // Verify data persistence
  const restoredData = await page2.evaluate(() => {
    return {
      localStorage: {
        demo: localStorage.getItem('psp-demo'),
        preferences: localStorage.getItem('user-preferences')
      },
      cookies: document.cookie,
      sessionStorage: {
        tempData: sessionStorage.getItem('temp-data')
      }
    };
  });
  
  console.log('📊 Restored Data:');
  console.log('   localStorage:', restoredData.localStorage);
  console.log('   cookies:', restoredData.cookies);
  console.log('   sessionStorage:', restoredData.sessionStorage);
  
  const isSuccessful = 
    restoredData.localStorage.demo === 'chrome-profile-success' &&
    restoredData.cookies.includes('session-id=demo-12345');
  
  console.log(isSuccessful ? '✅ SUCCESS: Session restored!' : '❌ FAILED: Session not restored');
  
  await context2.close();
  return isSuccessful;
}
```

## Advanced Usage

### Authentication Session Management

```javascript
async function createAuthenticatedSession(credentials) {
  const { context, session } = await launchWithPSP(undefined, {
    sessionName: `Auth Session - ${credentials.email}`,
    headless: false // Show browser for manual intervention if needed
  });
  
  const page = await context.newPage();
  
  // Navigate to login page
  await page.goto('https://accounts.google.com');
  
  // Automated login (be careful with credentials)
  await page.fill('input[type="email"]', credentials.email);
  await page.click('#identifierNext');
  await page.waitForSelector('input[type="password"]', { timeout: 10000 });
  await page.fill('input[type="password"]', credentials.password);
  await page.click('#passwordNext');
  
  // Wait for successful login
  await page.waitForURL('**/myaccount.google.com/**', { timeout: 30000 });
  
  console.log('✅ Authentication successful');
  console.log(`📝 Session saved: ${session.metadata.id}`);
  
  return session;
}
```

### Session Cloning and Sharing

```javascript
async function cloneSession(sourceSessionId, newSessionName) {
  const sourceSession = await SimpleSession.load(sourceSessionId);
  const sourceDir = sourceSession.getUserDataDir();
  
  // Create new session
  const clonedSession = await SimpleSession.create({
    name: newSessionName,
    description: `Cloned from ${sourceSession.metadata.name}`
  });
  
  const targetDir = clonedSession.getUserDataDir();
  
  // Copy Chrome profile data
  const { execSync } = require('child_process');
  execSync(`cp -r "${sourceDir}"/* "${targetDir}"/`);
  
  console.log(`✅ Session cloned: ${sourceSessionId} → ${clonedSession.metadata.id}`);
  return clonedSession;
}
```

### Batch Session Operations

```javascript
async function batchSessionOperations() {
  const sessions = await listAllSessions();
  
  // Clean up old sessions (older than 30 days)
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  
  for (const session of sessions) {
    if (session.metadata.createdAt < thirtyDaysAgo) {
      await session.delete();
      console.log(`🗑️ Deleted old session: ${session.metadata.name}`);
    }
  }
  
  // Export session metadata
  const exportData = sessions.map(s => ({
    id: s.metadata.id,
    name: s.metadata.name,
    created: new Date(s.metadata.createdAt).toISOString(),
    profileSize: getDirectorySize(s.getUserDataDir())
  }));
  
  fs.writeFileSync('session-export.json', JSON.stringify(exportData, null, 2));
  console.log('📤 Session metadata exported');
}
```

## Session Management

### Listing Sessions

```javascript
async function listAllSessions() {
  const sessionDir = path.join(os.homedir(), '.psp', 'sessions');
  
  if (!fs.existsSync(sessionDir)) {
    return [];
  }
  
  const files = fs.readdirSync(sessionDir).filter(f => f.endsWith('.json'));
  const sessions = [];
  
  for (const file of files) {
    try {
      const sessionId = path.basename(file, '.json');
      const session = await SimpleSession.load(sessionId);
      sessions.push(session);
    } catch (error) {
      console.warn(`Failed to load session from ${file}:`, error.message);
    }
  }
  
  return sessions;
}
```

### Session Cleanup

```javascript
async function cleanupSessions() {
  const sessions = await listAllSessions();
  
  for (const session of sessions) {
    const profileDir = session.getUserDataDir();
    
    // Check if profile directory exists
    if (!fs.existsSync(profileDir)) {
      console.log(`🧹 Cleaning orphaned session: ${session.metadata.name}`);
      await session.delete();
    }
  }
}
```

## Best Practices

### 1. Profile Directory Management

```javascript
// Use descriptive profile paths
const userDataDir = path.join(
  os.homedir(), 
  '.psp', 
  'profiles', 
  `${projectName}-${environment}-${sessionName}`
);
```

### 2. Error Handling

```javascript
async function robustSessionLaunch(sessionId, options = {}) {
  try {
    return await launchWithPSP(sessionId, options);
  } catch (error) {
    console.warn(`Session launch failed: ${error.message}`);
    
    // Fallback to new session
    console.log('Creating fallback session...');
    return await launchWithPSP(undefined, {
      sessionName: `Fallback-${Date.now()}`,
      ...options
    });
  }
}
```

### 3. Resource Management

```javascript
async function managedSessionExecution(sessionId, task) {
  const { context, session } = await launchWithPSP(sessionId);
  
  try {
    const result = await task(context);
    return result;
  } finally {
    // Always close context to free resources
    await context.close();
    console.log(`🔒 Session ${session.metadata.id} closed`);
  }
}
```

### 4. Session Validation

```javascript
async function validateSession(session) {
  const profileDir = session.getUserDataDir();
  
  // Check if profile directory exists and is accessible
  if (!fs.existsSync(profileDir)) {
    throw new Error(`Profile directory not found: ${profileDir}`);
  }
  
  // Check if Chrome can read the profile
  const prefsFile = path.join(profileDir, 'Preferences');
  if (fs.existsSync(prefsFile)) {
    try {
      JSON.parse(fs.readFileSync(prefsFile, 'utf8'));
    } catch (error) {
      throw new Error(`Corrupted Chrome profile: ${error.message}`);
    }
  }
  
  return true;
}
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Profile Lock Issues

```javascript
// Chrome profile is locked by another process
async function handleProfileLock(userDataDir) {
  const lockFile = path.join(userDataDir, 'SingletonLock');
  
  if (fs.existsSync(lockFile)) {
    console.warn('Profile appears to be locked, attempting to unlock...');
    
    try {
      fs.unlinkSync(lockFile);
      console.log('✅ Profile unlocked');
    } catch (error) {
      console.error('❌ Could not unlock profile:', error.message);
      throw new Error('Profile is locked by another Chrome instance');
    }
  }
}
```

#### 2. Corrupted Profile Recovery

```javascript
async function recoverCorruptedProfile(session) {
  const profileDir = session.getUserDataDir();
  const backupDir = `${profileDir}.backup.${Date.now()}`;
  
  // Create backup
  execSync(`cp -r "${profileDir}" "${backupDir}"`);
  
  // Remove problematic files
  const problematicFiles = [
    'Web Data',
    'History',
    'Cookies'
  ];
  
  for (const file of problematicFiles) {
    const filePath = path.join(profileDir, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
  
  console.log(`🔧 Profile recovery attempted, backup at: ${backupDir}`);
}
```

#### 3. Memory and Disk Usage

```javascript
function getProfileSize(userDataDir) {
  const { execSync } = require('child_process');
  
  try {
    const output = execSync(`du -sh "${userDataDir}"`, { encoding: 'utf8' });
    return output.split('\t')[0];
  } catch (error) {
    return 'Unknown';
  }
}

async function monitorProfileSizes() {
  const sessions = await listAllSessions();
  
  console.log('📊 Profile Size Report:');
  for (const session of sessions) {
    const size = getProfileSize(session.getUserDataDir());
    console.log(`   ${session.metadata.name}: ${size}`);
  }
}
```

## CLI Usage Examples

### Command Line Interface

```bash
# Run demo
node demo-psp-working.js

# List all sessions
node demo-psp-working.js list

# Load specific session
node demo-psp-working.js load <session-id>
```

### Integration with Package Scripts

```json
{
  "scripts": {
    "psp:demo": "node demo-psp-working.js",
    "psp:list": "node demo-psp-working.js list",
    "psp:load": "node demo-psp-working.js load",
    "psp:cleanup": "node scripts/cleanup-sessions.js"
  }
}
```

## Conclusion

The PSP Chrome Profile approach provides a robust solution for browser session persistence in automation scenarios. By leveraging Playwright's `launchPersistentContext` with real Chrome profiles, you can:

- Maintain authentication states across sessions
- Preserve user preferences and application data
- Create isolated testing environments
- Build reliable automation workflows

This implementation forms the foundation of PSP v0.1 and demonstrates the core principles that will be extended in future versions to support additional browsers and frameworks.

## Live Chrome Session Capture

### Real-Time Session Capture Script

The `capture-current-chrome-session.js` script provides a complete workflow for capturing and restoring Chrome sessions:

```javascript
const { ChromeSessionCapture } = require('./capture-current-chrome-session');

async function captureAndRestoreDemo() {
  const capture = new ChromeSessionCapture();
  
  // Capture current Chrome session
  const { sessionId } = await capture.captureCurrentChromeSession();
  
  // Later, restore the session
  await capture.launchWithCapturedSession(sessionId);
}
```

### Command Line Usage

```bash
# Capture current Chrome session
node capture-current-chrome-session.js capture

# List all captured sessions
node capture-current-chrome-session.js list

# Load specific session
node capture-current-chrome-session.js load <session-id>

# Run full demo (capture + restore)
node capture-current-chrome-session.js
```

### Session Data Structure

Captured sessions include:

```json
{
  "metadata": {
    "id": "uuid-v4-string",
    "name": "Current Chrome Session - timestamp",
    "description": "Captured current Chrome session with comprehensive state data",
    "createdAt": 1751651284687,
    "updatedAt": 1751651284687,
    "captureInfo": {
      "currentUrl": "https://example.com",
      "pageTitle": "Example Domain",
      "cookiesCount": 5,
      "localStorageKeys": 3,
      "sessionStorageKeys": 1,
      "sitesVisited": ["HTTPBin Test Site", "Example.com", "JSON Placeholder API"]
    }
  },
  "userDataDir": "/Users/username/.psp/profiles/session-id"
}
```

### Chrome Profile Contents

The persistent Chrome profile includes:

- **Cookies**: HTTP cookies from all visited domains
- **Local Storage**: Key-value data per origin
- **Session Storage**: Temporary session data
- **Cache**: Browser cache files
- **History**: Navigation history
- **Preferences**: Browser settings and preferences

## Production Usage Examples

### Authentication Workflow

```javascript
async function createAuthenticatedSession() {
  const capture = new ChromeSessionCapture();
  
  // Launch Chrome and navigate to login
  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false
  });
  
  const page = await context.newPage();
  await page.goto('https://app.example.com/login');
  
  // Perform login (manual or automated)
  await page.fill('#email', 'user@example.com');
  await page.fill('#password', 'password');
  await page.click('#login-button');
  
  // Wait for authentication to complete
  await page.waitForURL('**/dashboard');
  
  // Session is automatically saved in Chrome profile
  await context.close();
  
  return sessionId;
}
```

### Cross-Environment Session Sharing

```javascript
// Machine A: Capture session
const sessionId = await capture.captureCurrentChromeSession();

// Export session data
const sessionData = await capture.exportSession(sessionId);
fs.writeFileSync('session-export.json', JSON.stringify(sessionData));

// Machine B: Import and restore session
const importedData = JSON.parse(fs.readFileSync('session-export.json'));
const newSessionId = await capture.importSession(importedData);
await capture.launchWithCapturedSession(newSessionId);
```

## Related Files

- `chrome-profile-demo.js` - Basic demonstration
- `demo-psp-working.js` - Complete working implementation
- `capture-current-chrome-session.js` - **NEW: Real-time session capture**
- `packages/adapters/playwright/` - Playwright adapter implementation
- `packages/core/` - Core PSP functionality

## PSP Session Storage

Sessions are stored in:
```
~/.psp/
├── sessions/           # Session metadata (JSON files)
│   ├── session-1.json
│   └── session-2.json
└── profiles/           # Chrome profile directories
    ├── session-1/      # Complete Chrome user data
    │   └── Default/    # Chrome profile contents
    └── session-2/
        └── Default/
```

For more information, see the [PSP Protocol Documentation](protocol/README.md) and [Getting Started Guide](guide/getting-started.md).
