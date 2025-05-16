# @psp/selenium

Selenium adapter for the PersistentSessionsProtocol (PSP) - a unified approach to browser session persistence.

[![npm version](https://img.shields.io/npm/v/@psp/selenium.svg)](https://www.npmjs.com/package/@psp/selenium)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

This package provides a [Selenium WebDriver](https://www.selenium.dev/documentation/webdriver/) adapter for the PersistentSessionsProtocol, allowing you to save, share, and restore browser sessions when using Selenium for browser automation.

## Installation

```bash
npm install @psp/core @psp/selenium
```

For Python users:

```bash
pip install psp-selenium
```

## Usage

### JavaScript/TypeScript

```javascript
const { Builder } = require('selenium-webdriver');
const { SeleniumAdapter } = require('@psp/selenium');

async function example() {
  // Initialize Selenium
  const driver = await new Builder().forBrowser('chrome').build();
  
  // Create PSP adapter
  const adapter = new SeleniumAdapter();
  
  // Create a new session
  const session = await adapter.createSession(driver, {
    name: 'login-session',
    description: 'Authenticated user session',
    storage: 'local'
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
  
  // Later, restore the session
  const newDriver = await new Builder().forBrowser('chrome').build();
  
  // Load the saved session
  const savedSession = await adapter.loadSession(sessionId);
  
  // Restore the session to the new browser
  await savedSession.restore(newDriver);
  
  // Now the browser has the authenticated session
  await newDriver.get('https://example.com/dashboard');
  // Already logged in!
}
```

### Python

```python
from selenium import webdriver
from psp.selenium import SeleniumAdapter

# Initialize driver
driver = webdriver.Chrome()

# Create adapter and session
adapter = SeleniumAdapter()
session = adapter.create_session(driver, 
  name="my-authentication-session",
  storage="local"
)

# Log in to your application
driver.get("https://example.com/login")
driver.find_element_by_name("username").send_keys("user")
driver.find_element_by_name("password").send_keys("pass")
driver.find_element_by_xpath("//button[@type='submit']").click()

# Capture the authenticated session
session.capture()
session_id = session.get_id()
print(f"Session saved with ID: {session_id}")

driver.quit()

# Later, restore the session
new_driver = webdriver.Chrome()
saved_session = adapter.load_session(session_id)
saved_session.restore(new_driver)

# Now new_driver has the same authenticated session
new_driver.get("https://example.com/dashboard")
# Already logged in!
```

## API Reference

### SeleniumAdapter

```typescript
class SeleniumAdapter {
  // Create a new adapter with options
  constructor(options?: AdapterOptions);
  
  // Create a new session
  createSession(driver: WebDriver, options?: SessionOptions): Promise<Session>;
  
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

- **Complete State Capture**: Saves cookies, localStorage, sessionStorage
- **Framework Compatibility**: Can restore sessions in other frameworks like Playwright or Puppeteer
- **Storage Options**: Support for local filesystem, Redis, or cloud storage
- **Session Management**: List, load, and delete saved sessions
- **TypeScript Support**: Full TypeScript definitions included
- **Python Support**: Python bindings for use in Python test suites

## Advanced Usage

### Custom Storage Provider

```javascript
const { CloudStorageProvider } = require('@psp/core');
const { SeleniumAdapter } = require('@psp/selenium');

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
const adapter = new SeleniumAdapter({ storage });
```

### Recording User Actions

```javascript
// Create session with recording enabled
const session = await adapter.createSession(driver, {
  name: 'recorded-session',
  recording: true
});

// Start recording
await session.startRecording();

// Perform actions
await driver.get('https://example.com');
await driver.findElement(By.css('.button')).click();
await driver.findElement(By.css('input')).sendKeys('Hello');

// Stop recording
await session.stopRecording();
await session.capture();

// Later, play back the recording
const savedSession = await adapter.loadSession(session.getId());
await savedSession.restore(newDriver);
await savedSession.playRecording(newDriver);
```

## Related Packages

- [`@psp/core`](https://www.npmjs.com/package/@psp/core) - Core PSP functionality
- [`@psp/playwright`](https://www.npmjs.com/package/@psp/playwright) - Playwright adapter for PSP
- [`@psp/puppeteer`](https://www.npmjs.com/package/@psp/puppeteer) - Puppeteer adapter for PSP

## License

MIT