import { WebSocketServer } from 'ws';
import { StorageProvider } from '../../core/src';
/**
 * Sets up WebSocket handlers
 */
export declare function setupWebSocketHandlers(wss: WebSocketServer, storageProvider: StorageProvider, authEnabled?: boolean): void;
/**
 * Broadcast a session update to all subscribed clients
 */
export declare function broadcastSessionUpdate(sessionId: string, data: any): void;
/**
 * Broadcast a session event to all subscribed clients
 */
export declare function broadcastSessionEvent(sessionId: string, event: any): void;
