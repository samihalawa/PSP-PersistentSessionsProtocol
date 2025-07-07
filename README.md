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

### Quick Demo

Try the working Chrome profile demo:

```bash
# Run complete demo with session capture and restore
node demos/chrome-profiles/demo-psp-working.js

# Capture your current Chrome session
node demos/chrome-profiles/capture-current-chrome-session.js

# List all saved sessions
node demos/chrome-profiles/demo-psp-working.js list
```

### Quick Start Examples

#### Playwright with Chrome Profiles

```javascript
// Using the working PSP implementation
const { launchWithPSP } = require('./demos/chrome-profiles/demo-psp-working');

// Create new session or load existing one
const { context, session } = await launchWithPSP(sessionId, {
  sessionName: 'My Auth Session',
  headless: false
});

const page = await context.newPage();

// Navigate and login
await page.goto('https://example.com/login');
await page.fill('input[name="username"]', 'user');
await page.fill('input[name="password"]', 'pass');
await page.click('button[type="submit"]');

// Session is automatically captured in Chrome profile
await session.capture(context);

// Later, restore the session
const { context: newContext } = await launchWithPSP(session.getId());
// Chrome launches with all previous session data intact
```

#### Real-Time Session Capture

```javascript
const { ChromeSessionCapture } = require('./demos/chrome-profiles/capture-current-chrome-session');

const capture = new ChromeSessionCapture();

// Capture current Chrome session with comprehensive data
const { sessionId } = await capture.captureCurrentChromeSession();

// Later, launch Chrome with captured session
await capture.launchWithCapturedSession(sessionId);
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