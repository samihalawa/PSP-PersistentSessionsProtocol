/**
 * Base application error
 */
export declare class AppError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number);
}
/**
 * 400 Bad Request error
 */
export declare class BadRequestError extends AppError {
    constructor(message?: string);
}
/**
 * 401 Unauthorized error
 */
export declare class UnauthorizedError extends AppError {
    constructor(message?: string);
}
/**
 * 403 Forbidden error
 */
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
/**
 * 404 Not Found error
 */
export declare class NotFoundError extends AppError {
    constructor(message?: string);
}
/**
 * 409 Conflict error
 */
export declare class ConflictError extends AppError {
    constructor(message?: string);
}
/**
 * 429 Too Many Requests error
 */
export declare class TooManyRequestsError extends AppError {
    constructor(message?: string);
}
/**
 * 500 Internal Server Error
 */
export declare class InternalServerError extends AppError {
    constructor(message?: string);
}
