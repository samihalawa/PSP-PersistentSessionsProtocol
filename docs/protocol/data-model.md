# PersistentSessionsProtocol Data Model

This document provides a detailed specification of the data model used in the PersistentSessionsProtocol.

## Session State

The core of PSP is the `BrowserSessionState` which encapsulates all aspects of a browser session:

```typescript
interface BrowserSessionState {
  // Protocol version for backward compatibility
  version: string;

  // Creation/modification timestamp (milliseconds since epoch)
  timestamp: number;

  // Original domain/URL where the session was captured
  origin: string;

  // Core storage data (cookies, localStorage, etc.)
  storage: StorageState;

  // Optional DOM state snapshot (can be large)
  dom?: DOMState;

  // Browser history state
  history?: HistoryState;

  // Captured network requests/responses
  network?: NetworkState;

  // Recorded user interactions
  recording?: RecordingState;

  // Framework-specific extensions
  extensions?: Record<string, unknown>;
}
```

## Storage State

The `StorageState` contains web storage mechanisms:

```typescript
interface StorageState {
  // HTTP cookies
  cookies: Cookie[];

  // Local storage by origin
  // Outer map key is origin (e.g., "https://example.com")
  // Inner map is key-value pairs for that origin
  localStorage: Map<string, Map<string, string>>;

  // Session storage by origin (same structure as localStorage)
  sessionStorage: Map<string, Map<string, string>>;

  // IndexedDB data (optional due to potentially large size)
  indexedDB?: IndexedDBState;

  // Cache API storage (optional)
  cacheStorage?: CacheStorageState;
}

interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number | null; // Unix timestamp or null for session cookies
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'Strict' | 'Lax' | 'None';
  partitioned: boolean; // For CHIPS partitioned cookies
}

interface IndexedDBState {
  databases: IndexedDBDatabase[];
}

interface IndexedDBDatabase {
  name: string;
  version: number;
  origin: string;
  objectStores: IndexedDBObjectStore[];
}

interface IndexedDBObjectStore {
  name: string;
  keyPath: string | string[] | null;
  autoIncrement: boolean;
  indexes: IndexedDBIndex[];
  data: IndexedDBEntry[];
}

interface IndexedDBIndex {
  name: string;
  keyPath: string | string[];
  multiEntry: boolean;
  unique: boolean;
}

interface IndexedDBEntry {
  key: any;
  value: any;
}

interface CacheStorageState {
  caches: Map<string, CacheEntry[]>;
}

interface CacheEntry {
  request: SerializedRequest;
  response: SerializedResponse;
}
```

## DOM State

The `DOMState` represents the Document Object Model:

```typescript
interface DOMState {
  // Serialized HTML content
  html: string;

  // Current scroll position
  scrollPosition: {
    x: number;
    y: number;
  };

  // Active element information (e.g., focused input)
  activeElement?: {
    selector: string;
    value?: string;
  };

  // Form input values by selector
  formData?: Map<string, string>;
}
```

## History State

The `HistoryState` captures browser navigation history:

```typescript
interface HistoryState {
  // Current URL
  currentUrl: string;

  // History entries stack
  entries: HistoryEntry[];

  // Current position in history stack
  currentIndex: number;
}

interface HistoryEntry {
  // URL of the history entry
  url: string;

  // Page title
  title: string;

  // History state object (pushState/replaceState data)
  state?: object;

  // Scroll position for this history entry
  scrollPosition?: { x: number; y: number };

  // When this entry was created/visited
  timestamp: number;
}
```

## Network State

The `NetworkState` contains information about network requests:

```typescript
interface NetworkState {
  // Captured requests and responses
  captures: NetworkCapture[];

  // Active WebSocket connections
  webSockets?: WebSocketConnection[];
}

interface NetworkCapture {
  request: SerializedRequest;
  response: SerializedResponse;
  timing: RequestTiming;
}

interface SerializedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string; // Base64 encoded for binary data
  timestamp: number;
}

interface SerializedResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body?: string; // Base64 encoded for binary data
  timestamp: number;
}

interface RequestTiming {
  startTime: number;
  endTime: number;
  dnsTime?: number;
  connectTime?: number;
  ttfbTime?: number;
}

interface WebSocketConnection {
  url: string;
  protocols: string[];
  status: 'connecting' | 'open' | 'closing' | 'closed';
  messages: WebSocketMessage[];
}

interface WebSocketMessage {
  direction: 'sent' | 'received';
  data: string;
  timestamp: number;
}
```

## Recording State

The `RecordingState` captures user interactions:

