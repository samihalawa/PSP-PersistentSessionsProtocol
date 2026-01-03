# PSP Protocol Specification v2.0

**Persistent Sessions Protocol - Technical Specification**

## 1. Overview

PSP (Persistent Sessions Protocol) is an open, framework-agnostic protocol for capturing, storing, and transporting browser session state across different automation tools and environments.

### 1.1 Design Goals

| Goal | Description |
|------|-------------|
| **Framework-Agnostic** | Works with Playwright, Puppeteer, Selenium, Browser-Use, Stagehand, Skyvern |
| **Complete State Capture** | Cookies, localStorage, sessionStorage, IndexedDB, service workers |
| **Local-First** | Operates locally by default, optional cloud sync |
| **Open Standard** | JSON-based, versioned schema, MIT licensed |
| **MCP Integration** | Native Model Context Protocol server support |
| **Encryption Ready** | Optional AES-256-GCM encryption for sensitive data |

### 1.2 Protocol Version

```
PSP-PROTOCOL-VERSION: 2.0.0
SCHEMA-VERSION: 2.0
```

---

## 2. Session Data Model

### 2.1 PSPSession (Root Object)

```typescript
interface PSPSession {
  // Protocol metadata
  $schema: "https://psp.dev/schema/v2.json";
  protocolVersion: "2.0.0";

  // Session identification
  id: string;                    // UUID v4
  name: string;                  // Human-readable name
  description?: string;          // Optional description
  tags?: string[];               // Categorization tags

  // Core session data
  cookies: PSPCookie[];
  origins: PSPOrigin[];          // localStorage/sessionStorage per origin
  indexedDB?: PSPIndexedDB[];    // IndexedDB databases
  serviceWorkers?: PSPServiceWorker[];

  // Browser context
  browserContext: PSPBrowserContext;

  // Metadata
  source: PSPSource;             // Where session was captured from
  timestamps: PSPTimestamps;

  // Security
  encryption?: PSPEncryption;
  checksum?: string;             // SHA-256 of unencrypted content
}
```

### 2.2 PSPCookie

```typescript
interface PSPCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;              // Unix timestamp (-1 for session cookies)
  httpOnly: boolean;
  secure: boolean;
  sameSite: "Strict" | "Lax" | "None";

  // Extended attributes
  priority?: "Low" | "Medium" | "High";
  sameParty?: boolean;
  sourceScheme?: "Secure" | "NonSecure" | "Unset";
  sourcePort?: number;
  partitionKey?: string;         // For CHIPS (partitioned cookies)
}
```

### 2.3 PSPOrigin

```typescript
interface PSPOrigin {
  origin: string;                // e.g., "https://example.com"

  localStorage: PSPStorageEntry[];
  sessionStorage?: PSPStorageEntry[];  // Optional, often not persisted
}

interface PSPStorageEntry {
  key: string;
  value: string;

  // Metadata for large values
  size?: number;                 // Byte size
  truncated?: boolean;           // If value was truncated
}
```

### 2.4 PSPIndexedDB

```typescript
interface PSPIndexedDB {
  origin: string;
  name: string;
  version: number;

  objectStores: PSPObjectStore[];
}

interface PSPObjectStore {
  name: string;
  keyPath: string | string[] | null;
  autoIncrement: boolean;

  indexes: PSPIndex[];
  records: PSPRecord[];
}

interface PSPIndex {
  name: string;
  keyPath: string | string[];
  unique: boolean;
  multiEntry: boolean;
}

interface PSPRecord {
  key: any;                      // IDBValidKey
  value: any;                    // Serialized value
}
```

### 2.5 PSPServiceWorker

```typescript
interface PSPServiceWorker {
  origin: string;
  scriptURL: string;
  scope: string;
  registrationId: string;

  // State at capture time
  state: "installing" | "installed" | "activating" | "activated" | "redundant";
}
```

### 2.6 PSPBrowserContext

```typescript
interface PSPBrowserContext {
  userAgent: string;
  viewport: {
    width: number;
    height: number;
    deviceScaleFactor?: number;
    isMobile?: boolean;
    hasTouch?: boolean;
    isLandscape?: boolean;
  };

  // Geolocation
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };

  // Permissions
  permissions?: {
    [origin: string]: {
      [permission: string]: "granted" | "denied" | "prompt";
    };
  };

  // Timezone
  timezoneId?: string;           // e.g., "America/New_York"

  // Locale
  locale?: string;               // e.g., "en-US"

  // Color scheme
  colorScheme?: "light" | "dark" | "no-preference";
}
```

### 2.7 PSPSource

