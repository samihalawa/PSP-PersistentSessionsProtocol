"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupWebSocketHandlers = setupWebSocketHandlers;
exports.broadcastSessionUpdate = broadcastSessionUpdate;
exports.broadcastSessionEvent = broadcastSessionEvent;
const ws_1 = require("ws");
const logger_1 = require("../utils/logger");
const auth_1 = require("./auth");
const logger = (0, logger_1.createLogger)('websocket');
/**
 * Message types for WebSocket communication
 */
var MessageType;
(function (MessageType) {
    MessageType["CONNECT"] = "connect";
    MessageType["SUBSCRIBE"] = "subscribe";
    MessageType["UNSUBSCRIBE"] = "unsubscribe";
    MessageType["UPDATE"] = "update";
    MessageType["EVENT"] = "event";
    MessageType["ERROR"] = "error";
    MessageType["PING"] = "ping";
    MessageType["PONG"] = "pong";
})(MessageType || (MessageType = {}));
/**
 * Sets up WebSocket handlers
 */
function setupWebSocketHandlers(wss, storageProvider, authEnabled = false) {
    // Use the global session clients map
    const sessionClients = globalSessionClients;
    // Handle new connections
    wss.on('connection', (ws) => {
        ws.isAlive = true;
        logger.debug('New WebSocket connection');
        // Handle messages
        ws.on('message', (message) => {
            try {
                const parsedMessage = JSON.parse(message);
                handleMessage(ws, parsedMessage);
            }
            catch (error) {
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
    function handleMessage(ws, message) {
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
    function handleConnect(ws, message) {
        // Validate token if auth is enabled
        if (authEnabled) {
            if (!message.token) {
                sendError(ws, 'Token is required');
                return;
            }
            try {
                const userData = (0, auth_1.validateToken)(message.token);
                ws.userId = userData.userId;
            }
            catch (error) {
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
    function handleSubscribe(ws, message) {
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
    function handleUnsubscribe(ws, message) {
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
    function handleEvent(ws, message) {
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
    function handlePing(ws) {
        ws.send(JSON.stringify({
            type: MessageType.PONG
        }));
    }
    /**
     * Send an error message to a client
     */
    function sendError(ws, errorMessage) {
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
            const client = ws;
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
let globalSessionClients = new Map();
/**
 * Broadcast a session update to all subscribed clients
 */
function broadcastSessionUpdate(sessionId, data) {
    broadcastToSession(sessionId, {
        type: MessageType.UPDATE,
        sessionId,
        data
    });
}
/**
 * Broadcast a session event to all subscribed clients
 */
function broadcastSessionEvent(sessionId, event) {
    broadcastToSession(sessionId, {
        type: MessageType.EVENT,
        sessionId,
        data: event
    });
}
/**
 * Broadcast a message to all clients subscribed to a session
 */
function broadcastToSession(sessionId, message) {
    const clients = globalSessionClients.get(sessionId);
    if (!clients) {
        return;
    }
    const messageStr = JSON.stringify(message);
    for (const client of clients) {
        if (client.readyState === ws_1.WebSocket.OPEN) {
            client.send(messageStr);
        }
    }
}
