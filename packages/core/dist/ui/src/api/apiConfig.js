"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetApiClient = exports.getApiClient = exports.createApiClient = void 0;
const pspApi_1 = require("./pspApi");
const mockPspApi_1 = require("./mockPspApi");
// Environment variables
const isDevelopment = process.env.NODE_ENV === 'development';
const useMockApi = process.env.REACT_APP_USE_MOCK_API === 'true' || isDevelopment;
// Default API URL
const defaultApiUrl = 'http://localhost:3000';
// Get API URL from localStorage or default
const getApiUrl = () => {
    return localStorage.getItem('psp-server-url') || defaultApiUrl;
};
/**
 * Create the appropriate API client based on configuration
 */
const createApiClient = () => {
    // Check if we should use mock API
    if (useMockApi) {
        console.log('Using mock API client');
        return new mockPspApi_1.MockPspApiClient();
    }
    // Use real API client
    console.log(`Using real API client with URL: ${getApiUrl()}`);
    return new pspApi_1.PSPApiClient(getApiUrl());
};
exports.createApiClient = createApiClient;
/**
 * Get singleton API client instance
 */
let apiClientInstance;
const getApiClient = () => {
    if (!apiClientInstance) {
        apiClientInstance = (0, exports.createApiClient)();
    }
    return apiClientInstance;
};
exports.getApiClient = getApiClient;
/**
 * Reset API client (useful when server URL changes)
 */
const resetApiClient = () => {
    apiClientInstance = (0, exports.createApiClient)();
};
exports.resetApiClient = resetApiClient;
// Listen for storage changes to reset client if server URL changes
if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
        if (e.key === 'psp-server-url') {
            (0, exports.resetApiClient)();
        }
    });
}
