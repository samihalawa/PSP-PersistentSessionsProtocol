// Export everything from API client and hooks
export * from './api';
export * from './hooks';

// Re-export common types from core
export { 
  StorageProvider,
  StorageOptions,
  createStorageProvider
} from '@psp/core';

// Library version
export const VERSION = '0.1.0';