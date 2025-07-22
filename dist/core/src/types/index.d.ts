/**
 * Core types for the PersistentSessionsProtocol
 */
/**
 * The main session state object containing all browser session data
 */
export interface BrowserSessionState {
    /** Protocol version for backward compatibility */
    version: string;
    /** Creation/modification timestamp (milliseconds since epoch) */
    timestamp: number;
    /** Original domain/URL where the session was captured */
    origin: string;
    /** Core storage data (cookies, localStorage, etc.) */
    storage: StorageState;
    /** Optional DOM state snapshot */
    dom?: DOMState;
    /** Browser history state */
    history?: HistoryState;
    /** Captured network requests/responses */
    network?: NetworkState;
    /** Recorded user interactions */
    recording?: RecordingState;
    /** Framework-specific extensions */
    extensions?: Record<string, unknown>;
}
/**
 * Web storage mechanisms including cookies, localStorage, etc.
 */
export interface StorageState {
    /** HTTP cookies */
    cookies: Cookie[];
    /** Local storage by origin */
    localStorage: Map<string, Map<string, string>>;
    /** Session storage by origin */
    sessionStorage: Map<string, Map<string, string>>;
    /** IndexedDB data (optional due to potentially large size) */
    indexedDB?: IndexedDBState;
    /** Cache API storage (optional) */
    cacheStorage?: CacheStorageState;
}
/**
 * HTTP cookie representation
 */
export interface Cookie {
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number | null;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'Strict' | 'Lax' | 'None';
    partitioned: boolean;
}
/**
 * IndexedDB database state
 */
export interface IndexedDBState {
    databases: IndexedDBDatabase[];
}
export interface IndexedDBDatabase {
    name: string;
    version: number;
    origin: string;
    objectStores: IndexedDBObjectStore[];
}
export interface IndexedDBObjectStore {
    name: string;
    keyPath: string | string[] | null;
    autoIncrement: boolean;
    indexes: IndexedDBIndex[];
    data: IndexedDBEntry[];
}
export interface IndexedDBIndex {
    name: string;
    keyPath: string | string[];
    multiEntry: boolean;
    unique: boolean;
}
export interface IndexedDBEntry {
    key: any;
    value: any;
}
/**
 * Cache API data
 */
export interface CacheStorageState {
    caches: Map<string, CacheEntry[]>;
}
export interface CacheEntry {
    request: SerializedRequest;
    response: SerializedResponse;
}
/**
 * DOM state representation
 */
export interface DOMState {
    /** Serialized HTML content */
    html: string;
    /** Current scroll position */
    scrollPosition: {
        x: number;
        y: number;
    };
    /** Active element information (e.g., focused input) */
    activeElement?: {
        selector: string;
        value?: string;
    };
    /** Form input values by selector */
    formData?: Map<string, string>;
}
/**
 * Browser history state
 */
export interface HistoryState {
    /** Current URL */
    currentUrl: string;
    /** History entries stack */
    entries: HistoryEntry[];
    /** Current position in history stack */
    currentIndex: number;
}
export interface HistoryEntry {
    url: string;
    title: string;
    state?: object;
    scrollPosition?: {
        x: number;
        y: number;
    };
    timestamp: number;
}
/**
 * Network request and response data
 */
export interface NetworkState {
    /** Captured requests and responses */
    captures: NetworkCapture[];
    /** Active WebSocket connections */
    webSockets?: WebSocketConnection[];
}
export interface NetworkCapture {
    request: SerializedRequest;
    response: SerializedResponse;
    timing: RequestTiming;
}
export interface SerializedRequest {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
    timestamp: number;
}
export interface SerializedResponse {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body?: string;
    timestamp: number;
}
export interface RequestTiming {
    startTime: number;
    endTime: number;
    dnsTime?: number;
    connectTime?: number;
    ttfbTime?: number;
}
export interface WebSocketConnection {
    url: string;
    protocols: string[];
    status: 'connecting' | 'open' | 'closing' | 'closed';
    messages: WebSocketMessage[];
}
export interface WebSocketMessage {
    direction: 'sent' | 'received';
    data: string;
    timestamp: number;
}
/**
 * User interaction recording state
 */
export interface RecordingState {
    /** Chronological list of recorded events */
    events: Event[];
    /** When recording started (milliseconds since epoch) */
    startTime: number;
    /** Duration of the recording in milliseconds */
    duration: number;
    /** Additional recording metadata */
    metadata?: Record<string, any>;
}
export interface Event {
    /** Event type */
    type: string;
    /** When the event occurred relative to startTime */
    timestamp: number;
    /** Target element (CSS selector or XPath) */
    target?: string;
    /** Event-specific data */
    data: Record<string, any>;
}
/**
 * Common event types
 */
