import { PSPApiClient } from './pspApi';
import { MockPspApiClient } from './mockPspApi';
/**
 * Create the appropriate API client based on configuration
 */
export declare const createApiClient: () => PSPApiClient | MockPspApiClient;
export declare const getApiClient: () => PSPApiClient | MockPspApiClient;
/**
 * Reset API client (useful when server URL changes)
 */
export declare const resetApiClient: () => void;
