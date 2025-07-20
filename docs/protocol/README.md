# PersistentSessionsProtocol Specification

This document describes the PersistentSessionsProtocol (PSP), a standardized approach for browser session persistence.

## 1. Introduction

### 1.1 Motivation

Browser automation tools handle session persistence in fundamentally different ways, creating significant interoperability problems for developers. The PersistentSessionsProtocol establishes a unified method for capturing, storing, transmitting, and replaying browser sessions across Playwright, Selenium, Skyvern, and other major frameworks.

### 1.2 Goals

- Provide a framework-agnostic method for persisting browser state
- Enable seamless session transfer between different tools and environments
- Support both local and remote session storage
- Ensure security for sensitive session data
- Minimize implementation complexity for framework adapters

## 2. Core Architecture

PSP employs a layered architecture with four distinct components:

### 2.1 Session Capture Layer

The capture layer extracts state through:

- **Storage APIs**: Cookies, localStorage, sessionStorage access
- **DOM Introspection**: HTML structure and state
- **Network Interception**: Captured requests and responses
- **Browser APIs**: Navigation state through History API
- **Input Recording**: User interactions and timing

Framework adapters translate between PSP's structures and framework implementations.

### 2.2 Serialization and Transport Layer

Data serialization uses:

- **Primary format**: Protocol Buffers for efficient binary encoding
- **Fallback format**: JSON for debugging and compatibility
- **Differential updates**: Only changed state components transmitted
- **Compression**: Selective compression for large assets

### 2.3 Storage Layer

Multiple backend options supported:

- **Local filesystem**: For single-machine persistence
- **Redis**: For production deployments
- **Databases**: SQL/NoSQL for existing infrastructure
- **Cloud object storage**: For distributed access

### 2.4 Replay Layer

Session restoration through:

- **State restoration**: Direct application of serialized state
- **Event replay**: Chronological event playback
- **Network simulation**: Mocked or pass-through responses
- **Timing control**: Options for replay speed

## 3. Data Model

### 3.1 Session State

The root object containing all session data:

```typescript
interface BrowserSessionState {
  version: string;
  timestamp: number;
  origin: string;
  storage: StorageState;
  dom?: DOMState;
  history?: HistoryState;
  network?: NetworkState;
  recording?: RecordingState;
}
```

### 3.2 Storage State

Web storage and cookie data:

```typescript
interface StorageState {
  cookies: Cookie[];
  localStorage: Map<string, Map<string, string>>; // Origin to key-value map
  sessionStorage: Map<string, Map<string, string>>;
  indexedDB?: IndexedDBState;
  cacheStorage?: CacheStorageState;
}

interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number | null;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'Strict' | 'Lax' | 'None';
  partitioned: boolean; // For CHIPS (Cookie Having Independent Partitioned State)
}
```

### 3.3 Authentication State

Security tokens and credentials:

```typescript
interface AuthenticationState {
  tokens: AuthToken[];
  credentials?: EncryptedCredentials; // Only with explicit permission
}

interface AuthToken {
  type: string; // "Bearer", "JWT", "OAuth", etc.
  value: string;
  scope?: string[];
  expiresAt?: number;
  refreshToken?: string;
  isHttpOnly: boolean;
  domain: string;
}
```

### 3.4 Navigation State

Browser history and navigation:

```typescript
interface NavigationState {
  currentUrl: string;
  entries: HistoryEntry[];
  currentIndex: number;
}

interface HistoryEntry {
  url: string;
  title: string;
  state?: object; // History state object
  scrollPosition?: { x: number; y: number };
  timestamp: number;
}
```

### 3.5 Recording State

User interaction events:

```typescript
interface RecordingState {
  events: Event[];
  startTime: number;
  duration: number;
}

interface Event {
  type: string; // "click", "keydown", "timer", "network", etc.
  timestamp: number;
  target?: string; // CSS selector or XPath
  data: object; // Event-specific data
}
```

## 4. Protocol Buffers Definition

```protobuf
syntax = "proto3";

message BrowserSessionState {
  string version = 1;
  int64 timestamp = 2;
  string origin = 3;
  StorageState storage = 4;
  DOMState dom = 5;
  HistoryState history = 6;
  NetworkState network = 7;
  RecordingState recording = 8;
}

message StorageState {
  repeated Cookie cookies = 1;
  map<string, KeyValueMap> localStorage = 2;
  map<string, KeyValueMap> sessionStorage = 3;
  // Other storage types omitted for brevity
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

// Additional definitions omitted for brevity
```

