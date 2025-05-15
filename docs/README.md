# PersistentSessionsProtocol (PSP)

<div class="features">
  <div class="feature">
    <h2>Session Persistence</h2>
    <p>Save and restore browser sessions across different machines, frameworks, and environments.</p>
  </div>
  <div class="feature">
    <h2>Framework Agnostic</h2>
    <p>Use with Playwright, Selenium, Skyvern, Stagehand, and other browser automation tools.</p>
  </div>
  <div class="feature">
    <h2>Complete State Capture</h2>
    <p>Preserve cookies, localStorage, sessionStorage, and authentication state.</p>
  </div>
</div>

## About the Protocol

The PersistentSessionsProtocol (PSP) creates a standardized approach for browser automation tools to save, share, and restore session data across different frameworks and machines. This protocol bridges the critical gap in browser automation by providing a framework-agnostic method for persisting state, significantly reducing authentication friction and improving testing reliability.

## Key Features

- **Cross-Framework Compatibility** - Works with Playwright, Selenium, Skyvern, Stagehand, and other major automation tools
- **Complete State Capture** - Preserves cookies, localStorage, sessionStorage, and authentication tokens
- **Flexible Storage Options** - Support for local filesystem, Redis, database, and cloud storage backends
- **Secure by Design** - Encryption for sensitive session data with configurable security levels
- **Session Recording & Replay** - Capture and reproduce user interactions across environments
- **REST and WebSocket APIs** - For server-based session management and real-time updates

## Quick Start

### Installation

```bash
# Playwright adapter
npm install @psp/core @psp/playwright

# Selenium adapter
npm install @psp/core @psp/selenium
```

### Usage with Playwright

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

example();
```

## Get Started

Check out the [Guide](/guide/) to get started with PSP, or explore the [Protocol Specification](/protocol/) for in-depth details.