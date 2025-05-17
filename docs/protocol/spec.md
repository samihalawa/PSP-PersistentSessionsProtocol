# Persistent Sessions Protocol (PSP) Specification

Version: 1.0.0

## Introduction

This document defines the Persistent Sessions Protocol (PSP), a standardized approach for capturing, storing, and restoring browser sessions across different automation frameworks and environments.

## 1. Terminology

- **Session**: A collection of browser state data that represents a point-in-time snapshot of a browser's context.
- **Storage Provider**: A component responsible for persisting session data.
- **Adapter**: A framework-specific implementation that interfaces with browser automation tools.
- **Capture**: The process of extracting state from a browser.
- **Restore**: The process of applying previously captured state to a browser.

## 2. Protocol Overview

PSP consists of four main components:

1. **Session Format**: A standardized JSON format for storing browser state.
2. **Storage Layer**: A pluggable system for persisting session data.
3. **Adapter Layer**: Framework-specific implementations.
4. **API**: A standard interface for operating with sessions.

## 3. Session Format

All PSP sessions MUST be represented in the following JSON format:

```json
{
  "version": "1.0.0",               // Protocol version
  "id": "unique-session-id",        // Unique identifier
  "timestamp": 1684122345678,       // Capture time (ms since epoch)
  "metadata": {                     // Optional metadata
    "name": "Session Name",
    "description": "Session description",
    "tags": ["tag1", "tag2"],
    "framework": "playwright",
    "createdBy": "user@example.com",
    "expireAt": "2025-01-01T00:00:00Z"
  },
  "origin": "https://example.com",  // Origin URL
  "url": "https://example.com/path", // Full URL at capture time
  "storage": {
    "cookies": [                    // Browser cookies
      {
        "name": "cookie-name",
        "value": "cookie-value",
        "domain": "example.com",
        "path": "/",
        "expires": -1,
        "httpOnly": false,
        "secure": true,
        "sameSite": "Lax"
      }
    ],
    "localStorage": {               // localStorage key-value pairs
      "key1": "value1",
      "key2": "value2"
    },
    "sessionStorage": {             // sessionStorage key-value pairs
      "key1": "value1",
      "key2": "value2"
    }
  },
  "extensions": {                   // Optional framework-specific data
    "indexedDB": { ... },           // IndexedDB data
    "webSQL": { ... },              // WebSQL data
    "serviceWorkers": [ ... ],      // Service worker registrations
    "recordedActions": [ ... ],     // Recorded user actions
    "auth": { ... }                 // Authentication-specific data
  }
}
```

### 3.1 Required Properties

The following properties MUST be present in all session objects:

- `version`: The PSP specification version used
- `timestamp`: Unix timestamp in milliseconds when the session was captured
- `origin`: The origin URL of the page (protocol + domain)
- `storage`: Object containing state data

### 3.2 Optional Properties

The following properties MAY be present in session objects:

- `id`: Unique identifier for the session (if absent, storage providers should generate one)
- `metadata`: Object containing additional descriptive data
- `url`: Full URL of the page at capture time
- `extensions`: Framework-specific data not covered by the standard storage properties

## 4. Storage Layer

Storage providers MUST implement the following interface:

```typescript
interface StorageProvider {
  // Save a session
  save(id: string, data: any): Promise<void>;
  
  // Load a session by ID
  load(id: string): Promise<any>;
  
  // Check if a session exists
  exists(id: string): Promise<boolean>;
  
  // Delete a session
  delete(id: string): Promise<void>;
  
  // List available sessions with optional filtering
  list(filter?: any): Promise<any[]>;
}
```

### 4.1 Storage Provider Types

The protocol defines several standard storage provider types:

1. **Local**: File-based storage on the local machine
2. **Remote**: HTTP-based API storage
3. **Database**: SQL or NoSQL database storage
4. **Cloud**: Cloud storage services (S3, Google Cloud Storage, etc.)

Storage providers SHOULD be configurable via environment variables.

## 5. Adapter Layer

Adapters for browser automation frameworks MUST implement the following interface:

