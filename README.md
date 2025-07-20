# PersistentSessionsProtocol (PSP) 🚀

A unified, production-ready protocol for browser session persistence across automation frameworks.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/samihalawa/PSP-PersistentSessionsProtocol)
[![Platform Support](https://img.shields.io/badge/platforms-20%2B%20tested-green.svg)](#platform-compatibility)

## 🌟 Overview

The PersistentSessionsProtocol (PSP) creates a standardized approach for browser automation tools to save, share, and restore session data across different frameworks and machines. This protocol bridges the critical gap in browser automation by providing a framework-agnostic method for persisting state, significantly reducing authentication friction and improving testing reliability.

## ✨ Key Features

- **🔄 Cross-Framework Compatibility** - Works with Playwright, Selenium, Skyvern, Stagehand, and other major automation tools
- **🍪 Complete State Capture** - Preserves cookies (including HttpOnly), localStorage, sessionStorage, and authentication tokens
- **🎨 Modern GUI Interface** - Beautiful React-based UI accessible via `psp --ui`
- **🤖 MCP Integration** - Smithery.ai compatible Model Context Protocol with 12 powerful tools
- **🔒 Secure by Design** - Encryption for sensitive session data with configurable security levels
- **🎬 Session Recording & Replay** - Capture and reproduce user interactions across environments
- **🌐 REST and WebSocket APIs** - For server-based session management and real-time updates
- **☁️ Flexible Storage Options** - Support for local filesystem, Redis, database, and cloud storage backends

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

### Launch the Modern GUI

```bash
# Start the beautiful web interface
psp-cli ui
```

🌐 **Open your browser and go to: http://localhost:3000/ui**

![PSP Dashboard Screenshot](docs/images/dashboard-screenshot.png)

### Basic CLI Usage

```bash
# List all sessions
psp-cli list

# Create a new session
psp-cli create "My Gmail Session" "Testing PSP with Gmail"

# Show session details
psp-cli show <session-id>

# Delete a session
psp-cli delete <session-id>

# Start the server
psp-cli server

# Launch the GUI
psp-cli ui
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
