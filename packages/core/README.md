# @psp/core

Core library for the PersistentSessionsProtocol (PSP) - a unified approach for browser session persistence across frameworks.

[![npm version](https://img.shields.io/npm/v/@psp/core.svg)](https://www.npmjs.com/package/@psp/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

The PersistentSessionsProtocol (PSP) creates a standardized approach for browser automation tools to save, share, and restore session data across different frameworks and machines. This protocol bridges the critical gap in browser automation by providing a framework-agnostic method for persisting state, significantly reducing authentication friction and improving testing reliability.

This package (`@psp/core`) provides the core functionality and data structures needed to implement the protocol:

- Session state model
- Storage providers
- Framework-agnostic adapter interface
- Serialization and deserialization utilities

## Installation

```bash
npm install @psp/core
```

## Basic Usage

The core library is typically used alongside a framework-specific adapter:

```javascript
import { LocalStorageProvider } from '@psp/core';
import { PlaywrightAdapter } from '@psp/playwright';

// Initialize storage provider
const storage = new LocalStorageProvider();

// Create adapter with storage
const adapter = new PlaywrightAdapter({ storage });

// Use the adapter with your framework
```

## Storage Providers

The core package includes multiple storage providers:

```javascript
import { 
  LocalStorageProvider, 
  CloudStorageProvider 
} from '@psp/core';

// Local file system storage
const localStorage = new LocalStorageProvider({
  basePath: './sessions'
});

// Cloud storage (AWS S3, Google Cloud Storage, Azure Blob)
const cloudStorage = new CloudStorageProvider({
  provider: 's3',
  bucket: 'my-sessions-bucket',
  region: 'us-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});
```

## Creating Custom Adapters

You can implement custom adapters for any browser automation framework:

```javascript
import { BaseAdapter, SessionState } from '@psp/core';

class MyCustomAdapter extends BaseAdapter {
  async captureState(target) {
    // Implement state capture logic specific to your framework
    // Should return a SessionState object
  }
  
  async applyState(target, state) {
    // Implement state restoration logic specific to your framework
  }
}
```

## Data Model

The core library defines the data model for browser session state:

```typescript
interface BrowserSessionState {
  // Protocol version
  version: string;
  
  // Creation timestamp
  timestamp: number;
  
  // Origin where the session was captured
  origin: string;
  
  // Storage state (cookies, localStorage, etc.)
  storage: StorageState;
  
  // Optional components
  dom?: DOMState;
  history?: HistoryState;
  network?: NetworkState;
  recording?: RecordingState;
}
```

## API Documentation

### Classes

- `BaseAdapter` - Base class for framework-specific adapters
- `Session` - Represents a browser session with capture/restore functionality
- `StorageProvider` - Base class for storage implementations
- `LocalStorageProvider` - File system storage implementation
- `CloudStorageProvider` - Cloud storage implementation

### Utilities

- `generateId()` - Generates a unique session ID
- `serializeState(state)` - Converts session state to a serialized format
- `deserializeState(data)` - Converts serialized data back to session state

## Related Packages

- `@psp/playwright` - Playwright adapter for PSP
- `@psp/selenium` - Selenium adapter for PSP
- `@psp/puppeteer` - Puppeteer adapter for PSP
- `@psp/browser-use` - Browser-Use adapter for PSP
- `@psp/server` - Server implementation for remote storage and APIs

## Contributing

Contributions are welcome! Please see the [contributing guidelines](../../CONTRIBUTING.md) for more information.

## License

MIT