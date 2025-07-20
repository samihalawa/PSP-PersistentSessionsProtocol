"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const ws_1 = require("ws");
const logger_1 = require("./utils/logger");
const sessions_1 = require("./routes/sessions");
const storage_1 = require("./storage");
const error_handler_1 = require("./middleware/error-handler");
const auth_1 = require("./middleware/auth");
const websockets_1 = require("./websockets");
/**
 * Main server class for PSP
 */
class Server {
    /**
     * Create a new server instance
     */
    constructor(config) {
        this.server = null;
        this.wss = null;
        this.storageProvider = null;
        this.logger = (0, logger_1.createLogger)('server');
        this.isInitialized = false;
        this.config = {
            ...config,
            authEnabled: config.authEnabled ?? false,
            corsOptions: config.corsOptions ?? {
                origin: '*',
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
                allowedHeaders: ['Content-Type', 'Authorization'],
            },
        };
        // Create Express app
        this.app = (0, express_1.default)();
        // Set up basic middleware
        this.app.use(express_1.default.json({ limit: '50mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true }));
        this.app.use((0, cors_1.default)(this.config.corsOptions));
        // Add request logging
        this.app.use((req, res, next) => {
            this.logger.debug(`${req.method} ${req.path}`);
            next();
        });
    }
    /**
     * Initialize the server
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        try {
            // Set up storage provider
            this.storageProvider = await (0, storage_1.setupStorageProvider)(this.config.storageType, this.config.storageOptions);
            // Set up authentication if enabled
            if (this.config.authEnabled) {
                this.app.use(auth_1.authMiddleware);
            }
            // Set up API routes
            (0, sessions_1.setupSessionRoutes)(this.app, this.storageProvider);
            // Serve Swagger UI
            // this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(require('../swagger.json')));
            // Add error handler middleware
            this.app.use(error_handler_1.errorHandler);
            this.isInitialized = true;
            this.logger.info('Server initialized');
        }
        catch (error) {
            this.logger.error('Failed to initialize server:', error);
            throw error;
        }
    }
    /**
     * Start the server
     */
    async start() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        return new Promise((resolve, reject) => {
            try {
                // Create HTTP server
                this.server = http_1.default.createServer(this.app);
                // Create WebSocket server
                this.wss = new ws_1.WebSocketServer({ server: this.server });
                // Set up WebSocket handlers
                if (this.storageProvider) {
                    (0, websockets_1.setupWebSocketHandlers)(this.wss, this.storageProvider, this.config.authEnabled);
                }
                // Start the server
                this.server.listen(this.config.port, this.config.host, () => {
                    this.logger.info(`Server listening on ${this.config.host}:${this.config.port}`);
                    resolve();
                });
            }
            catch (error) {
                this.logger.error('Failed to start server:', error);
                reject(error);
            }
        });
    }
    /**
     * Stop the server
     */
    async stop() {
        return new Promise((resolve, reject) => {
            if (this.wss) {
                this.wss.close((err) => {
                    if (err) {
                        this.logger.error('Error closing WebSocket server:', err);
                    }
                    else {
                        this.logger.info('WebSocket server closed');
                    }
                });
            }
            if (this.server) {
                this.server.close((err) => {
                    if (err) {
                        this.logger.error('Error stopping server:', err);
                        reject(err);
                    }
                    else {
                        this.logger.info('Server stopped');
                        this.server = null;
                        this.wss = null;
                        resolve();
                    }
                });
            }
            else {
                resolve();
            }
        });
    }
    /**
     * Get the Express app
     */
    getApp() {
        return this.app;
    }
    /**
     * Get the HTTP server
     */
    getServer() {
        return this.server;
    }
    /**
     * Get the WebSocket server
     */
    getWss() {
        return this.wss;
    }
    /**
     * Get the storage provider
     */
    getStorageProvider() {
        return this.storageProvider;
    }
}
exports.Server = Server;
