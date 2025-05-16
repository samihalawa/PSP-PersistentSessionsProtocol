# PersistentSessionsProtocol (PSP)

A unified protocol for browser session persistence across automation frameworks.

## Overview

The PersistentSessionsProtocol (PSP) creates a standardized approach for browser automation tools to save, share, and restore session data across different frameworks and machines. This protocol bridges the critical gap in browser automation by providing a framework-agnostic method for persisting state, significantly reducing authentication friction and improving testing reliability.

## Key Features

- **Cross-Framework Compatibility** - Works with Playwright, Selenium, Puppeteer, Skyvern, Browser-Use, Computer-Use, Stagehand, Cloudflare Workers, and other major automation tools
- **Complete State Capture** - Preserves cookies, localStorage, sessionStorage, and authentication tokens
- **Flexible Storage Options** - Support for local filesystem, Redis, database, and cloud storage backends (AWS S3, Google Cloud Storage, Azure Blob Storage)
- **Secure by Design** - Encryption for sensitive session data with configurable security levels
- **Session Recording & Replay** - Capture and reproduce user interactions across environments
- **REST and WebSocket APIs** - For server-based session management and real-time updates
- **AI Agent Integration** - Optimized for use with AI agents and browser automation

## Current Status

This project is currently under active development. The protocol specification is available in the [docs/protocol](docs/protocol) directory.

## Getting Started

Check out the [documentation](docs/README.md) for more information on how to use PSP in your projects.

### Quick Start Examples

#### Playwright

```javascript
// Create a PSP session with Playwright
const { PlaywrightAdapter } = require('@psp/client-js');
const { chromium } = require('playwright');

// Initialize browser and context
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

// Create adapter and session
const adapter = new PlaywrightAdapter();
const session = await adapter.createSession(page, {
  name: 'my-authentication-session',
  storage: 'cloud' // or 'local', 'redis', etc.
});

// Log in to your application
await page.goto('https://example.com/login');
await page.fill('input[name="username"]', 'user');
await page.fill('input[name="password"]', 'pass');
await page.click('button[type="submit"]');

// Capture the authenticated session
await session.capture();

// Later, restore the session
const newContext = await browser.newContext();
const newPage = await newContext.newPage();
await session.restore(newPage);
// Now newPage has the same authenticated session
```

#### Selenium

```python
# Create a PSP session with Selenium
from psp.client import SeleniumAdapter
from selenium import webdriver

# Initialize driver
driver = webdriver.Chrome()

# Create adapter and session
adapter = SeleniumAdapter()
session = adapter.create_session(driver, 
  name="my-authentication-session",
  storage="cloud"  # or 'local', 'redis', etc.
)

# Log in to your application
driver.get("https://example.com/login")
driver.find_element_by_name("username").send_keys("user")
driver.find_element_by_name("password").send_keys("pass")
driver.find_element_by_xpath("//button[@type='submit']").click()

# Capture the authenticated session
session.capture()

# Later, restore the session
new_driver = webdriver.Chrome()
session.restore(new_driver)
# Now new_driver has the same authenticated session
```

## Supported Frameworks

PSP provides adapters for many popular browser automation frameworks:

- **Playwright** - [@psp/playwright](packages/playwright)
- **Selenium** - [@psp/selenium](packages/selenium)
- **Puppeteer** - [@psp/puppeteer](packages/puppeteer)
- **Browser-Use** - [@psp/browser-use](packages/browser-use)
- **Computer-Use** - [@psp/computer-use](packages/computer-use)
- **Skyvern** - [psp-skyvern](packages/skyvern)
- **Stagehand** - [@psp/stagehand](packages/stagehand)
- **Cloudflare Workers** - [@psp/cloudflare](packages/cloudflare)

For detailed examples of each adapter, see our [examples page](docs/examples/index.html).

## UI Dashboard

PSP includes a modern, responsive UI dashboard for managing sessions across different frameworks:

![PSP Dashboard](packages/ui/screenshots/dashboard.png)

### Dashboard Features

- Create, view, edit, and delete browser sessions
- Real-time updates of session changes via WebSockets
- Session recording and playback capabilities
- Cross-framework session management
- Light and dark modes for comfortable viewing
- Responsive design for desktop and mobile devices
- Detailed session metrics and analytics
- Role-based access control for team environments

### UI Screenshots

#### Sessions Management
![Sessions List](packages/ui/screenshots/sessions.png)

#### Session Details
![Session Details](packages/ui/screenshots/session-details.png)

#### Session Recording
![Session Recorder](packages/ui/screenshots/recorder.png)

#### Session History
![Session History](packages/ui/screenshots/history.png)

#### Settings Page
![Settings](packages/ui/screenshots/settings.png)

#### Dark Mode Support
![Dark Mode](packages/ui/screenshots/dashboard-dark.png)

### Getting Started with the Dashboard

To start the dashboard:

```bash
cd packages/ui
npm install
npm start
```

For development with mock data:

```bash
cd packages/ui
REACT_APP_USE_MOCK_API=true npm start
```

For more information, see the [UI README](packages/ui/README.md).

## Storage Providers

PSP supports multiple storage backends for session data:

- **Local Filesystem** - Built into [@psp/core](packages/core)
- **Redis** - Built into [@psp/core](packages/core) (server package)
- **Cloud Storage**:
  - AWS S3
  - Google Cloud Storage
  - Azure Blob Storage

## Architecture

PSP employs a layered architecture:

1. **Session Capture Layer** - Extracts state using browser-specific adapters
2. **Serialization Layer** - Handles data encoding and transmission
3. **Storage Layer** - Manages persistent storage of session data
4. **Replay Layer** - Restores sessions across different environments

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for more information.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.