# Playwright Examples

This page provides examples of using PSP with Playwright for common scenarios.

> **Note:** For a working demonstration of PSP concepts, check out the [Playwright Demo](/examples/playwright/) which includes runnable examples of session capture and restoration across multiple browsers.

## Basic Authentication Example

This example shows how to capture a logged-in session and reuse it later to skip the login process.

```javascript
import { chromium } from 'playwright';
import { PlaywrightAdapter } from '@psp/playwright';
import * as fs from 'fs';

async function saveAuthSession() {
  // Launch a browser
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Create a PSP session
  const adapter = new PlaywrightAdapter();
  const session = await adapter.createSession(page, {
    name: 'github-login',
    description: 'GitHub authenticated session'
  });
  
  // Navigate to GitHub login
  await page.goto('https://github.com/login');
  
  // Fill in the login form
  await page.fill('#login_field', 'your-username');
  await page.fill('#password', 'your-password');
  await page.click('input[type="submit"]');
  
  // Wait for navigation to complete
  await page.waitForURL('https://github.com/');
  
  // Capture the authenticated session
  await session.capture();
  
  // Save the session ID for later use
  const sessionId = session.getId();
  fs.writeFileSync('github-session.txt', sessionId);
  
  console.log(`Session saved with ID: ${sessionId}`);
  
  await browser.close();
}

async function loadAuthSession() {
  // Load the session ID
  const sessionId = fs.readFileSync('github-session.txt', 'utf8').trim();
  
  // Launch a new browser
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Create a PSP adapter
  const adapter = new PlaywrightAdapter();
  
  // Load the saved session
  const session = await adapter.loadSession(sessionId);
  
  // Restore the session to the new browser
  await session.restore(page);
  
  // Navigate to a page that requires authentication
  await page.goto('https://github.com/settings/profile');
  
  // The page should load without requiring login
  console.log('Session restored successfully!');
  
  // Keep the browser open for demonstration
  // In a real scenario, you might close it
  // await browser.close();
}

// Run the example
// saveAuthSession().catch(console.error);
// or
// loadAuthSession().catch(console.error);
```

## Multi-Origin Session

This example demonstrates capturing state across multiple domains.

```javascript
import { chromium } from 'playwright';
import { PlaywrightAdapter } from '@psp/playwright';

async function captureMultiOriginSession() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const adapter = new PlaywrightAdapter();
  const session = await adapter.createSession(page, {
    name: 'multi-origin-session',
    description: 'Session with state across multiple origins'
  });
  
  // Visit the first website and do something
  await page.goto('https://example.com');
  await page.evaluate(() => {
    localStorage.setItem('example-preference', 'dark-mode');
  });
  
  // Visit the second website
  await page.goto('https://another-example.com');
  await page.evaluate(() => {
    localStorage.setItem('user-settings', JSON.stringify({ notifications: true }));
  });
  
  // Capture all state from both origins
  await session.capture();
  const sessionId = session.getId();
  
  console.log(`Multi-origin session saved with ID: ${sessionId}`);
  
  await browser.close();
  return sessionId;
}

async function restoreMultiOriginSession(sessionId) {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const adapter = new PlaywrightAdapter();
  const session = await adapter.loadSession(sessionId);
  
  // Restore the session
  await session.restore(page);
  
  // Visit the first website
  await page.goto('https://example.com');
  const examplePref = await page.evaluate(() => {
    return localStorage.getItem('example-preference');
  });
  console.log('example.com preference:', examplePref);
  
  // Visit the second website
  await page.goto('https://another-example.com');
  const userSettings = await page.evaluate(() => {
    return localStorage.getItem('user-settings');
  });
  console.log('another-example.com settings:', userSettings);
  
  await browser.close();
}
```

## Recording and Playback

This example shows how to record and play back user interactions.

```javascript
import { chromium } from 'playwright';
import { PlaywrightAdapter } from '@psp/playwright';

async function recordUserActions() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const adapter = new PlaywrightAdapter();
  const session = await adapter.createSession(page, {
    name: 'recorded-session',
    description: 'Session with recorded user actions'
  });
  
  // Navigate to a website
  await page.goto('https://todomvc.com/examples/vanilla-es6/');
  
  // Start recording user actions
  await session.startRecording();
  
  // Perform some actions
  await page.fill('.new-todo', 'Buy groceries');
  await page.press('.new-todo', 'Enter');
  
  await page.fill('.new-todo', 'Clean the house');
  await page.press('.new-todo', 'Enter');
  
  await page.fill('.new-todo', 'Pay bills');
  await page.press('.new-todo', 'Enter');
  
  // Mark the first item as completed
  await page.click('.todo-list li:first-child .toggle');
  
  // Stop recording
  await session.stopRecording();
  
  // Capture the final state
  await session.capture();
  const sessionId = session.getId();
  
  console.log(`Recorded session saved with ID: ${sessionId}`);
  
  await browser.close();
  return sessionId;
}

async function playbackUserActions(sessionId) {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const adapter = new PlaywrightAdapter();
  const session = await adapter.loadSession(sessionId);
  
  // Navigate to the same website
  await page.goto('https://todomvc.com/examples/vanilla-es6/');
  
  // Restore the session state
  await session.restore(page);
  
  // Play back the recorded actions
  await session.playRecording(page, {
    speed: 0.5  // Slow playback for demonstration
  });
  
  console.log('Playback completed');
  
  // Keep the browser open to see the result
  // await browser.close();
}
```

