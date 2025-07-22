import express from 'express';
import http from 'http';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import swaggerUi from 'swagger-ui-express';
import { createLogger } from './utils/logger';
import { setupSessionRoutes } from './routes/sessions';
import { setupStorageProvider } from './storage';
import { StorageProvider } from '@psp/core';
import { errorHandler } from './middleware/error-handler';
import { authMiddleware } from './middleware/auth';
import { setupWebSocketHandlers } from './websockets';

// Server configuration interface
export interface ServerConfig {
  port: number;
  host: string;
  storageType: 'local' | 'redis' | 'database' | 'cloud';
  storageOptions?: Record<string, any>;
  authEnabled?: boolean;
  corsOptions?: cors.CorsOptions;
}

/**
 * Main server class for PSP
 */
export class Server {
  private app: express.Application;
  private server: http.Server | null = null;
  private wss: WebSocketServer | null = null;
  private storageProvider: StorageProvider | null = null;
  private config: ServerConfig;
  private logger = createLogger('server');
  private isInitialized = false;

  /**
   * Create a new server instance
   */
  constructor(config: ServerConfig) {
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
    this.app = express();

    // Set up basic middleware
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cors(this.config.corsOptions));

    // Add request logging
    this.app.use((req, res, next) => {
      this.logger.debug(`${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Initialize the server
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Set up storage provider
      this.storageProvider = await setupStorageProvider(
        this.config.storageType,
        this.config.storageOptions
      );

      // Set up authentication if enabled
      if (this.config.authEnabled) {
        this.app.use(authMiddleware);
      }

      // Set up API routes
      setupSessionRoutes(this.app, this.storageProvider);

      // Serve Swagger UI
      // this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(require('../swagger.json')));

      // Add error handler middleware
      this.app.use(errorHandler);

      this.isInitialized = true;
      this.logger.info('Server initialized');
    } catch (error) {
      this.logger.error('Failed to initialize server:', error);
      throw error;
    }
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      try {
        // Create HTTP server
        this.server = http.createServer(this.app);

        // Create WebSocket server
        this.wss = new WebSocketServer({ server: this.server });

        // Set up WebSocket handlers
        if (this.storageProvider) {
          setupWebSocketHandlers(
            this.wss,
            this.storageProvider,
            this.config.authEnabled
          );
        }

        // Start the server
        this.server.listen(this.config.port, this.config.host, () => {
          this.logger.info(
            `Server listening on ${this.config.host}:${this.config.port}`
          );
          resolve();
        });
      } catch (error) {
        this.logger.error('Failed to start server:', error);
        reject(error);
      }
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.wss) {
        this.wss.close((err) => {
          if (err) {
            this.logger.error('Error closing WebSocket server:', err);
          } else {
            this.logger.info('WebSocket server closed');
          }
        });
      }

      if (this.server) {
        this.server.close((err) => {
          if (err) {
            this.logger.error('Error stopping server:', err);
            reject(err);
          } else {
            this.logger.info('Server stopped');
            this.server = null;
            this.wss = null;
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get the Express app
   */
  getApp(): express.Application {
    return this.app;
  }

  /**
   * Get the HTTP server
   */
  getServer(): http.Server | null {
    return this.server;
  }

  /**
   * Get the WebSocket server
   */
  getWss(): WebSocketServer | null {
    return this.wss;
  }

  /**
   * Get the storage provider
   */
  getStorageProvider(): StorageProvider | null {
    return this.storageProvider;
  }
}
