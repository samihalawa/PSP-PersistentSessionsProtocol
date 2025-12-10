import dotenv from 'dotenv';
import { Server } from './server';
import { createLogger } from './utils/logger';

// Load environment variables
dotenv.config();

// Create logger
const logger = createLogger('main');

// Get environment variables
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = process.env.HOST || '127.0.0.1';

// Create and start the server
async function startServer() {
  try {
    const server = new Server({
      port: PORT,
      host: HOST,
      storageType:
        (process.env.STORAGE_TYPE as
          | 'local'
          | 'redis'
          | 'database'
          | 'cloud') || 'local',
      storageOptions: {
        // Redis options
        redisUrl: process.env.REDIS_URL,
        redisPassword: process.env.REDIS_PASSWORD,

        // Local storage options
        storagePath: process.env.STORAGE_PATH,

        // DB options
        dbUrl: process.env.DB_URL,
      },
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
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

// Export for use as a module
export { Server };
export * from './types';
export * from './storage';
export * from './controllers';
export * from './middleware';
export * from './utils';
