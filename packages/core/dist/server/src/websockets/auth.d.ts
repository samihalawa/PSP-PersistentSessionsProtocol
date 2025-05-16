/**
 * Validates a token
 *
 * This is a simple implementation. In a production environment,
 * you would use a more robust solution like JWT verification.
 */
export declare function validateToken(token: string): {
    userId: string;
};
