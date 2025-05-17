// Export storage providers
export * from './provider';
export * from './local';
export * from './cloud';
export * from './s3-provider';
export * from './cloudflare-provider';
export * from './supabase-provider';

// Factory function to create appropriate storage provider
import { StorageProvider } from './provider';
import { LocalStorageProvider } from './local';
import { S3StorageProvider, S3StorageProviderOptions } from './s3-provider';
import { CloudflareStorageProvider, CloudflareStorageProviderOptions } from './cloudflare-provider';
import { SupabaseStorageProvider, SupabaseStorageProviderOptions } from './supabase-provider';
import { StorageOrchestrator } from './orchestrator';

/**
 * Storage options for session management
 */
export interface StorageOptions {
  /** Type of storage to use */
  type: 'local' | 's3' | 'cloudflare' | 'supabase' | 'orchestrator' | 'custom';

  /** Provider-specific options */
  [key: string]: any;
}

/**
 * Create a storage provider based on the specified options
 * 
 * @param options Storage configuration options
 * @returns A storage provider instance
 */
export function createStorageProvider(options: StorageOptions): StorageProvider {
  switch (options.type) {
    case 'local':
      return new LocalStorageProvider({
        directory: options.directory || options.basePath
      });
      
    case 's3': 
      return new S3StorageProvider(options as S3StorageProviderOptions);
      
    case 'cloudflare':
      return new CloudflareStorageProvider(options as CloudflareStorageProviderOptions);
      
    case 'supabase':
      return new SupabaseStorageProvider(options as SupabaseStorageProviderOptions);
      
    case 'orchestrator':
      // Validate required options for orchestrator
      if (!options.primary) {
        throw new Error('Orchestrator requires a primary storage provider');
      }

      // Convert primary from options to provider if needed
      const primary = typeof options.primary === 'object' && 'type' in options.primary
        ? createStorageProvider(options.primary as StorageOptions)
        : options.primary;

      // Convert secondary providers if needed
      let secondary = options.secondary || [];
      if (Array.isArray(secondary)) {
        secondary = secondary.map(sec => {
          return typeof sec === 'object' && 'type' in sec
            ? createStorageProvider(sec as StorageOptions)
            : sec;
        });
      }

      return new StorageOrchestrator({
        primary,
        secondary,
        useCache: options.useCache,
        cacheTtl: options.cacheTtl,
        cacheCapacity: options.cacheCapacity,
        replicate: options.replicate,
        strictConsistency: options.strictConsistency
      });

    case 'custom':
      if (!options.provider || typeof options.provider !== 'object') {
        throw new Error('Custom storage provider must be specified in options.provider');
      }
      return options.provider as StorageProvider;

    default:
      throw new Error(`Unknown storage type: ${options.type}`);
  }
}