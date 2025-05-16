"use strict";
/**
 * Error handling utilities
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatErrorMessage = formatErrorMessage;
exports.createErrorHandler = createErrorHandler;
exports.retry = retry;
const axios_1 = __importDefault(require("axios"));
/**
 * Format error message from various error types
 */
function formatErrorMessage(error) {
    if (axios_1.default.isAxiosError(error)) {
        return formatAxiosError(error);
    }
    else if (error instanceof Error) {
        return error.message;
    }
    else if (typeof error === 'string') {
        return error;
    }
    else {
        return 'An unknown error occurred';
    }
}
/**
 * Format axios error into a user-friendly message
 */
function formatAxiosError(error) {
    if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const data = error.response.data;
        if (data && data.message) {
            return `${data.message} (${status})`;
        }
        switch (status) {
            case 400:
                return 'Invalid request. Please check your input.';
            case 401:
                return 'Authentication required. Please log in.';
            case 403:
                return 'You do not have permission to perform this action.';
            case 404:
                return 'The requested resource was not found.';
            case 409:
                return 'This operation caused a conflict with the current state.';
            case 422:
                return 'Validation failed. Please check your input.';
            case 429:
                return 'Too many requests. Please try again later.';
            case 500:
                return 'Server error. Please try again later.';
            default:
                return `Server returned an error (${status})`;
        }
    }
    else if (error.request) {
        // Request was made but no response received
        return 'No response received from server. Please check your connection.';
    }
    else {
        // Error setting up request
        return `Error making request: ${error.message}`;
    }
}
/**
 * Create error handler that handles specific error types
 */
function createErrorHandler(defaultMessage, handleErrorFn) {
    return (error) => {
        if (handleErrorFn) {
            handleErrorFn(error);
        }
        console.error(error);
        return formatErrorMessage(error) || defaultMessage;
    };
}
/**
 * Retry a function with exponential backoff
 */
async function retry(fn, options = {}) {
    const { maxRetries = 3, initialDelay = 1000, maxDelay = 10000, factor = 2, shouldRetry = () => true } = options;
    let lastError;
    let delay = initialDelay;
    for (let retry = 0; retry <= maxRetries; retry++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (retry >= maxRetries || !shouldRetry(error)) {
                break;
            }
            // Wait for the calculated delay
            await new Promise(resolve => setTimeout(resolve, delay));
            // Increase delay for next retry (with maximum limit)
            delay = Math.min(delay * factor, maxDelay);
        }
    }
    throw lastError;
}
