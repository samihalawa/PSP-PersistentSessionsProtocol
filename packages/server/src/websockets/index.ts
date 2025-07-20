import { WebSocketServer, WebSocket } from 'ws';
import { StorageProvider } from '@psp/core';
import { createLogger } from '../utils/logger';
import { validateToken } from './auth';

const logger = createLogger('websocket');

/**
 * Client connection with additional metadata
 */
interface ClientConnection extends WebSocket {
  isAlive: boolean;
  sessionId?: string;
  userId?: string;
}

/**
 * Message types for WebSocket communication
 */
enum MessageType {
  CONNECT = 'connect',
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
  UPDATE = 'update',
  EVENT = 'event',
  ERROR = 'error',
  PING = 'ping',
  PONG = 'pong'
}

/**
 * WebSocket message interface
 */
interface WebSocketMessage {
  type: MessageType;
  sessionId?: string;
  data?: any;
  token?: string;
}

/**
 * Sets up WebSocket handlers
 */
export function setupWebSocketHandlers(
  wss: WebSocketServer,
  storageProvider: StorageProvider,
  authEnabled: boolean = false
): void {
  // Use the global session clients map
  const sessionClients = globalSessionClients;
  
  // Handle new connections
  wss.on('connection', (ws: ClientConnection) => {
    ws.isAlive = true;
    
    logger.debug('New WebSocket connection');
    
    // Handle messages
    ws.on('message', (message: string) => {
      try {
        const parsedMessage = JSON.parse(message) as WebSocketMessage;
        
        handleMessage(ws, parsedMessage);
      } catch (error) {
        logger.error('Error handling WebSocket message:', error);
        sendError(ws, 'Invalid message format');
      }
    });
    
    // Handle pong messages (for connection health check)
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    
    // Handle disconnection
    ws.on('close', () => {
      logger.debug('WebSocket connection closed');
      
      // Remove client from all sessions it was subscribed to
      if (ws.sessionId) {
        const clients = sessionClients.get(ws.sessionId);
        if (clients) {
          clients.delete(ws);
          
          if (clients.size === 0) {
            sessionClients.delete(ws.sessionId);
          }
        }
      }
    });
  });
  
  /**
   * Handle a WebSocket message
   */
  function handleMessage(ws: ClientConnection, message: WebSocketMessage): void {
    switch (message.type) {
      case MessageType.CONNECT:
        handleConnect(ws, message);
        break;
        
      case MessageType.SUBSCRIBE:
        handleSubscribe(ws, message);
        break;
        
      case MessageType.UNSUBSCRIBE:
        handleUnsubscribe(ws, message);
        break;
        
      case MessageType.EVENT:
        handleEvent(ws, message);
        break;
        
      case MessageType.PING:
        handlePing(ws);
        break;
        
      default:
        sendError(ws, `Unknown message type: ${message.type}`);
    }
  }
  
  /**
   * Handle a connect message
   */
  function handleConnect(ws: ClientConnection, message: WebSocketMessage): void {
    // Validate token if auth is enabled
    if (authEnabled) {
      if (!message.token) {
        sendError(ws, 'Token is required');
        return;
      }
      
      try {
        const userData = validateToken(message.token);
        ws.userId = userData.userId;
      } catch (error) {
        sendError(ws, 'Invalid token');
        return;
      }
    }
    
    // Send connection acknowledgment
    ws.send(JSON.stringify({
      type: MessageType.CONNECT,
      data: { connected: true }
    }));
  }
  
  /**
   * Handle a subscribe message
   */
  function handleSubscribe(ws: ClientConnection, message: WebSocketMessage): void {
    if (!message.sessionId) {
      sendError(ws, 'Session ID is required');
      return;
    }
    
    // Add client to session subscribers
    let clients = sessionClients.get(message.sessionId);
    if (!clients) {
      clients = new Set();
      sessionClients.set(message.sessionId, clients);
    }
    
    clients.add(ws);
    ws.sessionId = message.sessionId;
    
    logger.debug(`Client subscribed to session ${message.sessionId}`);
    
    // Send subscription acknowledgment
    ws.send(JSON.stringify({
      type: MessageType.SUBSCRIBE,
      sessionId: message.sessionId,
      data: { subscribed: true }
    }));
  }
  
  /**
   * Handle an unsubscribe message
   */
  function handleUnsubscribe(ws: ClientConnection, message: WebSocketMessage): void {
    if (!message.sessionId) {
      sendError(ws, 'Session ID is required');
      return;
    }
    
    // Remove client from session subscribers
    const clients = sessionClients.get(message.sessionId);
    if (clients) {
      clients.delete(ws);
      
      if (clients.size === 0) {
        sessionClients.delete(message.sessionId);
      }
    }
    
    if (ws.sessionId === message.sessionId) {
      ws.sessionId = undefined;
    }
    
    logger.debug(`Client unsubscribed from session ${message.sessionId}`);
    
    // Send unsubscription acknowledgment
    ws.send(JSON.stringify({
      type: MessageType.UNSUBSCRIBE,
      sessionId: message.sessionId,
      data: { unsubscribed: true }
    }));
  }
  
  /**
   * Handle an event message
   */
  function handleEvent(ws: ClientConnection, message: WebSocketMessage): void {
    if (!message.sessionId) {
      sendError(ws, 'Session ID is required');
      return;
    }
    
    if (!message.data) {
      sendError(ws, 'Event data is required');
      return;
    }
    
    // Broadcast event to all clients subscribed to this session
    broadcastToSession(message.sessionId, {
      type: MessageType.EVENT,
      sessionId: message.sessionId,
      data: message.data
    });
  }
  
  /**
   * Handle a ping message
   */
  function handlePing(ws: ClientConnection): void {
    ws.send(JSON.stringify({
      type: MessageType.PONG
    }));
  }
  
  /**
   * Send an error message to a client
   */
  function sendError(ws: ClientConnection, errorMessage: string): void {
    ws.send(JSON.stringify({
      type: MessageType.ERROR,
      data: { message: errorMessage }
    }));
  }
  
  // Set up a health check interval
  const interval = setInterval(() => {
    let totalClients = 0;
    let inactiveClients = 0;
    
    wss.clients.forEach((ws) => {
      const client = ws as ClientConnection;
      totalClients++;
      
      if (client.isAlive === false) {
        inactiveClients++;
        return client.terminate();
      }
      
      client.isAlive = false;
      client.ping();
    });
    
    if (totalClients > 0) {
      logger.debug(`WebSocket health check: ${totalClients} total, ${inactiveClients} inactive`);
    }
  }, 30000);
  
  // Clean up on server close
  wss.on('close', () => {
    clearInterval(interval);
  });
}

// Global session clients map for broadcasting
let globalSessionClients: Map<string, Set<ClientConnection>> = new Map();

/**
 * Broadcast a session update to all subscribed clients
 */
export function broadcastSessionUpdate(sessionId: string, data: any): void {
  broadcastToSession(sessionId, {
    type: MessageType.UPDATE,
    sessionId,
    data
  });
}

/**
 * Broadcast a session event to all subscribed clients
 */
export function broadcastSessionEvent(sessionId: string, event: any): void {
  broadcastToSession(sessionId, {
    type: MessageType.EVENT,
    sessionId,
    data: event
  });
}

/**
 * Broadcast a message to all clients subscribed to a session
 */
function broadcastToSession(sessionId: string, message: any): void {
  const clients = globalSessionClients.get(sessionId);
  if (!clients) {
    return;
  }
  
  const messageStr = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  }
}