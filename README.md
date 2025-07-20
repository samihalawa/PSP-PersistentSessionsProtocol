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

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/samihalawa/PSP-PersistentSessionsProtocol.git
cd PSP-PersistentSessionsProtocol

# Install dependencies
npm install

# Build the project
npm run build
```

### Try the Demo

```bash
# Run the interactive demo
npm run demo
```

### Basic Usage

```bash
# Run core functionality example
npm run example:core
```

## 📚 Usage Examples

### Core Session Management

```typescript
import { Session, LocalStorageProvider } from '@psp/core';

// Create a new session
const session = await Session.create({
  name: 'My Session',
  description: 'Example session',
  tags: ['example'],
  storage: 'local'
});

console.log(`Session created: ${session.getId()}`);

// Update session metadata
await session.updateMetadata({
  description: 'Updated description'
});

// Clone the session
const clonedSession = await session.clone('Cloned Session');

// Save and load sessions
await session.save();
const loadedSession = await Session.load(session.getId());
```

### Server Usage

```typescript
import { Server } from '@psp/server';

const server = new Server({
  port: 3000,
  host: 'localhost',
  storageType: 'local',
  authEnabled: false
});

await server.initialize();
await server.start();

console.log('PSP Server running on http://localhost:3000');
```

## 🏗️ Architecture

PSP employs a layered architecture with four distinct components:

1. **Session Capture Layer** - Extracts state using browser-specific adapters
2. **Serialization and Transport Layer** - Handles data encoding and transmission
3. **Storage Layer** - Manages persistent storage of session data
4. **Replay Layer** - Restores sessions across different environments

## 📦 Components

### Core Library (`@psp/core`)
- Framework-agnostic session management
- Local storage provider
- Session CRUD operations
- State serialization/deserialization

### Server (`@psp/server`)
- REST API for session management
- WebSocket support for real-time updates
- Multiple storage backends
- Authentication middleware

### Adapters
- **Playwright** - Integration with Playwright browser automation
- **Selenium** - WebDriver-based session capture and replay
- **More coming soon** - Puppeteer, Skyvern, Stagehand

### Storage Providers
- **Local** - File system storage (ready to use)
- **Redis** - In-memory data store (ready to use)
- **Database** - SQL database storage (placeholder)
- **Cloud** - Cloud storage backends (placeholder)

## 🧪 Testing

```bash
# Run tests
npm test

# Run linting
npm run lint

# Format code
npm run format
```

## 📖 Documentation

Detailed documentation is available in the [docs](docs) directory:

- [Protocol Specification](docs/protocol/README.md)
- [Data Model](docs/protocol/data-model.md)
- [Implementing Adapters](docs/protocol/implementing-adapters.md)
- [Getting Started Guide](docs/guide/getting-started.md)

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

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
  storage: 'cloud', // or 'local', 'redis', etc.
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
