# PersistentSessionsProtocol (PSP)

A unified protocol for browser session persistence across automation frameworks.

## Overview

The PersistentSessionsProtocol (PSP) creates a standardized approach for browser automation tools to save, share, and restore session data across different frameworks and machines. This protocol bridges the critical gap in browser automation by providing a framework-agnostic method for persisting state, significantly reducing authentication friction and improving testing reliability.

## Key Features

- **Cross-Framework Compatibility** - Works with Playwright, Selenium, Skyvern, Stagehand, and other major automation tools
- **Complete State Capture** - Preserves cookies, localStorage, sessionStorage, and authentication tokens
- **Flexible Storage Options** - Support for local filesystem, Redis, database, and cloud storage backends
- **Secure by Design** - Encryption for sensitive session data with configurable security levels
- **Session Recording & Replay** - Capture and reproduce user interactions across environments
- **REST and WebSocket APIs** - For server-based session management and real-time updates

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