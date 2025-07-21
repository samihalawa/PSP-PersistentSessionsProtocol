# PSP - Persistent Sessions Protocol 🚀

A comprehensive, production-ready solution for browser session management and automation across multiple frameworks.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/samihalawa/PSP-PersistentSessionsProtocol)
[![Platform Support](https://img.shields.io/badge/platforms-20%2B%20tested-green.svg)](#platform-compatibility)
[![CLI Ready](https://img.shields.io/badge/CLI-ready-brightgreen.svg)](#cli-interface)
[![GUI Available](https://img.shields.io/badge/GUI-available-blue.svg)](#web-interface)

## 🌟 Overview

The PersistentSessionsProtocol (PSP) transforms browser automation by providing a **unified, framework-agnostic approach** to session management. Whether you're automating Gmail, GitHub, AWS Console, or any of 20+ tested platforms, PSP captures, stores, and restores complete browser sessions seamlessly across different tools and environments.

**🎯 Perfect for:** Browser automation, testing, web scraping, AI agents, and any scenario requiring persistent browser state.

## ✨ Key Features

- **🎨 Modern Web Interface** - Beautiful, responsive GUI for session management
- **🖥️ Comprehensive CLI** - Full-featured command-line interface with interactive demos
- **🌐 Browserbase Integration** - Cloud browser automation with full session support
- **🚀 Hyperbrowser Integration** - AI-powered browser automation with profile management
- **🤖 MCP Integration** - 12 powerful tools for Smithery.ai and other MCP clients
- **🍪 Complete State Capture** - Cookies, localStorage, sessionStorage, and authentication tokens
- **🔒 Enterprise Security** - Encryption, secure cookies, and configurable security levels
- **🎬 Session Recording** - Capture and replay user interactions across environments
- **📊 Platform Testing** - Verified compatibility with 20+ popular services

## 📸 Real PSP Interface Screenshots

<div align="center">

### 🎨 PSP Dashboard
![PSP Dashboard](https://github.com/user-attachments/assets/ce885f24-7ac4-4de6-bef6-b324d8f0e211)

*The PSP dashboard provides real-time session statistics, recent sessions overview, platform usage analytics, and quick actions for session management.*

### 📋 Session Management
![PSP Sessions](https://github.com/user-attachments/assets/0f94a593-1b82-4662-95a7-f55783b4c303)

*Comprehensive session management interface for creating, editing, importing, and exporting browser sessions across platforms.*

### 🍪 Cookie Manager
![PSP Cookie Manager](https://github.com/user-attachments/assets/d8d20c70-15fe-4b4a-bd50-aeeae9cadfe5)

*Visual cookie management with security settings, expiration dates, and detailed cookie analysis for all captured sessions.*

</div>

### Dashboard Overview
![PSP Dashboard](https://github.com/user-attachments/assets/ca9f216d-4415-44cb-86b7-84d6753ff745)

### Session Management
![PSP Sessions](https://github.com/user-attachments/assets/9e52001c-0793-4445-a912-0f9e1a212998)

### Platform Integrations
![PSP Platforms](https://github.com/user-attachments/assets/27bd95e5-cd43-4127-aa7a-a52c6246ad99)

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

### CLI Interface

PSP provides a comprehensive command-line interface for all operations:

```bash
# Run the comprehensive demo (shows all features)
psp demo

# Launch the beautiful web interface
psp ui

# List all sessions with filtering
psp list --status active

# Create a new session interactively
psp create "Gmail Production" "Main Gmail session for automation"

# Launch browser for session capture
psp launch --profile gmail

# Test platform compatibility
psp test --platform Gmail

# Export sessions to various formats
psp export session-123 --format json --output ~/gmail-session.json

# Test platform compatibility
psp test

# Export session data
psp export <sessionId> --format json
```

### Web Interface

Launch the beautiful, modern web interface:

```bash
# Start the PSP web interface
psp ui

# Or specify a custom port
psp ui --port 3000
```

🌐 **The interface automatically opens at: http://localhost:3000**

The web interface provides:
- **Dashboard** - Overview of sessions, stats, and quick actions
- **Session Management** - Create, view, restore, and delete sessions
- **Platform Testing** - Test compatibility with 20+ services
- **Integrations** - Connect to Browserbase and Hyperbrowser
- **Settings** - Configure storage, adapters, and security options

## 🌐 Cloud Browser Integrations

PSP seamlessly integrates with leading cloud browser automation platforms, providing enhanced session management and scalability.

### Browserbase Integration

Connect PSP to [Browserbase](https://browserbase.com) for cloud-hosted browser automation:

```typescript
import { BrowserbaseAdapter } from '@psp/adapter-browserbase';

const adapter = new BrowserbaseAdapter({
  apiKey: process.env.BROWSERBASE_API_KEY,
  projectId: process.env.BROWSERBASE_PROJECT_ID,
  fingerprint: {
    locales: ['en-US'],
    operatingSystems: ['windows'],
    devices: ['desktop']
  }
});

// Connect and capture session
await adapter.connect();
await adapter.navigate('https://gmail.com');
const state = await adapter.captureState();

// Get debug URL for live viewing
const debugUrl = await adapter.getDebugUrl();
console.log(`Live session: ${debugUrl}`);
```

**Browserbase Features:**
- ✅ Cloud-hosted browsers with session recording
- ✅ Debug URLs for live session viewing
- ✅ Multiple projects and environments
- ✅ Fingerprinting and stealth mode
- ✅ Session state preservation across restarts

### Hyperbrowser Integration

Leverage [Hyperbrowser AI](https://hyperbrowser.ai) for advanced automation:

```typescript
import { HyperbrowserAdapter } from '@psp/adapter-hyperbrowser';

const adapter = new HyperbrowserAdapter({
  apiKey: process.env.HYPERBROWSER_API_KEY,
  useStealth: true,
  useProxy: true,
  proxyCountry: 'US',
  solveCaptchas: true,
  adblock: true,
  profileId: 'my-profile-id' // Reuse browser profiles
});

// Create and reuse profiles
const profileId = await adapter.createProfile('Gmail Profile');

// Connect with profile
await adapter.connect();
const state = await adapter.captureState();

// Get live monitoring URL
const liveUrl = await adapter.getLiveUrl();
```

**Hyperbrowser Features:**
- ✅ AI-powered browser automation
- ✅ Profile management for session persistence
- ✅ Stealth mode and advanced anti-detection
- ✅ Automatic CAPTCHA solving
- ✅ Proxy support with country/city targeting
- ✅ Ad/tracker blocking for cleaner sessions

### Usage in PSP

Both integrations work seamlessly with PSP's core functionality:

```bash
# Test compatibility with cloud platforms
psp test --platform browserbase
psp test --platform hyperbrowser

# Launch browser with cloud integration
psp launch --adapter browserbase
psp launch --adapter hyperbrowser

# Create sessions with specific adapters
psp create "Cloud Session" --adapter browserbase --tags cloud,production
```

## 🌐 Enhanced Cloud Integrations

### Browserbase Context API Integration

PSP now includes **full Browserbase Context API support** for persistent session management:

```typescript
import { BrowserbaseAdapter } from '@psp/adapter-browserbase';

const adapter = new BrowserbaseAdapter({
  apiKey: process.env.BROWSERBASE_API_KEY,
  projectId: process.env.BROWSERBASE_PROJECT_ID,
  
  // Context API for session persistence
  context: {
    persistChanges: true,    // Save changes back to persistent context
    useExisting: true,       // Use existing context if available
  },
  
  // Recording and debugging
  recording: {
    enabled: true,
    enableVideo: true,       // Video recording support
  },
  
  // Enhanced fingerprinting
  fingerprint: {
    locales: ['en-US', 'en'],
    operatingSystems: ['windows', 'macos'],
    devices: ['desktop'],
  },
  
  enableProxy: true,
});

// Connect and get debug URL for live inspection
await adapter.connect();
const debugUrl = await adapter.getDebugUrl();
console.log(`Live Debug: ${debugUrl}`);
```

### Hyperbrowser Profile Management

PSP provides **comprehensive Hyperbrowser profile management** with AI automation features:

```typescript
import { HyperbrowserAdapter } from '@psp/adapter-hyperbrowser';

const adapter = new HyperbrowserAdapter({
  apiKey: process.env.HYPERBROWSER_API_KEY,
  
  // Enhanced profile management
  profile: {
    name: 'PSP Production Profile',
    persistChanges: true,     // Save changes to profile
    autoCreate: true,         // Create profile if doesn't exist
  },
  
  // AI-powered features
  useStealth: true,           // Advanced stealth mode
  solveCaptchas: true,        // AI CAPTCHA solving
  useProxy: true,
  proxyCountry: 'US',
  
  // Automation enhancements
  adblock: true,              // Block ads and trackers
  trackers: true,
  annoyances: true,
  acceptCookies: true,        // Auto-accept cookies
  enableWebRecording: true,   // Record interactions
  enableVideoWebRecording: true,
  
  // Advanced configuration
  browserArgs: [
    '--disable-blink-features=AutomationControlled',
    '--disable-features=VizDisplayCompositor'
  ],
  urlBlocklist: ['*analytics*', '*tracking*'],
  timeoutMinutes: 30,
});

// List and manage profiles
const profiles = await adapter.listProfiles();
console.log(`Available profiles: ${profiles.length}`);

// Export session data for external tools
const exportData = await adapter.exportForHyperbrowser();
```

### Context & Profile Comparison

| Feature | Browserbase Context API | Hyperbrowser Profiles |
|---------|------------------------|----------------------|
| **Persistence** | Context-based session storage | Profile-based state management |
| **AI Features** | Basic automation | Advanced AI + CAPTCHA solving |
| **Debugging** | Live WebSocket debugging | Video recording + analytics |
| **Stealth** | Standard fingerprinting | Advanced anti-detection |
| **Use Case** | High-performance automation | Complex auth flows + AI |
```

## 🎯 Real-World Usage Examples

### Gmail Authentication Session

```typescript
import { chromium } from 'playwright';
import { PlaywrightAdapter } from '@psp/adapter-playwright';
import { Session } from '@psp/core';

// Initialize browser and adapter
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
const adapter = new PlaywrightAdapter();
await adapter.connect(page);

// Create a session for Gmail
const session = await Session.create({
  name: 'Gmail Production Session',
  description: 'Authenticated Gmail session for testing',
  tags: ['gmail', 'production', 'email'],
  storage: 'local'
});

// Navigate and authenticate
await page.goto('https://accounts.google.com/signin');
// ... perform authentication steps ...

// Capture the authenticated session
await session.capture(page);

// Later, restore the session in a new browser
const newContext = await browser.newContext();
const newPage = await newContext.newPage();
await session.restore(newPage);
// Now newPage has the same authenticated Gmail session!
```

### Skyvern AI Integration

```typescript
import { SkyvernAdapter } from '@psp/adapter-skyvern';

const skyvernAdapter = new SkyvernAdapter();
await skyvernAdapter.connect(skyvernClient);

const session = await Session.create({
  name: 'AWS Console Session',
  description: 'Authenticated AWS session for Skyvern automation',
  tags: ['aws', 'skyvern', 'cloud'],
  storage: 'local'
});

// Capture AWS session state
await session.capture();

// Use in Skyvern automation workflows
await session.restore(skyvernClient);
```

### MCP (Model Context Protocol) Integration

PSP provides a comprehensive MCP server compatible with Smithery.ai:

```bash
# Start the MCP server
psp-mcp

# Available MCP tools:
# - psp_list_sessions
# - psp_create_session  
# - psp_capture_session
# - psp_restore_session
# - psp_manage_cookies
# - psp_test_platform_compatibility
# - And 6 more powerful tools!
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
- Local storage provider with encryption
- Session CRUD operations with metadata
- State serialization/deserialization

### Modern GUI (`@psp/gui`)
- React-based session management interface
- Visual cookie manager with security settings
- Real-time session monitoring
- Import/export capabilities
- Accessible via `psp --ui`

### Server (`@psp/server`)
- REST API for session management
- WebSocket support for real-time updates
- Multiple storage backends
- Authentication middleware

### MCP Server (`@psp/mcp`)
- Smithery.ai compatible Model Context Protocol
- 12 comprehensive tools for AI integration
- Remote MCP support
- Complete session lifecycle management

### Browser Automation Adapters

#### Playwright (`@psp/adapter-playwright`)
- Complete state capture and restoration
- Recording and replay capabilities
- Screenshot and PDF generation
- Cross-browser support

#### Skyvern AI (`@psp/adapter-skyvern`)
- AI-specific browser automation integration
- Enhanced screenshot capabilities
- Smart element detection
- Workflow integration

#### Stagehand (`@psp/adapter-stagehand`)
- Browserbase integration
- Advanced recording capabilities
- Event replay with validation
- PDF generation support

#### Coming Soon
- **Selenium** - WebDriver-based session capture
- **browser-use** - Browser automation framework integration
- **hyperbrowser** - Langchain hyperbrowser support

### Storage Providers
- **Local** - File system storage with encryption (ready to use)
- **Redis** - In-memory data store (ready to use)
- **Database** - SQL database storage (coming soon)
- **Cloud** - Cloud storage backends (coming soon)

## 🌐 Platform Compatibility

PSP has been tested and verified with **20+ popular platforms**:

### Productivity & Communication
- 📧 **Gmail** - Google OAuth, HttpOnly cookies, SameSite strict
- 💬 **Slack** - Workspace authentication, real-time messages
- 💬 **Discord** - WebSocket authentication, voice tokens
- 📝 **Notion** - Workspace sessions, collaborative authentication

### Development & Cloud
- 🐙 **GitHub** - CSRF tokens, session cookies, local storage
- ☁️ **AWS Console** - SAML, MFA tokens, region-specific sessions
- 🚀 **Vercel** - Deployment authentication, Git integration
- 🐳 **DockerHub** - Container registry auth, CLI tokens

### AI & ML
- 🤖 **HuggingFace** - API tokens, model access, workspace sessions
- 🤖 **OpenAI ChatGPT** - AI session continuity, conversation state

### Social & Media
- 🔴 **Reddit** - JWT tokens, cross-domain authentication
- 💼 **LinkedIn** - Professional network, CSRF protection
- 🎮 **Twitch** - Streaming authentication, chat sessions
- ✍️ **Medium** - Publishing authentication, reader sessions

### Business & Finance
- 💳 **Stripe Dashboard** - Financial security, API keys
- 🛒 **Shopify** - E-commerce sessions, store tokens
- 🎨 **Figma** - Real-time collaboration, design tokens

### Support & Project Management
- 🎫 **Zendesk** - Support ticket auth, multi-tenant
- 📋 **Atlassian Jira** - Atlassian ID, project sessions
- 📊 **Airtable** - Database sessions, workspace auth

Each platform's session management patterns are thoroughly analyzed and supported, including:
- **HttpOnly Cookies** - Secure cookie handling
- **OAuth 2.0 / OIDC** - Modern authentication flows
- **JWT Tokens** - JSON Web Token persistence
- **CSRF Protection** - Cross-site request forgery tokens
- **Multi-factor Authentication** - MFA token management
- **WebSocket Authentication** - Real-time connection auth

## 🧪 Testing

### Run Platform Compatibility Tests

```bash
# Run the comprehensive real-world testing suite
npm run test:platforms

# Test specific platforms
npm run test:platforms -- --platforms gmail,github,aws

# Run headless tests
npm run test:platforms -- --headless
```

### Unit Tests

```bash
# Run all tests
npm test

# Run specific package tests
npm test --workspace=@psp/core
npm test --workspace=@psp/server

# Run with coverage
npm run test:coverage
```

### Linting & Formatting

```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## 🔧 Configuration

### Storage Configuration

```typescript
// Local storage with encryption
const session = await Session.create({
  name: 'Secure Session',
  storage: 'local',
  storageOptions: {
    encryption: true,
    encryptionKey: process.env.PSP_ENCRYPTION_KEY
  }
});

// Redis storage
const session = await Session.create({
  name: 'Redis Session',
  storage: 'redis',
  storageOptions: {
    host: 'localhost',
    port: 6379,
    password: process.env.REDIS_PASSWORD
  }
});
```

### Feature Toggles

```typescript
const session = await Session.create({
  name: 'Minimal Session',
  features: {
    cookies: true,
    localStorage: true,
    sessionStorage: false,
    history: false,
    network: false,
    dom: false,
    indexedDB: false,
  }
});
```

## 🔐 Security

PSP takes security seriously:

- **Encryption at Rest** - Sensitive session data is encrypted using AES-256
- **Secure Cookie Handling** - Proper handling of HttpOnly, Secure, and SameSite cookies
- **Token Management** - Safe storage and restoration of authentication tokens
- **Access Control** - Role-based access control for session management
- **Audit Logging** - Comprehensive logging of session operations

## 📚 Documentation

Detailed documentation is available:

- [Getting Started Guide](docs/guide/getting-started.md)
- [API Reference](docs/api/README.md)
- [Adapter Development](docs/adapters/README.md)
- [Platform Integration Guide](docs/platforms/README.md)
- [Security Best Practices](docs/security/README.md)
- [Troubleshooting](docs/troubleshooting/README.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for more information.

### Development Setup

```bash
# Clone and install
git clone https://github.com/samihalawa/PSP-PersistentSessionsProtocol.git
cd PSP-PersistentSessionsProtocol
npm install

# Start development
npm run dev

# Build all packages
npm run build --workspaces

# Run tests
npm test
```

## 🎬 Demo & Examples

### Real-World Automation Example

```typescript
// Example: Automated Gmail workflow with PSP
import { PSPRealWorldTester } from './examples/real-world-testing';

const tester = new PSPRealWorldTester();
await tester.initialize();

// Test Gmail session capture and restore
const result = await tester.testPlatform({
  name: 'Gmail',
  url: 'https://accounts.google.com/signin',
  sessionIndicator: '.gmail-logo',
  specialFeatures: ['Google OAuth', 'HttpOnly Cookies', 'SameSite Strict'],
  description: 'Google\'s email service with complex OAuth authentication'
});

console.log(`✅ Gmail test: ${result.success ? 'PASSED' : 'FAILED'}`);
console.log(`📊 Captured features: ${result.capturedFeatures.join(', ')}`);
```

### MCP Integration Example

```bash
# Start MCP server
psp-mcp

# Use with Smithery.ai or any MCP client
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "psp_list_sessions",
      "arguments": {
        "filter": {"platform": "gmail"},
        "limit": 5
      }
    }
  }'
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- The browser automation community for inspiration
- Playwright, Selenium, and other automation frameworks
- The Model Context Protocol (MCP) specification
- All contributors and testers

---

**Ready to revolutionize your browser automation workflow?** 

🚀 **[Get Started Now](#quick-start)** | 📖 **[View Documentation](docs/README.md)** | 💬 **[Join Community](https://github.com/samihalawa/PSP-PersistentSessionsProtocol/discussions)**
