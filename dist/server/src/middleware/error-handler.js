"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('error-handler');
/**
 * Global error handling middleware
 */
function errorHandler(err, req, res, next) {
    // Log the error
    logger.error(err.message, {
        stack: err.stack,
        path: req.path,
        method: req.method,
    });
    // Handle AppError (known application errors)
    if (err instanceof errors_1.AppError) {
        res.status(err.statusCode).json({
            error: {
                message: err.message,
                code: err.statusCode,
            },
        });
        return;
    }
    // Handle other errors
    res.status(500).json({
        error: {
            message: 'Internal Server Error',
            code: 500,
        },
    });
}