## 5. API Specification

### 5.1 Core Client API

```typescript
interface PSPSession {
  // Session management
  create(options?: SessionOptions): Promise<Session>;
  load(sessionId: string): Promise<Session>;
  list(filter?: SessionFilter): Promise<SessionInfo[]>;
  delete(sessionId: string): Promise<void>;

  // State operations
  capture(page: BrowserPage): Promise<void>;
  restore(page: BrowserPage): Promise<void>;

  // Recording operations
  startRecording(options?: RecordingOptions): Promise<void>;
  stopRecording(): Promise<void>;
  playRecording(options?: PlaybackOptions): Promise<void>;
}

interface Session {
  id: string;
  metadata: SessionMetadata;
  state: BrowserSessionState;

  // Session operations
  save(): Promise<void>;
  update(partialState?: Partial<BrowserSessionState>): Promise<void>;
  clone(newId?: string): Promise<Session>;
}
```

### 5.2 Server REST API

```
GET    /sessions                # List sessions
POST   /sessions                # Create a new session
GET    /sessions/:id            # Get session by ID
PUT    /sessions/:id            # Update session
DELETE /sessions/:id            # Delete session
PATCH  /sessions/:id            # Partial update
GET    /sessions/:id/events     # Get recorded events
POST   /sessions/:id/events     # Add events to session
```

### 5.3 WebSocket API

```typescript
// Event types
type PSPWebSocketEvent =
  | { type: 'session.update'; data: BrowserSessionState }
  | { type: 'session.event'; data: Event }
  | { type: 'session.deleted'; data: { id: string } };

// Connection message for subscribing to session updates
interface PSPWebSocketConnect {
  action: 'subscribe';
  sessionId: string;
  token: string; // Authentication token
}
```

## 6. Security Model

### 6.1 Authentication

- **Token-based**: JWT for cloud deployments
- **API keys**: For system-to-system interactions
- **OAuth 2.0**: For delegated authorization

### 6.2 Encryption

- **Transport encryption**: TLS 1.3 for communications
- **At-rest encryption**: AES-128 for stored session data
- **Key management**: Rotation policies for encryption keys
- **Selective encryption**: Focus on authentication data

### 6.3 Access Control

- **Scopes**: Limit client application capabilities
- **Permissions**: Define user operation privileges
- **Session boundaries**: Isolate data between users

## 7. Implementation Guidelines

### 7.1 Adapter Implementation

Framework adapters must implement:

1. **State capture**: Extract browser state via framework APIs
2. **State restoration**: Apply state to browser context
3. **Event recording**: Capture user interactions
4. **Event replay**: Reproduce recorded actions

### 7.2 Storage Backend Implementation

Storage backends must provide:

1. **CRUD operations**: Basic session management
2. **Query capability**: Find sessions by metadata
3. **Transaction support**: Atomic operations
4. **TTL support**: Automatic session expiration
5. **Compression**: Optional data compression

## 8. Protocol Extensions

### 8.1 Extension Points

1. **Custom state components**: Vendor-specific extensions
2. **Plugin architecture**: Modular components
3. **Middleware hooks**: Pre/post processing
4. **Custom serializers**: Framework-specific optimizations

### 8.2 Versioning

- **Semantic versioning**: Standard version format
- **Feature detection**: Capability negotiation
- **Graceful degradation**: Fallbacks for unsupported features

## 9. Performance Considerations

### 9.1 Client-Side Optimizations

- **Selective capturing**: Only monitor relevant state
- **Buffered recording**: Batch updates
- **Compression**: Minimize network requirements

### 9.2 Server-Side Optimizations

- **Differential storage**: Only store changes
- **Caching layer**: In-memory caching
- **Prefetching**: Anticipatory loading

## 10. Interoperability

### 10.1 Cross-Framework Compatibility

- **Normalized selectors**: Translate between selector types
- **Action mapping**: Convert between action representations
- **State transformation**: Map between state models

### 10.2 Data Portability

- **Export formats**: Standard export formats
- **Import capabilities**: Support multiple source formats
- **Migration tools**: Convert between version formats