```typescript
interface SessionAdapter {
  // Create a new session
  createSession(browserInstance: any, options?: any): Promise<Session>;
  
  // Load an existing session
  loadSession(sessionId: string, options?: any): Promise<Session>;
}

interface Session {
  // Get session ID
  getId(): string;
  
  // Get session metadata
  getMetadata(): any;
  
  // Capture browser state
  capture(): Promise<any>;
  
  // Restore browser state
  restore(browserInstance: any): Promise<void>;
  
  // [Optional] Start recording user actions
  startRecording?(): Promise<void>;
  
  // [Optional] Stop recording user actions
  stopRecording?(): Promise<void>;
  
  // [Optional] Play back recorded actions
  playRecording?(browserInstance: any, options?: any): Promise<void>;
}
```

## 6. API

### 6.1 Client API

The standard client API should follow this pattern:

```typescript
// Create a PSP client
const psp = createPSPClient({
  storage: {
    type: "local|s3|cloudflare|supabase|custom",
    // type-specific options...
  },
  // Other options...
});

// Capture a session
const sessionId = await psp.captureSession(browserInstance, {
  name: "Session name",
  description: "Session description",
  tags: ["tag1", "tag2"],
  // Other metadata...
});

// Restore a session
await psp.restoreSession(browserInstance, sessionId);

// List sessions
const sessions = await psp.listSessions({
  // Filter options...
});

// Delete a session
await psp.deleteSession(sessionId);
```

### 6.2 REST API

For remote storage, the following REST endpoints SHOULD be implemented:

- `GET /sessions` - List all sessions
- `POST /sessions` - Create a new session
- `GET /sessions/:id` - Get a specific session
- `PUT /sessions/:id` - Update a session
- `DELETE /sessions/:id` - Delete a session

## 7. Security Considerations

### 7.1 Authentication Data

Sessions MAY contain sensitive authentication data. Implementations SHOULD:

1. Support encryption of sensitive data
2. Provide options to exclude certain cookies or storage keys
3. Implement access controls for shared session storage
4. Support session expiration

### 7.2 API Security

Remote storage providers SHOULD:

1. Implement authentication for API access
2. Use HTTPS for all communications
3. Implement rate limiting to prevent abuse
4. Validate all input data

## 8. Compatibility

### 8.1 Cross-Browser Compatibility

Implementations SHOULD handle browser-specific differences, including:

1. Different cookie formats
2. Storage quota limits
3. Security restrictions

### 8.2 Cross-Framework Compatibility

The protocol MUST maintain consistent behavior across different automation frameworks.

## 9. Extension Points

The protocol can be extended in the following ways:

1. Adding new storage providers
2. Adding framework-specific capabilities in the `extensions` object
3. Implementing additional capture/restore features
4. Adding new metadata fields

## 10. Versioning

The protocol follows semantic versioning:

- MAJOR version changes indicate breaking changes
- MINOR version changes indicate backwards-compatible additions
- PATCH version changes indicate backwards-compatible fixes

## 11. Implementation Guidelines

Implementations SHOULD:

1. Provide clear error messages
2. Be configurable via environment variables
3. Support logging at different levels
4. Include retries for transient failures
5. Validate session data structure
6. Provide examples for common use cases

## Appendix A: Examples

### Playwright Example

```javascript
const { chromium } = require('playwright');
const { createPSPClient } = require('@psp/playwright');

async function demo() {
  // Initialize PSP with local storage
  const psp = createPSPClient({
    storage: { type: 'local', path: './sessions' }
  });

  // Capture a session
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://example.com');
  
  const sessionId = await psp.captureSession(page);
  await browser.close();
  
  // Restore the session later
  const newBrowser = await chromium.launch();
  const newPage = await newBrowser.newPage();
  await psp.restoreSession(newPage, sessionId);
}
```

### Selenium Example

```java
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import com.psp.selenium.PSPClient;
import com.psp.core.StorageConfig;

public class PSPDemo {
    public static void main(String[] args) {
        // Create PSP client
        PSPClient psp = PSPClient.create(
            StorageConfig.builder()
                .type("local")
                .path("./sessions")
                .build()
        );
        
        // Capture a session
        WebDriver driver = new ChromeDriver();
        driver.get("https://example.com");
        
        String sessionId = psp.captureSession(driver);
        driver.quit();
        
        // Restore the session later
        WebDriver newDriver = new ChromeDriver();
        psp.restoreSession(newDriver, sessionId);
    }
}
```