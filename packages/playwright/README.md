# @psp/playwright

Playwright adapter for the PersistentSessionsProtocol (PSP) - a unified approach to browser session persistence.

[![npm version](https://img.shields.io/npm/v/@psp/playwright.svg)](https://www.npmjs.com/package/@psp/playwright)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

This package provides a [Playwright](https://playwright.dev/) adapter for the PersistentSessionsProtocol, allowing you to save, share, and restore browser sessions when using Playwright for browser automation.

## Installation

```bash
npm install @psp/core @psp/playwright
```

## Usage

```javascript
import { chromium } from 'playwright';
import { PlaywrightAdapter } from '@psp/playwright';

async function example() {
  // Initialize Playwright
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Create PSP adapter and session
  const adapter = new PlaywrightAdapter();
  const session = await adapter.createSession(page, {
    name: 'my-auth-session',
    storage: 'local'
  });
  
  // Navigate and log in
  await page.goto('https://example.com/login');
  await page.fill('input[name="username"]', 'user');
  await page.fill('input[name="password"]', 'pass');
  await page.click('button[type="submit"]');
  
  // Wait for login to complete
  await page.waitForNavigation();
  
  // Capture the authenticated session
  await session.capture();
  console.log(`Session saved with ID: ${session.getId()}`);
  
  // Later, restore the session in a new browser
  const newBrowser = await chromium.launch();
  const newContext = await newBrowser.newContext();
  const newPage = await newContext.newPage();
  
  // Load the saved session
  const savedSession = await adapter.loadSession(session.getId());
  await savedSession.restore(newPage);
  
  // Now the new page has the authenticated session
  await newPage.goto('https://example.com/dashboard');
  // Already logged in!
}
```

## API Reference

### PlaywrightAdapter

```typescript
class PlaywrightAdapter {
  // Create a new adapter with options
  constructor(options?: AdapterOptions);
  
  // Create a new session
  createSession(page: Page, options?: SessionOptions): Promise<Session>;
  
  // Load an existing session
  loadSession(sessionId: string): Promise<Session>;
  
  // List all available sessions
  listSessions(): Promise<SessionMetadata[]>;
  
  // Delete a session
  deleteSession(sessionId: string): Promise<void>;
}
```

### Options

```typescript
interface AdapterOptions {
  // Storage provider (defaults to local file system)
  storage?: StorageProvider;
  
  // Features to capture (all enabled by default)
  features?: {
    cookies?: boolean;
    localStorage?: boolean;
    sessionStorage?: boolean;
    history?: boolean;
    network?: boolean;
    dom?: boolean;
  };
}

interface SessionOptions {
  // User-defined name for the session
  name: string;
  
  // Optional description
  description?: string;
  
  // Storage type: 'local', 'memory', 'redis', 'cloud'
  storage?: 'local' | 'memory' | 'redis' | 'cloud';
  
  // Storage-specific options
  storageOptions?: Record<string, any>;
  
  // User-defined tags
  tags?: string[];
  
  // Session expiration in milliseconds
  expireAfter?: number;
}
```

## Features

- **Complete State Capture**: Saves cookies, localStorage, sessionStorage, and more
- **Framework Compatibility**: Can restore sessions in other frameworks like Selenium or Puppeteer
- **Storage Options**: Support for local filesystem, Redis, or cloud storage
- **Session Management**: List, load, and delete saved sessions
- **TypeScript Support**: Full TypeScript definitions included

## Advanced Usage

### Custom Storage Provider

```javascript
import { CloudStorageProvider } from '@psp/core';
import { PlaywrightAdapter } from '@psp/playwright';

// Create a cloud storage provider (AWS S3)
const storage = new CloudStorageProvider({
  provider: 's3',
  bucket: 'my-sessions-bucket',
  region: 'us-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Create adapter with custom storage
const adapter = new PlaywrightAdapter({ storage });
```

### Session Recording and Playback

```javascript
// Create session with recording enabled
const session = await adapter.createSession(page, {
  name: 'recorded-session',
  recording: true
});

// Start recording
await session.startRecording();

// Perform actions
await page.goto('https://example.com');
await page.click('.button');
await page.fill('input', 'Hello');

// Stop recording
await session.stopRecording();
await session.capture();

// Later, play back the recording
const savedSession = await adapter.loadSession(session.getId());
await savedSession.restore(newPage);
await savedSession.playRecording(newPage);
```

## Related Packages

- [`@psp/core`](https://www.npmjs.com/package/@psp/core) - Core PSP functionality
- [`@psp/selenium`](https://www.npmjs.com/package/@psp/selenium) - Selenium adapter for PSP
- [`@psp/puppeteer`](https://www.npmjs.com/package/@psp/puppeteer) - Puppeteer adapter for PSP

## License

MIT