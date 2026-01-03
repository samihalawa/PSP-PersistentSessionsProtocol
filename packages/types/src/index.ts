/**
 * PSP (Persistent Sessions Protocol) - Type Definitions
 * Protocol Version: 2.0.0
 */

// ============================================================================
// Core Session Types
// ============================================================================

/**
 * Root PSP Session object
 */
export interface PSPSession {
  // Protocol metadata
  $schema: "https://psp.dev/schema/v2.json";
  protocolVersion: "2.0.0";

  // Session identification
  id: string;
  name: string;
  description?: string;
  tags?: string[];

  // Core session data
  cookies: PSPCookie[];
  origins: PSPOrigin[];
  indexedDB?: PSPIndexedDB[];
  serviceWorkers?: PSPServiceWorker[];

  // Browser context
  browserContext: PSPBrowserContext;

  // Metadata
  source: PSPSource;
  timestamps: PSPTimestamps;

  // Security
  encryption?: PSPEncryption;
  checksum?: string;
}

/**
 * Cookie with full attribute support
 */
export interface PSPCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "Strict" | "Lax" | "None";

  // Extended attributes
  priority?: "Low" | "Medium" | "High";
  sameParty?: boolean;
  sourceScheme?: "Secure" | "NonSecure" | "Unset";
  sourcePort?: number;
  partitionKey?: string;
}

/**
 * Origin-scoped storage data
 */
export interface PSPOrigin {
  origin: string;
  localStorage: PSPStorageEntry[];
  sessionStorage?: PSPStorageEntry[];
}

export interface PSPStorageEntry {
  key: string;
  value: string;
  size?: number;
  truncated?: boolean;
}

// ============================================================================
// IndexedDB Types
// ============================================================================

export interface PSPIndexedDB {
  origin: string;
  name: string;
  version: number;
  objectStores: PSPObjectStore[];
}

export interface PSPObjectStore {
  name: string;
  keyPath: string | string[] | null;
  autoIncrement: boolean;
  indexes: PSPIndex[];
  records: PSPRecord[];
}

export interface PSPIndex {
  name: string;
  keyPath: string | string[];
  unique: boolean;
  multiEntry: boolean;
}

export interface PSPRecord {
  key: unknown;
  value: unknown;
}

// ============================================================================
// Service Worker Types
// ============================================================================

export interface PSPServiceWorker {
  origin: string;
  scriptURL: string;
  scope: string;
  registrationId: string;
  state: "installing" | "installed" | "activating" | "activated" | "redundant";
}

// ============================================================================
// Browser Context Types
// ============================================================================

export interface PSPBrowserContext {
  userAgent: string;
  viewport?: PSPViewport;
  geolocation?: PSPGeolocation;
  permissions?: PSPPermissions;
  timezoneId?: string;
  locale?: string;
  colorScheme?: "light" | "dark" | "no-preference";
}

export interface PSPViewport {
  width: number;
  height: number;
  deviceScaleFactor?: number;
  isMobile?: boolean;
  hasTouch?: boolean;
  isLandscape?: boolean;
}

export interface PSPGeolocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface PSPPermissions {
  [origin: string]: {
    [permission: string]: "granted" | "denied" | "prompt";
  };
}

// ============================================================================
// Metadata Types
// ============================================================================

export type PSPSourceType =
  | "chrome"
  | "firefox"
  | "safari"
  | "edge"
  | "playwright"
  | "puppeteer"
  | "browserbase"
  | "gologin"
  | "mcp"
  | "merge"
  | "manual";

export type PSPCaptureMethod =
  | "cdp"
  | "storage-state"
  | "profile-copy"
  | "api"
  | "merge"
  | "manual";

export interface PSPSource {
  type: PSPSourceType;
  profilePath?: string;
  profileName?: string;
  serviceId?: string;
  captureMethod: PSPCaptureMethod;
  mergedFrom?: string[];
}

export interface PSPTimestamps {
  created: string;
  updated: string;
  captured: string;
  expires?: string;
}

// ============================================================================
// Security Types
// ============================================================================

export interface PSPEncryption {
  algorithm: "aes-256-gcm";
  keyDerivation: "pbkdf2" | "scrypt" | "argon2id";
  iterations?: number;
  salt: string;
  iv: string;
  encryptedFields: ("cookies" | "origins" | "indexedDB")[];
}

// ============================================================================
// API Types
// ============================================================================

export interface PSPConnectResponse {
  browserId: string;
  browserWSEndpoint: string;
  session: PSPSession;
}

export interface PSPConnectOptions {
  headless?: boolean;
  timeout?: number;
}

export interface PSPListResponse {
  sessions: PSPSessionSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface PSPSessionSummary {
  id: string;
  name: string;
  tags?: string[];
  cookieCount: number;
  originCount: number;
  source: PSPSource;
  timestamps: PSPTimestamps;
}

// ============================================================================
// Adapter Types (Framework Compatibility)
// ============================================================================

/**
 * Playwright storage state format
 */
export interface PlaywrightStorageState {
  cookies: PlaywrightCookie[];
  origins: PlaywrightOrigin[];
}

export interface PlaywrightCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "Strict" | "Lax" | "None";
}

export interface PlaywrightOrigin {
  origin: string;
  localStorage: Array<{ name: string; value: string }>;
}

/**
 * Puppeteer cookie format
 */
export interface PuppeteerCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

/**
 * CDP cookie format (Chrome DevTools Protocol)
 */
export interface CDPCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  size: number;
  httpOnly: boolean;
  secure: boolean;
  session: boolean;
  sameSite?: "Strict" | "Lax" | "None";
  priority?: "Low" | "Medium" | "High";
  sameParty?: boolean;
  sourceScheme?: "Secure" | "NonSecure" | "Unset";
  sourcePort?: number;
  partitionKey?: string;
}

// ============================================================================
// Legacy Compatibility (v1)
// ============================================================================

/**
 * @deprecated Use PSPCookie instead
 */
export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

/**
 * @deprecated Use PSPOrigin instead
 */
export interface LocalStorageEntry {
  domain: string;
  data: Record<string, string>;
}

/**
 * @deprecated Use PSPSession instead
 */
export interface SessionProfile {
  id: string;
  name: string;
  cookies: Cookie[];
  localStorage: LocalStorageEntry[];
  userAgent?: string;
  viewport?: { width: number; height: number };
  createdAt: string;
  updatedAt: string;
}

/**
 * @deprecated Use PSPConnectResponse instead
 */
export interface ConnectResponse {
  browserWSEndpoint: string;
  browserId: string;
  session: SessionProfile;
}

// ============================================================================
// Utility Types
// ============================================================================

export type PSPSessionCreateInput = Omit<
  PSPSession,
  "id" | "$schema" | "protocolVersion" | "timestamps" | "checksum"
>;

export type PSPSessionUpdateInput = Partial<PSPSessionCreateInput>;

// ============================================================================
// Constants
// ============================================================================

export const PSP_PROTOCOL_VERSION = "2.0.0";
export const PSP_SCHEMA_URL = "https://psp.dev/schema/v2.json";
