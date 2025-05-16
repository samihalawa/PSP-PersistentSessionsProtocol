import { WebSocketServer } from 'ws';
import { StorageProvider } from '@psp/core';
/**
 * Sets up WebSocket handlers
 */
export declare function setupWebSocketHandlers(wss: WebSocketServer, storageProvider: StorageProvider, authEnabled?: boolean): void;
