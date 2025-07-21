---
layout: default
title: PSP - Persistent Sessions Protocol
---

# PersistentSessionsProtocol (PSP) 🚀

<div class="hero">
  <h2>A unified, production-ready protocol for browser session persistence across automation frameworks.</h2>
  <div class="hero-buttons">
    <a href="guide/getting-started/" class="btn btn-primary">Get Started</a>
    <a href="https://github.com/samihalawa/PSP-PersistentSessionsProtocol" class="btn btn-secondary">View on GitHub</a>
  </div>
</div>

## ✨ Key Features

<div class="features">
  <div class="feature">
    <h3>🔄 Cross-Framework</h3>
    <p>Works with Playwright, Selenium, Skyvern, Stagehand, and other major automation tools</p>
  </div>
  <div class="feature">
    <h3>🎨 Modern GUI</h3>
    <p>Beautiful React-based interface accessible via <code>psp --ui</code></p>
  </div>
  <div class="feature">
    <h3>🤖 MCP Integration</h3>
    <p>Smithery.ai compatible with 12 powerful automation tools</p>
  </div>
  <div class="feature">
    <h3>🍪 Complete Capture</h3>
    <p>Preserves cookies (HttpOnly), localStorage, tokens, and session state</p>
  </div>
  <div class="feature">
    <h3>🌐 Platform Tested</h3>
    <p>Verified with 20+ popular platforms including Gmail, GitHub, AWS</p>
  </div>
  <div class="feature">
    <h3>🔒 Secure Design</h3>
    <p>Encryption for sensitive data with configurable security levels</p>
  </div>
</div>

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

### Launch the GUI

```bash
# Start the beautiful web interface
psp-cli ui
```

### Basic Usage

```typescript
import { Session } from '@psp/core';
import { PlaywrightAdapter } from '@psp/adapter-playwright';

// Create and capture a session
const session = await Session.create({
  name: 'Gmail Session',
  tags: ['gmail', 'production'],
  storage: 'local'
});

await session.capture(page);
// Later restore in any browser/framework
await session.restore(newPage);
```

## 🌐 Platform Compatibility

PSP has been tested with 20+ popular platforms:

<div class="platform-grid">
  <div class="platform">📧 Gmail</div>
  <div class="platform">🐙 GitHub</div>
  <div class="platform">☁️ AWS Console</div>
  <div class="platform">🤖 HuggingFace</div>
  <div class="platform">🔴 Reddit</div>
  <div class="platform">💬 Discord</div>
  <div class="platform">📝 Notion</div>
  <div class="platform">💳 Stripe</div>
  <div class="platform">💼 LinkedIn</div>
  <div class="platform">🎨 Figma</div>
  <div class="platform">🛒 Shopify</div>
  <div class="platform">💬 Slack</div>
  <div class="platform">🚀 Vercel</div>
  <div class="platform">🤖 ChatGPT</div>
  <div class="platform">🎫 Zendesk</div>
  <div class="platform">📋 Jira</div>
  <div class="platform">🐳 DockerHub</div>
  <div class="platform">🎮 Twitch</div>
  <div class="platform">✍️ Medium</div>
  <div class="platform">📊 Airtable</div>
</div>

## 📚 Documentation

<div class="docs-grid">
  <a href="guide/getting-started/" class="doc-card">
    <h4>Getting Started</h4>
    <p>Quick setup and first steps with PSP</p>
  </a>
  <a href="api/" class="doc-card">
    <h4>API Reference</h4>
    <p>Complete API documentation for all components</p>
  </a>
  <a href="platforms/" class="doc-card">
    <h4>Platform Guide</h4>
    <p>Integration guides for popular platforms</p>
  </a>
  <a href="security/" class="doc-card">
    <h4>Security</h4>
    <p>Best practices and security considerations</p>
  </a>
</div>

## 🏗️ Architecture

PSP employs a layered architecture:

1. **Session Capture Layer** - Extracts state using browser-specific adapters
2. **Serialization Layer** - Handles data encoding and transmission  
3. **Storage Layer** - Manages persistent storage with encryption
4. **Replay Layer** - Restores sessions across different environments

## 🤝 Contributing

We welcome contributions! Check out our [Contributing Guide](https://github.com/samihalawa/PSP-PersistentSessionsProtocol/blob/main/CONTRIBUTING.md).

<style>
.hero {
  text-align: center;
  padding: 3rem 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  margin: -2rem -2rem 3rem -2rem;
  border-radius: 0 0 1rem 1rem;
}

.hero h2 {
  font-size: 1.5rem;
  margin-bottom: 2rem;
  font-weight: 300;
}

.hero-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: rgba(255,255,255,0.2);
  color: white;
  border: 2px solid rgba(255,255,255,0.3);
}

.btn-primary:hover {
  background: rgba(255,255,255,0.3);
  transform: translateY(-2px);
}

.btn-secondary {
  background: transparent;
  color: white;
  border: 2px solid rgba(255,255,255,0.5);
}

.btn-secondary:hover {
  background: rgba(255,255,255,0.1);
  transform: translateY(-2px);
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin: 3rem 0;
}

.feature {
  padding: 1.5rem;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.feature h3 {
  margin: 0 0 1rem 0;
  color: #2d3748;
}

.platform-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.5rem;
  margin: 2rem 0;
}

.platform {
  padding: 0.5rem;
  text-align: center;
  background: #f1f5f9;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.docs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin: 2rem 0;
}

.doc-card {
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s;
}

.doc-card:hover {
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.doc-card h4 {
  margin: 0 0 0.5rem 0;
  color: #667eea;
}

.doc-card p {
  margin: 0;
  color: #64748b;
  font-size: 0.875rem;
}
</style>