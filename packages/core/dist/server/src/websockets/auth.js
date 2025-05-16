"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateToken = validateToken;
/**
 * Validates a token
 *
 * This is a simple implementation. In a production environment,
 * you would use a more robust solution like JWT verification.
 */
function validateToken(token) {
    // Check if token is valid
    if (!token || token !== process.env.WS_TOKEN) {
        throw new Error('Invalid token');
    }
    // In a real implementation, you would decode and verify the token
    // and extract the user ID from it
    return {
        userId: 'system'
    };
}
