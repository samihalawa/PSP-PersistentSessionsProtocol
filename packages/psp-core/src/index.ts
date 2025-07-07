/**
 * PSP Core Library - PersistentSessionsProtocol
 * 
 * A standardized library for browser session persistence across machines
 * with support for multiple storage backends and cross-platform sync.
 */

export { PSPClient } from './client/PSPClient';
export { PSPSession } from './session/PSPSession';
export { PSPConfig } from './config/PSPConfig';

// Storage backends
export { LocalStorageBackend } from './storage/LocalStorageBackend';
export { S3StorageBackend } from './storage/S3StorageBackend';
export { CloudflareR2Backend } from './storage/CloudflareR2Backend';

// Browser adapters
export { ChromeAdapter } from './adapters/ChromeAdapter';
export { PlaywrightAdapter } from './adapters/PlaywrightAdapter';

// Types
export * from './types';

// Utilities
export { PSPUtils } from './utils/PSPUtils';
export { SessionCompression } from './utils/SessionCompression';
export { SessionEncryption } from './utils/SessionEncryption';
