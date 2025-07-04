import { StorageProvider } from '@psp/core';
/**
 * Sets up the appropriate storage provider based on configuration
 */
export declare function setupStorageProvider(type: 'local' | 'redis' | 'database' | 'cloud', options?: Record<string, any>): Promise<StorageProvider>;
export * from './redis-provider';
export * from './database-provider';
export * from './cloud-provider';
