export interface Session {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  createdWith?: string;
  expireAt?: number;
  createdBy?: string;
}

export interface BrowserSessionState {
  version: string;
  timestamp: number;
  origin: string;
  storage: StorageState;
  dom?: DOMState;
  history?: HistoryState;
  network?: NetworkState;
  recording?: RecordingState;
  extensions?: Record<string, unknown>;
}

export interface StorageState {
  cookies: Cookie[];
  localStorage: Map<string, Map<string, string>>;
  sessionStorage: Map<string, Map<string, string>>;
  indexedDB?: IndexedDBState;
  cacheStorage?: CacheStorageState;
}

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

export interface DOMState {
  html: string;
  scrollPosition: {
    x: number;
    y: number;
  };
  activeElement?: {
    selector: string;
    value?: string;
  };
  formData?: Map<string, string>;
}

export interface HistoryState {
  currentUrl: string;
  entries: HistoryEntry[];
  currentIndex: number;
}

export interface HistoryEntry {
  url: string;
  title: string;
  state?: object;
  scrollPosition?: { x: number; y: number };
  timestamp: number;
}

export interface NetworkState {
  captures: NetworkCapture[];
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

export interface RecordingState {
  events: Event[];
  startTime: number;
  duration: number;
  metadata?: Record<string, any>;
}

export interface Event {
  type: string;
  timestamp: number;
  target?: string;
  data: Record<string, any>;
}

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

export interface CacheStorageState {
  caches: Map<string, CacheEntry[]>;
}

export interface CacheEntry {
  request: SerializedRequest;
  response: SerializedResponse;
}