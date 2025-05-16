import { PSPApiClient } from './pspApi';
import { MockPspApiClient } from './mockPspApi';

// Environment variables
const isDevelopment = process.env.NODE_ENV === 'development';
const useMockApi = process.env.REACT_APP_USE_MOCK_API === 'true' || isDevelopment;

// Default API URL
const defaultApiUrl = 'http://localhost:3000';

// Get API URL from localStorage or default
const getApiUrl = (): string => {
  return localStorage.getItem('psp-server-url') || defaultApiUrl;
};

/**
 * Create the appropriate API client based on configuration
 */
export const createApiClient = () => {
  // Check if we should use mock API
  if (useMockApi) {
    console.log('Using mock API client');
    return new MockPspApiClient();
  }
  
  // Use real API client
  console.log(`Using real API client with URL: ${getApiUrl()}`);
  return new PSPApiClient(getApiUrl());
};

/**
 * Get singleton API client instance
 */
let apiClientInstance: PSPApiClient | MockPspApiClient;

export const getApiClient = (): PSPApiClient | MockPspApiClient => {
  if (!apiClientInstance) {
    apiClientInstance = createApiClient();
  }
  
  return apiClientInstance;
};

/**
 * Reset API client (useful when server URL changes)
 */
export const resetApiClient = (): void => {
  apiClientInstance = createApiClient();
};

// Listen for storage changes to reset client if server URL changes
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'psp-server-url') {
      resetApiClient();
    }
  });
}