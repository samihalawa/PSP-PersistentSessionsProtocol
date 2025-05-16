"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('auth-middleware');
/**
 * Authentication middleware
 *
 * This is a simple token-based authentication.
 * In a production environment, you would use a more robust solution like JWT.
 */
function authMiddleware(req, res, next) {
    // Skip authentication for certain endpoints
    if (req.path === '/health' || req.path === '/api-docs') {
        return next();
    }
    // Get the token from the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new errors_1.UnauthorizedError('Missing or invalid Authorization header');
    }
    const token = authHeader.split(' ')[1];
    // In a real implementation, you would validate the token here
    // For now, just check if it's not empty and matches the configured token
    if (!token || token !== process.env.API_TOKEN) {
        logger.warn('Invalid token', {
            token: token.substring(0, 5) + '...',
            ip: req.ip
        });
        throw new errors_1.UnauthorizedError('Invalid token');
    }
    // Token is valid, continue
    next();
}
