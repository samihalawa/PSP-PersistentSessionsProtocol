# PersistentSessionsProtocol (PSP)

A unified framework for browser session persistence across automation tools.

![PSP Banner](docs/images/psp-banner.png)

[![GitHub license](https://img.shields.io/github/license/samihalawa/PSP-PersistentSessionsProtocol)](https://github.com/samihalawa/PSP-PersistentSessionsProtocol/blob/main/LICENSE)
[![npm version](https://img.shields.io/npm/v/@psp/core.svg)](https://www.npmjs.com/package/@psp/core)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/samihalawa/PSP-PersistentSessionsProtocol/blob/main/CONTRIBUTING.md)

## Overview

The Persistent Sessions Protocol (PSP) is a standardized approach for capturing, storing, and restoring browser sessions across different automation frameworks and environments. It solves the persistent challenge of maintaining authentication and application state in browser automation, significantly reducing friction and improving reliability.

## Why PSP?

PSP addresses common challenges in browser automation:

- **Authentication Fatigue**: Eliminate repetitive logins in test scripts
- **Cross-Environment Testing**: Maintain state between different test environments
- **Debugging Complexity**: Capture problematic application states for easier reproduction
- **Framework Lock-in**: Switch freely between automation tools while preserving sessions
- **CI/CD Reliability**: Pre-populate test environments with authenticated sessions

## Key Features

- **Cross-Framework Compatibility**: Works with Playwright, Selenium, Puppeteer, and other major automation tools
- **Complete State Capture**: Preserves cookies, localStorage, sessionStorage, and authentication tokens
- **Multiple Storage Options**: Support for local filesystem, S3-compatible storage, Cloudflare, and Supabase
- **Security**: Configurable encryption and access controls for sensitive session data
- **Simple API**: Intuitive interface for capturing and restoring sessions
- **Serverless Ready**: Deploy as Cloudflare Workers for global session availability

## Installation

Install the core package and framework-specific adapter:

```bash
# For Playwright users
npm install @psp/core @psp/playwright

# For Selenium users
npm install @psp/core @psp/selenium
```

## Quick Start

### Playwright Example

```javascript
// Capture and restore a browser session with Playwright
const { chromium } = require('playwright');
const { createPSPClient } = require('@psp/playwright');

async function demo() {
  // Initialize PSP with local storage
  const psp = createPSPClient({
    storage: { type: 'local', path: './sessions' }
  });

  // === CAPTURE PHASE ===
  const browser1 = await chromium.launch({ headless: false });
  const page1 = await browser1.newPage();

  // Navigate and log in
  await page1.goto('https://example.com/login');
  await page1.fill('#username', 'test@example.com');
  await page1.fill('#password', 'password123');
  await page1.click('#login-button');
  await page1.waitForURL('https://example.com/dashboard');

  // Capture the authenticated session
  const sessionId = await psp.captureSession(page1, {
    name: 'Example Login',
    description: 'Authenticated dashboard session'
  });
  console.log(`Session saved with ID: ${sessionId}`);
  await browser1.close();

  // === RESTORE PHASE (could be in a different process or machine) ===
  const browser2 = await chromium.launch({ headless: false });
  const page2 = await browser2.newPage();

  // Restore the session (skips login)
  await psp.restoreSession(page2, sessionId);

  // Session is restored, we're already logged in!
  await page2.goto('https://example.com/dashboard/profile');
  console.log('Session restored successfully!');
}

demo();
```

### Selenium Example

```javascript
const { Builder } = require('selenium-webdriver');
const { createPSPClient } = require('@psp/selenium');

async function demo() {
  // Initialize PSP with cloud storage
  const psp = createPSPClient({
    storage: {
      type: 'cloudflare',
      endpoint: 'https://your-worker.workers.dev',
      apiKey: 'your-api-key'
    }
  });

  // === CAPTURE PHASE ===
  const driver1 = await new Builder().forBrowser('chrome').build();

  // Log in to application
  await driver1.get('https://example.com/login');
  await driver1.findElement({ id: 'username' }).sendKeys('test@example.com');
  await driver1.findElement({ id: 'password' }).sendKeys('password123');
  await driver1.findElement({ id: 'login-button' }).click();

  // Capture the authenticated session
  const sessionId = await psp.captureSession(driver1);
  console.log(`Session saved with ID: ${sessionId}`);
  await driver1.quit();

  // === RESTORE PHASE ===
  const driver2 = await new Builder().forBrowser('chrome').build();

  // Restore the session (skips login)
  await psp.restoreSession(driver2, sessionId);

  // Navigate directly to authenticated page
  await driver2.get('https://example.com/dashboard');
  console.log('Session restored successfully!');
}

demo();
```

## Components

PSP consists of several modular components:

### Core Library

The [`@psp/core`](packages/core) package contains the core functionality:
- Session data format specification
- Storage provider interfaces
- Serialization/deserialization utilities
- Common utilities and helpers

### Framework Adapters

Framework-specific adapters that implement the PSP protocol:

- **Playwright** - [`@psp/playwright`](packages/adapters/playwright)
- **Selenium** - [`@psp/selenium`](packages/adapters/selenium)

### Storage Options

PSP supports multiple storage backends:

- **Local Storage**: Store sessions on the local filesystem
- **Cloudflare**: Deploy serverless API for global session access
- **S3-Compatible**: Use AWS S3 or any S3-compatible service
- **Supabase**: Storage with authentication and database capabilities

### Simple UI

A lightweight web interface for managing sessions:

![PSP Simple UI](packages/simple-ui/screenshot.png)

Features:
- View, create, and manage sessions
- Import/export session data
- Authentication with Supabase
- Responsive design for all devices
- Easy self-hosting

To use the Simple UI:

```bash
# Clone the repository
git clone https://github.com/samihalawa/PSP-PersistentSessionsProtocol.git

# Go to the Simple UI directory
cd PSP-PersistentSessionsProtocol/packages/simple-ui

# Configure the UI (edit config.js)
# Then serve with any static web server
npx serve
```

## Storage Backends

Configure PSP to store sessions where you need them:

### Local Storage

Best for development and testing:

```javascript
const psp = createPSPClient({
  storage: {
    type: 'local',
    path: './sessions'
  }
});
```

### Cloudflare Workers

For global access and serverless deployment:

```javascript
const psp = createPSPClient({
  storage: {
    type: 'cloudflare',
    endpoint: 'https://your-worker.workers.dev',
    apiKey: 'your-api-key'
  }
});
```

### S3-Compatible Storage

For persistent cloud storage:

```javascript
const psp = createPSPClient({
  storage: {
    type: 's3',
    region: 'us-east-1',
    bucket: 'psp-sessions',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});
```

### Supabase

For storage with authentication:

```javascript
const psp = createPSPClient({
  storage: {
    type: 'supabase',
    url: 'https://your-project.supabase.co',
    apiKey: process.env.SUPABASE_KEY,
    bucket: 'sessions'
  }
});
```

## Documentation

For complete documentation, visit:
- [Getting Started Guide](docs/guide/getting-started.md)
- [API Reference](docs/api-reference.md)
- [Storage Configuration](docs/deployment-guide.md)
- [Framework-Specific Examples](docs/examples)

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for more information.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.