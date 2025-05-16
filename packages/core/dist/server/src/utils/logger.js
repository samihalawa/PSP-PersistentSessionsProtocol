"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
const winston_1 = __importDefault(require("winston"));
/**
 * Creates a logger with the specified module name
 */
function createLogger(module) {
    const logger = winston_1.default.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.printf(info => {
            const { timestamp, level, message, ...rest } = info;
            const ts = timestamp;
            const formattedTimestamp = ts.replace('T', ' ').replace('Z', '');
            const meta = Object.keys(rest).length
                ? ` ${JSON.stringify(rest)}`
                : '';
            return `${formattedTimestamp} [${level}] [${module}]: ${message}${meta}`;
        })),
        transports: [
            // Console transport
            new winston_1.default.transports.Console({
                format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.printf(info => {
                    const { timestamp, level, message, ...rest } = info;
                    const ts = timestamp;
                    const formattedTimestamp = ts.split('T')[1].split('.')[0];
                    const meta = Object.keys(rest).length
                        ? ` ${JSON.stringify(rest)}`
                        : '';
                    return `${formattedTimestamp} [${level}] [${module}]: ${message}${meta}`;
                }))
            }),
            // File transport for errors
            new winston_1.default.transports.File({
                filename: 'logs/error.log',
                level: 'error',
                dirname: process.env.LOG_DIR || 'logs'
            }),
            // File transport for all logs
            new winston_1.default.transports.File({
                filename: 'logs/combined.log',
                dirname: process.env.LOG_DIR || 'logs'
            })
        ]
    });
    return logger;
}
