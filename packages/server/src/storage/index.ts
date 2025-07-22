import { StorageProvider, LocalStorageProvider } from '../../../dist/core/src';
import { RedisStorageProvider } from './redis-provider';
import { DatabaseStorageProvider } from './database-provider';
import { CloudStorageProvider } from './cloud-provider';
import { createLogger } from '../utils/logger';

const logger = createLogger('storage');

/**
 * Sets up the appropriate storage provider based on configuration
 */
export async function setupStorageProvider(
  type: 'local' | 'redis' | 'database' | 'cloud',
  options?: Record<string, any>
): Promise<StorageProvider> {
  logger.info(`Setting up ${type} storage provider`);

  switch (type) {
    case 'redis':
      return new RedisStorageProvider(options);

    case 'database':
      return new DatabaseStorageProvider(
        options?.connectionString || 'sqlite://sessions.db'
      );

    case 'cloud':
      return new CloudStorageProvider({
        bucketName: 'psp-sessions',
        ...(options || {}),
      });

    case 'local':
    default:
      return new LocalStorageProvider(options);
  }
}

// Export storage providers
export * from './redis-provider';
export * from './database-provider';
export * from './cloud-provider';