export interface ClickEvent extends Event {
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
export interface KeyEvent extends Event {
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
export interface InputEvent extends Event {
    type: 'input';
    data: {
        value: string;
    };
}
export interface NavigationEvent extends Event {
    type: 'navigation';
    data: {
        url: string;
        navigationType: 'navigate' | 'reload' | 'back_forward';
    };
}
/**
 * Session metadata for managing sessions
 */
export interface SessionMetadata {
    /** Unique identifier for the session */
    id: string;
    /** User-provided name */
    name: string;
    /** Optional description */
    description?: string;
    /** Creation timestamp */
    createdAt: number;
    /** Last modification timestamp */
    updatedAt: number;
    /** User-defined tags for organization */
    tags?: string[];
    /** Original framework used to create this session */
    createdWith?: string;
    /** Session expiration (if applicable) */
    expireAt?: number;
    /** Creator user/entity ID */
    createdBy?: string;
    /** Access control information */
    acl?: {
        owner: string;
        readAccess: string[];
        writeAccess: string[];
    };
    /** Session status for lifecycle management */
    status?: 'active' | 'inactive' | 'terminated';
    /** Current participants in the session */
    participants?: SessionParticipant[];
    /** Session messages and chat history */
    messages?: SessionMessage[];
    /** Count of active participants */
    participantCount?: number;
}
/**
 * Session participant information
 */
export interface SessionParticipant {
    /** Unique participant identifier */
    id: string;
    /** Participant display name */
    name: string;
    /** When the participant joined */
    joinedAt: number;
    /** Whether the participant is currently active */
    isActive: boolean;
    /** Optional participant role */
    role?: 'owner' | 'participant' | 'observer';
    /** Participant-specific metadata */
    metadata?: Record<string, any>;
}
/**
 * Session message for communication
 */
export interface SessionMessage {
    /** Message unique identifier */
    id: string;
    /** ID of the sender */
    senderId: string;
    /** Display name of the sender */
    senderName: string;
    /** Message content */
    message: string;
    /** Message timestamp */
    timestamp: number;
    /** Message type */
    type: 'message' | 'system' | 'event';
    /** Optional message metadata */
    metadata?: Record<string, any>;
}
/**
 * Options for session creation
 */
export interface SessionOptions {
    /** Session name */
    name: string;
    /** Optional description */
    description?: string;
    /** Session tags */
    tags?: string[];
    /** Storage backend to use */
    storage?: 'local' | 'redis' | 'database' | 'cloud';
    /** Storage-specific options */
    storageOptions?: Record<string, any>;
    /** Features to enable/disable */
    features?: {
        cookies?: boolean;
        localStorage?: boolean;
        sessionStorage?: boolean;
        history?: boolean;
        network?: boolean;
        dom?: boolean;
        indexedDB?: boolean;
    };
    /** Expiration time in seconds (0 for no expiration) */
    expireIn?: number;
}
/**
 * Filter for listing sessions
 */
export interface SessionFilter {
    /** Filter by name (substring match) */
    name?: string;
    /** Filter by tags (must include all) */
    tags?: string[];
    /** Filter by creation time range */
    created?: {
        from?: number;
        to?: number;
    };
    /** Filter by update time range */
    updated?: {
        from?: number;
        to?: number;
    };
    /** Limit the number of results */
    limit?: number;
    /** Skip a number of results */
    offset?: number;
}
/**
 * Options for recording user interactions
 */
export interface RecordingOptions {
    /** Events to record */
    events?: {
        click?: boolean;
        input?: boolean;
        keypress?: boolean;
        navigation?: boolean;
        scroll?: boolean;
        network?: boolean;
    };
    /** Maximum number of events to record */
    maxEvents?: number;
    /** Maximum duration in milliseconds */
    maxDuration?: number;
}
/**
 * Options for playback of recorded events
 */
export interface PlaybackOptions {
    /** Playback speed multiplier (1.0 = normal speed) */
    speed?: number;
    /** Whether to simulate network requests */
    simulateNetwork?: boolean;
    /** Whether to validate element presence before actions */
    validateTargets?: boolean;
    /** Timeout for actions in milliseconds */
    actionTimeout?: number;
    /** Events to skip during playback */
    skipEvents?: string[];
}