## Mobile Browser Emulation

This example demonstrates using PSP with mobile browser emulation.

```javascript
import { chromium } from 'playwright';
import { PlaywrightAdapter } from '@psp/playwright';

async function captureMobileSession() {
  // Launch browser with mobile device emulation
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15E148 Safari/604.1',
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();
  
  // Create adapter and session
  const adapter = new PlaywrightAdapter();
  const session = await adapter.createSession(page, {
    name: 'mobile-session',
    description: 'Mobile browser session'
  });
  
  // Navigate to a website with mobile view
  await page.goto('https://example.com');
  
  // Interact with the page
  // ... mobile-specific interactions ...
  
  // Capture the session
  await session.capture();
  const sessionId = session.getId();
  
  console.log(`Mobile session saved with ID: ${sessionId}`);
  
  await browser.close();
  return sessionId;
}

async function restoreMobileSession(sessionId) {
  // Launch browser with the same mobile settings
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15E148 Safari/604.1',
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();
  
  // Create adapter and load session
  const adapter = new PlaywrightAdapter();
  const session = await adapter.loadSession(sessionId);
  
  // Restore the session
  await session.restore(page);
  
  // The mobile session is now restored
  await page.goto('https://example.com');
  
  console.log('Mobile session restored');
  
  await browser.close();
}
```

## Integration with Testing Frameworks

This example shows how to integrate PSP with Jest.

```javascript
import { chromium } from 'playwright';
import { PlaywrightAdapter } from '@psp/playwright';

let sessionId;
let browser;
let adapter;

// Run before all tests
beforeAll(async () => {
  // Set up the browser
  browser = await chromium.launch();
  
  // Create an adapter
  adapter = new PlaywrightAdapter();
  
  // Create a new authenticated session (only once)
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Create session and log in
  const session = await adapter.createSession(page, {
    name: 'test-auth-session',
    description: 'Authentication for testing'
  });
  
  // Login process
  await page.goto('https://example.com/login');
  await page.fill('#username', 'testuser');
  await page.fill('#password', 'password123');
  await page.click('#login-button');
  await page.waitForURL('https://example.com/dashboard');
  
  // Capture the authenticated session
  await session.capture();
  sessionId = session.getId();
  
  // Close the initial browser context
  await context.close();
});

// Run after all tests
afterAll(async () => {
  await browser.close();
});

// Helper to get an authenticated page for each test
async function getAuthenticatedPage() {
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Load and restore the authenticated session
  const session = await adapter.loadSession(sessionId);
  await session.restore(page);
  
  return page;
}

// Example test
test('User can access profile page', async () => {
  const page = await getAuthenticatedPage();
  
  // Navigate to the profile page (already authenticated)
  await page.goto('https://example.com/profile');
  
  // Test that we are logged in
  const username = await page.textContent('.username');
  expect(username).toBe('testuser');
  
  await page.close();
});

// Another test using the same authenticated session
test('User can access settings page', async () => {
  const page = await getAuthenticatedPage();
  
  // Navigate to the settings page (already authenticated)
  await page.goto('https://example.com/settings');
  
  // Test that settings components are present
  const settingsTitle = await page.textContent('h1');
  expect(settingsTitle).toBe('User Settings');
  
  await page.close();
});
```

## Using Remote Storage

This example demonstrates using Redis for session storage.

```javascript
import { chromium } from 'playwright';
import { PlaywrightAdapter } from '@psp/playwright';
import { RedisStorageProvider } from '@psp/core/storage/redis';

async function captureWithRedisStorage() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Create Redis storage provider
  const redisProvider = new RedisStorageProvider({
    host: 'localhost',
    port: 6379,
    // password: 'your-redis-password' // If needed
  });
  
  // Create adapter with the Redis provider
  const adapter = new PlaywrightAdapter({
    storageProvider: redisProvider
  });
  
  // Create session
  const session = await adapter.createSession(page, {
    name: 'redis-stored-session',
    description: 'Session stored in Redis'
  });
  
  // Navigate and interact with the page
  await page.goto('https://example.com');
  // ... more interactions ...
  
  // Capture the session
  await session.capture();
  const sessionId = session.getId();
  
  console.log(`Session saved to Redis with ID: ${sessionId}`);
  
  await browser.close();
  return sessionId;
}

// This function could be run on a different machine
async function restoreFromRedisStorage(sessionId) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Create Redis storage provider with the same configuration
  const redisProvider = new RedisStorageProvider({
    host: 'localhost',
    port: 6379,
    // password: 'your-redis-password' // If needed
  });
  
  // Create adapter with the Redis provider
  const adapter = new PlaywrightAdapter({
    storageProvider: redisProvider
  });
  
  // Load the session from Redis
  const session = await adapter.loadSession(sessionId);
  
  // Restore the session
  await session.restore(page);
  
  // The session is now restored from Redis
  await page.goto('https://example.com/dashboard');
  
  console.log('Session restored from Redis');
  
  await browser.close();
}
```