```typescript
interface PSPSource {
  type: "chrome" | "firefox" | "safari" | "edge" | "playwright" | "puppeteer" | "browserbase" | "gologin" | "manual";

  // For browser profiles
  profilePath?: string;
  profileName?: string;

  // For cloud services
  serviceId?: string;

  // Capture method
  captureMethod: "cdp" | "storage-state" | "profile-copy" | "api" | "manual";
}
```

### 2.8 PSPTimestamps

```typescript
interface PSPTimestamps {
  created: string;               // ISO 8601
  updated: string;               // ISO 8601
  captured: string;              // When session data was captured
  expires?: string;              // Optional session expiry
}
```

### 2.9 PSPEncryption

```typescript
interface PSPEncryption {
  algorithm: "aes-256-gcm";
  keyDerivation: "pbkdf2" | "scrypt" | "argon2id";
  iterations?: number;           // For PBKDF2
  salt: string;                  // Base64 encoded
  iv: string;                    // Base64 encoded

  // Encrypted fields list
  encryptedFields: ("cookies" | "origins" | "indexedDB")[];
}
```

---

## 3. File Format

### 3.1 Standard Extension

```
.psp.json     - Unencrypted PSP session
.psp.enc      - Encrypted PSP session
```

### 3.2 Example Session File

```json
{
  "$schema": "https://psp.dev/schema/v2.json",
  "protocolVersion": "2.0.0",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "GitHub Authenticated Session",
  "tags": ["github", "authenticated", "development"],

  "cookies": [
    {
      "name": "user_session",
      "value": "abc123...",
      "domain": ".github.com",
      "path": "/",
      "expires": 1735689600,
      "httpOnly": true,
      "secure": true,
      "sameSite": "Lax"
    }
  ],

  "origins": [
    {
      "origin": "https://github.com",
      "localStorage": [
        {
          "key": "preferred_color_mode",
          "value": "dark"
        }
      ]
    }
  ],

  "browserContext": {
    "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
    "viewport": {
      "width": 1920,
      "height": 1080,
      "deviceScaleFactor": 2
    }
  },

  "source": {
    "type": "chrome",
    "profileName": "Default",
    "captureMethod": "cdp"
  },

  "timestamps": {
    "created": "2025-12-30T12:00:00Z",
    "updated": "2025-12-30T12:00:00Z",
    "captured": "2025-12-30T12:00:00Z"
  }
}
```

---

## 4. Framework Adapters

### 4.1 Playwright Adapter

#### Import from Playwright Storage State

```typescript
import { playwrightToPSP } from '@psp/adapters';

const playwrightState = await context.storageState();
const pspSession = playwrightToPSP(playwrightState, {
  name: "My Session",
  source: { type: "playwright", captureMethod: "storage-state" }
});
```

#### Export to Playwright Storage State

```typescript
import { pspToPlaywright } from '@psp/adapters';

const playwrightState = pspToPlaywright(pspSession);
const context = await browser.newContext({ storageState: playwrightState });
```

### 4.2 Puppeteer Adapter

```typescript
import { pspToPuppeteer, puppeteerToPSP } from '@psp/adapters';

// Capture
const cookies = await page.cookies();
const pspSession = puppeteerToPSP(cookies, { name: "Session" });

// Restore
const cookies = pspToPuppeteer(pspSession);
await page.setCookie(...cookies);
```

### 4.3 Chrome CDP Adapter

```typescript
import { cdpToPSP, pspToCDP } from '@psp/adapters';

// Capture via CDP
const { cookies } = await cdpClient.send('Network.getAllCookies');
const pspSession = cdpToPSP(cookies, localStorage, indexedDB);

// Restore via CDP
const cdpCookies = pspToCDP(pspSession);
await cdpClient.send('Network.setCookies', { cookies: cdpCookies });
```

### 4.4 Browserbase Import

```typescript
import { browserbaseToPSP } from '@psp/adapters';

const context = await browserbase.getContext(contextId);
const pspSession = browserbaseToPSP(context);
```

---

## 5. API Specification

### 5.1 REST API

#### Create Session
```http
POST /api/v2/sessions
Content-Type: application/json

{
  "name": "Session Name",
  "cookies": [...],
  "origins": [...],
  "browserContext": {...}
}

Response: 201 Created
{
  "id": "uuid",
  "status": "created",
  "session": {...}
}
```

#### Get Session
```http
GET /api/v2/sessions/:id

Response: 200 OK
{
  "$schema": "https://psp.dev/schema/v2.json",
  ...session data
}
```

#### Update Session
```http
PUT /api/v2/sessions/:id
Content-Type: application/json

{
  ...updated session data
}

Response: 200 OK
```

#### Delete Session
```http
DELETE /api/v2/sessions/:id

Response: 204 No Content
```

#### List Sessions
```http
GET /api/v2/sessions?tag=authenticated&limit=10&offset=0

Response: 200 OK
{
  "sessions": [...],
  "total": 42,
  "limit": 10,
  "offset": 0
}
```

