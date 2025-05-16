"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSession = validateSession;
const errors_1 = require("../utils/errors");
/**
 * Validates session creation/update requests
 */
function validateSession(req, res, next) {
    const { name } = req.body;
    // Validate required fields
    if (!name) {
        throw new errors_1.BadRequestError('Session name is required');
    }
    // Validate name
    if (typeof name !== 'string' || name.trim().length === 0) {
        throw new errors_1.BadRequestError('Session name must be a non-empty string');
    }
    // Validate tags if present
    if (req.body.tags !== undefined) {
        if (!Array.isArray(req.body.tags)) {
            throw new errors_1.BadRequestError('Tags must be an array');
        }
        // Check if all tags are strings
        for (const tag of req.body.tags) {
            if (typeof tag !== 'string' || tag.trim().length === 0) {
                throw new errors_1.BadRequestError('Tags must be non-empty strings');
            }
        }
    }
    next();
}
