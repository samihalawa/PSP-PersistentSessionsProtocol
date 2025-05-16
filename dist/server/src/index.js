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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const server_1 = require("./server");
Object.defineProperty(exports, "Server", { enumerable: true, get: function () { return server_1.Server; } });
const logger_1 = require("./utils/logger");
// Load environment variables
dotenv_1.default.config();
// Create logger
const logger = (0, logger_1.createLogger)('main');
// Get environment variables
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = process.env.HOST || '127.0.0.1';
// Create and start the server
async function startServer() {
    try {
        const server = new server_1.Server({
            port: PORT,
            host: HOST,
            storageType: process.env.STORAGE_TYPE || 'local',
            storageOptions: {
                // Redis options
                redisUrl: process.env.REDIS_URL,
                redisPassword: process.env.REDIS_PASSWORD,
                // Local storage options
                storagePath: process.env.STORAGE_PATH,
                // DB options
                dbUrl: process.env.DB_URL,
            }
        });
        // Initialize the server
        await server.initialize();
        // Start the server
        await server.start();
        logger.info(`Server running on ${HOST}:${PORT}`);
        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            logger.info('Shutting down...');
            await server.stop();
            process.exit(0);
        });
        process.on('SIGTERM', async () => {
            logger.info('Shutting down...');
            await server.stop();
            process.exit(0);
        });
    }
    catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}
// Start the server if this file is run directly
if (require.main === module) {
    startServer();
}
__exportStar(require("./types"), exports);
__exportStar(require("./storage"), exports);
__exportStar(require("./controllers"), exports);
__exportStar(require("./middleware"), exports);
__exportStar(require("./utils"), exports);