#### Connect (Launch Browser)
```http
POST /api/v2/sessions/:id/connect
Content-Type: application/json

{
  "headless": true,
  "timeout": 30000
}

Response: 200 OK
{
  "browserId": "uuid",
  "browserWSEndpoint": "ws://...",
  "session": {...}
}
```

#### Disconnect (Close Browser)
```http
DELETE /api/v2/browsers/:id

Response: 204 No Content
```

### 5.2 WebSocket API

For real-time session sync:

```javascript
const ws = new WebSocket('wss://psp-server/api/v2/ws');

// Subscribe to session changes
ws.send(JSON.stringify({
  type: 'subscribe',
  sessionId: 'uuid'
}));

// Receive updates
ws.onmessage = (event) => {
  const { type, session } = JSON.parse(event.data);
  if (type === 'session.updated') {
    // Handle session update
  }
};
```

---

## 6. CLI Specification

### 6.1 Commands

```bash
# Capture session from Chrome
psp capture --browser chrome --profile Default --output session.psp.json

# Capture with encryption
psp capture --browser chrome --encrypt --output session.psp.enc

# List Chrome profiles
psp profiles --browser chrome

# Restore to running browser
psp restore --session session.psp.json --browser-url http://127.0.0.1:9222

# Convert Playwright storage state to PSP
psp convert --from playwright --input auth.json --output session.psp.json

# Convert PSP to Playwright
psp convert --to playwright --input session.psp.json --output auth.json

# Sync to server
psp sync --session session.psp.json --server http://localhost:3000

# Connect to server session
psp connect --session-id uuid --server http://localhost:3000
```

### 6.2 Environment Variables

```bash
PSP_SERVER_URL=http://localhost:3000
PSP_ENCRYPTION_KEY=base64-encoded-key
PSP_STORAGE_DIR=~/.psp/sessions
```

---

## 7. MCP Server Specification

### 7.1 Tools

```json
{
  "name": "psp_capture_session",
  "description": "Capture browser session to PSP format",
  "inputSchema": {
    "type": "object",
    "properties": {
      "browser": { "type": "string", "enum": ["chrome", "firefox", "edge"] },
      "profile": { "type": "string" },
      "name": { "type": "string" }
    },
    "required": ["browser"]
  }
}

{
  "name": "psp_restore_session",
  "description": "Restore PSP session to browser",
  "inputSchema": {
    "type": "object",
    "properties": {
      "sessionId": { "type": "string" },
      "browserUrl": { "type": "string" }
    },
    "required": ["sessionId"]
  }
}

{
  "name": "psp_list_sessions",
  "description": "List available PSP sessions",
  "inputSchema": {
    "type": "object",
    "properties": {
      "tags": { "type": "array", "items": { "type": "string" } }
    }
  }
}
```

### 7.2 Resources

```json
{
  "uri": "psp://sessions/{sessionId}",
  "name": "PSP Session",
  "mimeType": "application/json"
}
```

---

## 8. Security Considerations

### 8.1 Encryption

- AES-256-GCM for data encryption
- PBKDF2/Argon2id for key derivation
- Salt and IV stored in session metadata
- Encrypted fields: cookies, origins, indexedDB

### 8.2 Sensitive Data Handling

- Never log cookie values
- Never include passwords in localStorage captures
- Support field-level encryption
- Automatic expiry of sessions with sensitive data

### 8.3 Access Control

- API key authentication for server access
- Session ownership and sharing permissions
- Audit logging of session access

---

## 9. Compatibility Matrix

| Framework | Import | Export | Notes |
|-----------|--------|--------|-------|
| Playwright | ✅ | ✅ | Full storage state support |
| Puppeteer | ✅ | ✅ | Cookies only (localStorage via CDP) |
| Selenium | ✅ | ✅ | Cookies only |
| Browser-Use | ✅ | ✅ | Via Playwright adapter |
| Stagehand | ✅ | ✅ | Via Playwright adapter |
| Skyvern | ✅ | ✅ | Via Playwright adapter |
| Chrome CDP | ✅ | ✅ | Full support |
| Browserbase | ✅ | ❌ | Import only |
| GoLogin | ✅ | ❌ | Import only |

---

## 10. Versioning

### 10.1 Protocol Versioning

```
MAJOR.MINOR.PATCH

MAJOR: Breaking changes to schema
MINOR: New features, backward compatible
PATCH: Bug fixes, no schema changes
```

### 10.2 Migration

Sessions include protocol version for automatic migration:

```typescript
import { migrate } from '@psp/core';

const v2Session = migrate(v1Session);
```

---

## 11. References

- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Playwright Storage State](https://playwright.dev/docs/auth)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

---

*PSP Protocol Specification v2.0*
*Last Updated: 2025-12-30*
