# PSP - Persistent Sessions Protocol

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Protocol Version](https://img.shields.io/badge/Protocol-v2.0.0-green.svg)](docs/PSP-PROTOCOL-SPECIFICATION.md)

**The Universal Browser Session Protocol.**

PSP is an open standard and toolset for capturing, storing, and sharing browser sessions (cookies, localStorage, tokens) across different automation frameworks and environments.

## Live Demo

- **Dashboard**: https://psp-frontend-963208150325.us-central1.run.app
- **API Server**: https://psp-server-963208150325.us-central1.run.app

## Core Vision

- **Capture Once, Run Anywhere**: Save a session from Chrome. Use it in Playwright (Python), Selenium (Java), or Puppeteer (Node).
- **Universal Compatibility**: Works with Browser-Use, Stagehand, Skyvern, and any browser automation tool.
- **Zero Friction**: No more `user_data_dir` management. Just `psp.getSession(id)` and apply.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  YOUR AUTOMATION TOOLS (Playwright, Selenium, Puppeteer)    │
│  - Fetch session from PSP API                               │
│  - Apply cookies/storage to browser                         │
│  - Run automation with authenticated state                  │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  PSP SERVER                                                 │
│  - Store session profiles (cookies, localStorage, tokens)   │
│  - Validate integrity with checksums                        │
│  - Track expiration                                         │
│  - Share across teams/machines                              │
└─────────────────────────────────────────────────────────────┘
```

## Packages

| Package | Description |
|---------|-------------|
| `@samihalawa/psp-types` | TypeScript type definitions |
| `@samihalawa/psp-cli` | CLI for extracting browser sessions |
| `@samihalawa/psp-server-lite` | Lightweight REST API server |
| `@samihalawa/psp-adapters` | Playwright/Puppeteer adapters |
| `@samihalawa/psp-sdk-node` | Node.js SDK |
| `psp-python` | Python SDK |

## Quick Start

### 1. Use the Cloud API

```bash
# List sessions
curl https://psp-server-963208150325.us-central1.run.app/api/v2/sessions

# Create a session
curl -X POST https://psp-server-963208150325.us-central1.run.app/api/v2/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Auth Session",
    "cookies": [{"name": "token", "value": "abc123", "domain": "example.com"}],
    "origins": [{"origin": "https://example.com", "localStorage": {"user": "john"}}]
  }'
```

### 2. Run Your Own Server

```bash
# Using Docker
docker run -p 8080:8080 -v psp-data:/app/data ghcr.io/samihalawa/psp-server-lite

# Or from source
cd packages/server-lite
npm install && npm run build && npm start
```

### 3. Use in Python (Playwright)

```python
import requests
from playwright.sync_api import sync_playwright

# Fetch session from PSP
session = requests.get("https://psp-server.../api/v2/sessions/YOUR_ID").json()

with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context()
    
    # Apply cookies
    context.add_cookies(session["cookies"])
    
    # Apply localStorage
    for origin in session["origins"]:
        page = context.new_page()
        page.goto(origin["origin"])
        for key, value in origin.get("localStorage", {}).items():
            page.evaluate(f"localStorage.setItem('{key}', '{value}')")
    
    # Now browse with authenticated state!
    page.goto("https://example.com/dashboard")
```

### 4. Use in Node.js (Puppeteer)

```typescript
import puppeteer from 'puppeteer';

const SESSION_ID = 'your-session-id';
const API_URL = 'https://psp-server-963208150325.us-central1.run.app';

async function main() {
  // Fetch session
  const res = await fetch(`${API_URL}/api/v2/sessions/${SESSION_ID}`);
  const session = await res.json();
  
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Apply cookies
  await page.setCookie(...session.cookies);
  
  // Apply localStorage
  for (const origin of session.origins) {
    await page.goto(origin.origin);
    for (const [key, value] of Object.entries(origin.localStorage || {})) {
      await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value]);
    }
  }
  
  // Browse authenticated!
  await page.goto('https://example.com/dashboard');
}
```

## API Reference (v2)

### Sessions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/sessions` | GET | List all sessions |
| `/api/v2/sessions` | POST | Create a session |
| `/api/v2/sessions/:id` | GET | Get session by ID |
| `/api/v2/sessions/:id` | PUT | Update session |
| `/api/v2/sessions/:id` | DELETE | Delete session |
| `/api/v2/sessions/:id/stats` | GET | Get session statistics |

### Health

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Server info |
| `/health` | GET | Health check |

## Session Format (PSP v2)

```json
{
  "$schema": "https://psp.dev/schema/v2.json",
  "protocolVersion": "2.0.0",
  "id": "uuid",
  "name": "Session Name",
  "description": "Optional description",
  "tags": ["production", "oauth"],
  "cookies": [
    {
      "name": "session_token",
      "value": "abc123",
      "domain": ".example.com",
      "path": "/",
      "secure": true,
      "httpOnly": true,
      "sameSite": "Lax"
    }
  ],
  "origins": [
    {
      "origin": "https://example.com",
      "localStorage": { "user_id": "12345" },
      "sessionStorage": { "temp_data": "xyz" }
    }
  ],
  "browserContext": {
    "userAgent": "Mozilla/5.0...",
    "viewport": { "width": 1920, "height": 1080 }
  },
  "timestamps": {
    "created": "2024-01-01T00:00:00Z",
    "updated": "2024-01-01T00:00:00Z",
    "expires": "2024-12-31T23:59:59Z"
  },
  "checksum": "sha256hash"
}
```

## Development

```bash
# Clone
git clone https://github.com/samihalawa/PSP-PersistentSessionsProtocol
cd PSP-PersistentSessionsProtocol

# Install dependencies
npm install

# Build all packages
npm run build:types
npm run build:adapters  
npm run build:server

# Run server locally
cd packages/server-lite
npm run build && npm start
```

## Deployment

### Google Cloud Run

```bash
cd packages/server-lite
gcloud run deploy psp-server --source . --region us-central1 --allow-unauthenticated
```

### Docker Compose

```bash
docker-compose up -d
```

## Documentation

- [Protocol Specification](docs/PSP-PROTOCOL-SPECIFICATION.md)
- [Architecture Guide](docs/guide/architecture.md)
- [Quick Start](docs/guide/quick-start.md)
- [API Reference](docs/api/server.md)

## Roadmap

- [x] PSP v2 Protocol Specification
- [x] Session Storage API
- [x] Cloud Deployment (GCP Cloud Run)
- [x] Web Dashboard
- [x] Checksum Validation
- [x] Session Expiration
- [ ] CLI Profile Extraction (Chrome, Firefox, Edge)
- [ ] MCP Server Integration
- [ ] Session Encryption at Rest
- [ ] Team Sharing & Access Control
- [ ] Session Recording (RRWeb)

## License

MIT - See [LICENSE](LICENSE)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)
