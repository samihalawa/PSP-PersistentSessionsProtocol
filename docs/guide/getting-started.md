# Getting Started

This guide will help you get started with the PersistentSessionsProtocol (PSP) in your projects.

## Installation

PSP is distributed as a set of npm packages for different frameworks.

### Core Package

The core package provides the base functionality and is required for all implementations:

```bash
npm install @psp/core
```

### Framework Adapters

Install the adapter for your browser automation framework:

**Playwright:**

```bash
npm install @psp/playwright
```

**Selenium:**

```bash
npm install @psp/selenium
```

### Server (Optional)

For remote storage and sharing sessions across machines:

```bash
npm install @psp/server
```

## Basic Usage

### Capturing a Session

The basic workflow for capturing a browser session is:

1. Initialize your browser automation framework
2. Create a PSP adapter for that framework
3. Create a session
4. Navigate and perform actions in the browser
5. Capture the session state

#### Example with Playwright

```javascript
import { chromium } from 'playwright';
import { PlaywrightAdapter } from '@psp/playwright';

async function captureSession() {
  // Initialize Playwright
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Create PSP adapter
  const adapter = new PlaywrightAdapter();

  // Create a new session
  const session = await adapter.createSession(page, {
    name: 'login-session',
    description: 'Authenticated user session',
    storage: 'local',
  });

  // Navigate to the login page
  await page.goto('https://example.com/login');

  // Fill in the login form
  await page.fill('input[name="username"]', 'testuser');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  // Wait for the login to complete
  await page.waitForNavigation();

  // Capture the session (includes cookies, localStorage, etc.)
  await session.capture();

  // Get the session ID for later use
  const sessionId = session.getId();
  console.log(`Session saved with ID: ${sessionId}`);

  await browser.close();

  return sessionId;
}
```

#### Example with Selenium

```javascript
const { Builder, By } = require('selenium-webdriver');
const { SeleniumAdapter } = require('@psp/selenium');

async function captureSession() {
  // Initialize Selenium
  const driver = await new Builder().forBrowser('chrome').build();

  // Create PSP adapter
  const adapter = new SeleniumAdapter();

  // Create a new session
  const session = await adapter.createSession(driver, {
    name: 'login-session',
    description: 'Authenticated user session',
    storage: 'local',
  });

  // Navigate to the login page
  await driver.get('https://example.com/login');

  // Fill in the login form
  await driver.findElement(By.name('username')).sendKeys('testuser');
  await driver.findElement(By.name('password')).sendKeys('password123');
  await driver.findElement(By.css('button[type="submit"]')).click();

  // Wait for the login to complete (simplified)
  await driver.sleep(2000);

  // Capture the session
  await session.capture();

  // Get the session ID for later use
  const sessionId = session.getId();
  console.log(`Session saved with ID: ${sessionId}`);

  await driver.quit();

  return sessionId;
}
```

### Restoring a Session

To restore a session:

1. Initialize your browser automation framework
2. Create a PSP adapter
3. Load the previously saved session
4. Restore it to a new browser instance

#### Example with Playwright

```javascript
import { chromium } from 'playwright';
import { PlaywrightAdapter } from '@psp/playwright';

async function restoreSession(sessionId) {
  // Initialize Playwright
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Create PSP adapter
  const adapter = new PlaywrightAdapter();

  // Load the saved session
  const session = await adapter.loadSession(sessionId);

  // Restore the session to the new browser
  await session.restore(page);

  // Now the browser has the authenticated session
  // Navigate to a page that requires authentication
  await page.goto('https://example.com/dashboard');

  // The page should load without requiring login

  return page;
}
```

#### Example with Selenium

```javascript
const { Builder } = require('selenium-webdriver');
const { SeleniumAdapter } = require('@psp/selenium');

async function restoreSession(sessionId) {
  // Initialize Selenium
  const driver = await new Builder().forBrowser('chrome').build();

  // Create PSP adapter
  const adapter = new SeleniumAdapter();

  // Load the saved session
  const session = await adapter.loadSession(sessionId);

  // Restore the session to the new browser
  await session.restore(driver);

  // Now the browser has the authenticated session
  // Navigate to a page that requires authentication
  await driver.get('https://example.com/dashboard');

  // The page should load without requiring login

  return driver;
}
```

## Recording and Playing Back User Interactions

PSP can also record and play back user interactions:

### Recording

```javascript
// Using the session from earlier examples
await session.startRecording();

// Perform actions in the browser
await page.click('.some-button');
await page.fill('input[name="search"]', 'search term');
await page.press('Enter');

// Stop recording
await session.stopRecording();

// The session now includes the recorded events
await session.save();
```

### Playback

```javascript
// Load a session with recorded events
const session = await adapter.loadSession(sessionId);

// Create a new browser instance
const newPage = await browser.newPage();

// Restore the session state
await session.restore(newPage);

// Play back the recorded events
await session.playRecording(newPage);
```

## Using Remote Storage

To use a remote storage server instead of local storage:

```javascript
// Create a session with remote storage
const session = await adapter.createSession(page, {
  name: 'shared-session',
  storage: 'redis',
  storageOptions: {
    host: 'redis-server.example.com',
    port: 6379,
    password: 'password',
  },
});

// The session will be stored in Redis
await session.capture();
```

## Next Steps

- [Installation](./installation.md): Detailed installation instructions
- [Configuration](./configuration.md): Configuration options and customization
- [Usage](./usage.md): More usage patterns and recipes
- [Protocol Specification](/protocol/): Details on the protocol