```typescript
interface RecordingState {
  // Chronological list of recorded events
  events: Event[];

  // When recording started (milliseconds since epoch)
  startTime: number;

  // Duration of the recording in milliseconds
  duration: number;

  // Additional recording metadata
  metadata?: Record<string, any>;
}

interface Event {
  // Event type
  type: string; // "click", "keydown", "input", "timer", "network", etc.

  // When the event occurred relative to startTime
  timestamp: number;

  // Target element (CSS selector or XPath)
  target?: string;

  // Event-specific data
  data: object;
}

// Common event types
interface ClickEvent extends Event {
  type: 'click';
  data: {
    button: number;
    clientX: number;
    clientY: number;
    altKey?: boolean;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    metaKey?: boolean;
  };
}

interface KeyEvent extends Event {
  type: 'keydown' | 'keyup';
  data: {
    key: string;
    code: string;
    altKey?: boolean;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    metaKey?: boolean;
  };
}

interface InputEvent extends Event {
  type: 'input';
  data: {
    value: string;
  };
}

interface NavigationEvent extends Event {
  type: 'navigation';
  data: {
    url: string;
    navigationType: 'navigate' | 'reload' | 'back_forward';
  };
}
```

## Session Metadata

Additional metadata for managing sessions:

```typescript
interface SessionMetadata {
  // Unique identifier for the session
  id: string;

  // User-provided name
  name: string;

  // Optional description
  description?: string;

  // Creation timestamp
  createdAt: number;

  // Last modification timestamp
  updatedAt: number;

  // User-defined tags for organization
  tags?: string[];

  // Original framework used to create this session
  createdWith?: string;

  // Session expiration (if applicable)
  expireAt?: number;

  // Creator user/entity ID
  createdBy?: string;

  // Access control information
  acl?: {
    owner: string;
    readAccess: string[];
    writeAccess: string[];
  };
}
```

## Protocol Buffer Representation

The Protocol Buffers schema mirrors the TypeScript interfaces above:

```protobuf
syntax = "proto3";

message BrowserSessionState {
  string version = 1;
  int64 timestamp = 2;
  string origin = 3;
  StorageState storage = 4;
  optional DOMState dom = 5;
  optional HistoryState history = 6;
  optional NetworkState network = 7;
  optional RecordingState recording = 8;
  map<string, google.protobuf.Any> extensions = 9;
}

message StorageState {
  repeated Cookie cookies = 1;
  map<string, KeyValueMap> localStorage = 2;
  map<string, KeyValueMap> sessionStorage = 3;
  optional IndexedDBState indexedDB = 4;
  optional CacheStorageState cacheStorage = 5;
}

message KeyValueMap {
  map<string, string> entries = 1;
}

message Cookie {
  string name = 1;
  string value = 2;
  string domain = 3;
  string path = 4;
  optional int64 expires = 5;
  bool httpOnly = 6;
  bool secure = 7;
  enum SameSite {
    STRICT = 0;
    LAX = 1;
    NONE = 2;
  }
  SameSite sameSite = 8;
  bool partitioned = 9;
}

// ... Additional messages omitted for brevity ...
```

## JSON Representation

For debugging and interoperability, PSP also defines a standard JSON representation:

```json
{
  "version": "1.0.0",
  "timestamp": 1646245871123,
  "origin": "https://example.com",
  "storage": {
    "cookies": [
      {
        "name": "session_id",
        "value": "abc123",
        "domain": "example.com",
        "path": "/",
        "expires": 1646332271123,
        "httpOnly": true,
        "secure": true,
        "sameSite": "Lax",
        "partitioned": false
      }
    ],
    "localStorage": {
      "https://example.com": {
        "theme": "dark",
        "userId": "12345"
      }
    },
    "sessionStorage": {
      "https://example.com": {
        "tempData": "someValue"
      }
    }
  },
  "history": {
    "currentUrl": "https://example.com/dashboard",
    "entries": [
      {
        "url": "https://example.com/",
        "title": "Example Home",
        "timestamp": 1646245800000
      },
      {
        "url": "https://example.com/login",
        "title": "Log In",
        "timestamp": 1646245830000
      },
      {
        "url": "https://example.com/dashboard",
        "title": "User Dashboard",
        "timestamp": 1646245860000
      }
    ],
    "currentIndex": 2
  },
  "recording": {
    "events": [
      {
        "type": "click",
        "timestamp": 1000,
        "target": "button#login",
        "data": {
          "button": 0,
          "clientX": 150,
          "clientY": 200
        }
      },
      {
        "type": "input",
        "timestamp": 1500,
        "target": "input#username",
        "data": {
          "value": "user@example.com"
        }
      }
    ],
    "startTime": 1646245830000,
    "duration": 10000
  }
}
```
