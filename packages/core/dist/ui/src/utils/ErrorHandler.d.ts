/**
 * Error handling utilities
 */
/**
 * Format error message from various error types
 */
export declare function formatErrorMessage(error: unknown): string;
/**
 * Create error handler that handles specific error types
 */
export declare function createErrorHandler(defaultMessage: string, handleErrorFn?: (error: unknown) => void): (error: unknown) => string;
/**
 * Retry a function with exponential backoff
 */
export declare function retry<T>(fn: () => Promise<T>, options?: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
    shouldRetry?: (error: unknown) => boolean;
}): Promise<T>;
