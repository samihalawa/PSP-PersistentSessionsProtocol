"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupStorageProvider = setupStorageProvider;
const src_1 = require("../../../dist/core/src");
const redis_provider_1 = require("./redis-provider");
const database_provider_1 = require("./database-provider");
const cloud_provider_1 = require("./cloud-provider");
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('storage');
/**
 * Sets up the appropriate storage provider based on configuration
 */
async function setupStorageProvider(type, options) {
    logger.info(`Setting up ${type} storage provider`);
    switch (type) {
        case 'redis':
            return new redis_provider_1.RedisStorageProvider(options);
        case 'database':
            return new database_provider_1.DatabaseStorageProvider(options?.connectionString || 'sqlite://sessions.db');
        case 'cloud':
            return new cloud_provider_1.CloudStorageProvider({
                bucketName: 'psp-sessions',
                ...(options || {}),
            });
        case 'local':
        default:
            return new src_1.LocalStorageProvider(options);
    }
}
// Export storage providers
__exportStar(require("./redis-provider"), exports);
__exportStar(require("./database-provider"), exports);
__exportStar(require("./cloud-provider"), exports);
