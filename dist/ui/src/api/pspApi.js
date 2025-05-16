"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PSPApiClient = void 0;
const axios_1 = __importDefault(require("axios"));
const websocket_1 = require("websocket");
const ErrorHandler_1 = require("../utils/ErrorHandler");
// WebSocket message types
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
 * PSP API Client
 */
class PSPApiClient {
    /**
     * Create a new PSP API client
     */
    constructor(baseUrl = 'http://localhost:3000') {
        this.wsClient = null;
        this.wsConnected = false;
        this.sessionListeners = new Map();
        this.eventListeners = new Map();
        this.errorListeners = new Set();
        this.pingInterval = null;
        // Create HTTP client
        this.httpClient = axios_1.default.create({
            baseURL: baseUrl,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        // Extract WebSocket URL from HTTP URL
        const wsUrl = baseUrl.replace(/^http/, 'ws');
        // Create WebSocket client
        this.connectWebSocket(wsUrl);
    }
    /**
     * Connect to the WebSocket server
     */
    connectWebSocket(wsUrl) {
        try {
            this.wsClient = new websocket_1.w3cwebsocket(`${wsUrl}/websocket`);
            this.wsClient.onopen = () => {
                this.wsConnected = true;
                console.log('WebSocket connected');
                // Send connect message
                this.sendWsMessage({
                    type: MessageType.CONNECT
                });
                // Set up ping interval
                this.pingInterval = setInterval(() => {
                    this.sendWsMessage({
                        type: MessageType.PING
                    });
                }, 30000);
            };
            this.wsClient.onclose = () => {
                this.wsConnected = false;
                console.log('WebSocket disconnected');
                // Clear ping interval
                if (this.pingInterval) {
                    clearInterval(this.pingInterval);
                    this.pingInterval = null;
                }
                // Reconnect after delay
                setTimeout(() => {
                    this.connectWebSocket(wsUrl);
                }, 5000);
            };
            this.wsClient.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.notifyErrorListeners(error);
            };
            this.wsClient.onmessage = (message) => {
                try {
                    const data = JSON.parse(message.data);
                    this.handleWsMessage(data);
                }
                catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };
        }
        catch (error) {
            console.error('Error connecting to WebSocket:', error);
        }
    }
    /**
     * Send a WebSocket message
     */
    sendWsMessage(message) {
        if (this.wsClient && this.wsConnected) {
            this.wsClient.send(JSON.stringify(message));
        }
    }
    /**
     * Handle incoming WebSocket messages
     */
    handleWsMessage(message) {
        switch (message.type) {
            case MessageType.UPDATE:
                if (message.sessionId && message.data) {
                    this.notifySessionListeners(message.sessionId, message.data);
                }
                break;
            case MessageType.EVENT:
                if (message.sessionId && message.data) {
                    this.notifyEventListeners(message.sessionId, message.data);
                }
                break;
            case MessageType.ERROR:
                console.error('WebSocket error:', message.data);
                this.notifyErrorListeners(message.data);
                break;
            case MessageType.PONG:
                // Ping response - nothing to do
                break;
            default:
                console.log('Unhandled WebSocket message type:', message.type);
        }
    }
    /**
     * Subscribe to session updates
     */
    subscribeToSession(sessionId) {
        this.sendWsMessage({
            type: MessageType.SUBSCRIBE,
            sessionId
        });
    }
    /**
     * Unsubscribe from session updates
     */
    unsubscribeFromSession(sessionId) {
        this.sendWsMessage({
            type: MessageType.UNSUBSCRIBE,
            sessionId
        });
    }
    /**
     * Add a listener for session updates
     */
    addSessionListener(sessionId, listener) {
        let listeners = this.sessionListeners.get(sessionId);
        if (!listeners) {
            listeners = new Set();
            this.sessionListeners.set(sessionId, listeners);
        }
        listeners.add(listener);
        // Subscribe to the session if not already
        this.subscribeToSession(sessionId);
    }
    /**
     * Remove a listener for session updates
     */
    removeSessionListener(sessionId, listener) {
        const listeners = this.sessionListeners.get(sessionId);
        if (listeners) {
            listeners.delete(listener);
            if (listeners.size === 0) {
                this.sessionListeners.delete(sessionId);
                this.unsubscribeFromSession(sessionId);
            }
        }
    }
    /**
     * Add a listener for session events
     */
    addEventListener(sessionId, listener) {
        let listeners = this.eventListeners.get(sessionId);
        if (!listeners) {
            listeners = new Set();
            this.eventListeners.set(sessionId, listeners);
        }
        listeners.add(listener);
        // Subscribe to the session if not already
        this.subscribeToSession(sessionId);
    }
    /**
     * Remove a listener for session events
     */
    removeEventListener(sessionId, listener) {
        const listeners = this.eventListeners.get(sessionId);
        if (listeners) {
            listeners.delete(listener);
            if (listeners.size === 0) {
                this.eventListeners.delete(sessionId);
                // Unsubscribe if no listeners left for this session
                if (!this.sessionListeners.has(sessionId)) {
                    this.unsubscribeFromSession(sessionId);
                }
            }
        }
    }
    /**
     * Add a listener for WebSocket errors
     */
    addErrorListener(listener) {
        this.errorListeners.add(listener);
    }
    /**
     * Remove a listener for WebSocket errors
     */
    removeErrorListener(listener) {
        this.errorListeners.delete(listener);
    }
    /**
     * Notify session listeners of updates
     */
    notifySessionListeners(sessionId, data) {
        const listeners = this.sessionListeners.get(sessionId);
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener(data);
                }
                catch (error) {
                    console.error('Error in session listener:', error);
                }
            });
        }
    }
    /**
     * Notify event listeners of updates
     */
    notifyEventListeners(sessionId, data) {
        const listeners = this.eventListeners.get(sessionId);
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener(data);
                }
                catch (error) {
                    console.error('Error in event listener:', error);
                }
            });
        }
    }
    /**
     * Notify error listeners of WebSocket errors
     */
    notifyErrorListeners(error) {
        this.errorListeners.forEach(listener => {
            try {
                listener(error);
            }
            catch (e) {
                console.error('Error in error listener:', e);
            }
        });
    }
    /**
     * Make API request with error handling and retry for idempotent requests
     */
    async request(config, retryOptions) {
        const { retry: shouldRetry = false, maxRetries = 3 } = retryOptions || {};
        try {
            if (shouldRetry) {
                return await (0, ErrorHandler_1.retry)(async () => {
                    const response = await this.httpClient.request(config);
                    return response.data;
                }, { maxRetries, shouldRetry: err => axios_1.default.isAxiosError(err) && (err.status >= 500 || err.status === 429) });
            }
            else {
                const response = await this.httpClient.request(config);
                return response.data;
            }
        }
        catch (error) {
            console.error('API request failed:', error);
            const errorMessage = (0, ErrorHandler_1.formatErrorMessage)(error);
            throw new Error(errorMessage);
        }
    }
    /**
     * List all sessions
     */
    async listSessions(filters) {
        return this.request({
            method: 'GET',
            url: '/sessions',
            params: filters
        }, { retry: true });
    }
    /**
     * Get a session by ID
     */
    async getSession(id) {
        return this.request({
            method: 'GET',
            url: `/sessions/${id}`
        }, { retry: true });
    }
    /**
     * Create a new session
     */
    async createSession(data) {
        return this.request({
            method: 'POST',
            url: '/sessions',
            data
        });
    }
    /**
     * Update a session
     */
    async updateSession(id, data) {
        return this.request({
            method: 'PUT',
            url: `/sessions/${id}`,
            data
        });
    }
    /**
     * Delete a session
     */
    async deleteSession(id) {
        return this.request({
            method: 'DELETE',
            url: `/sessions/${id}`
        });
    }
    /**
     * Get session events
     */
    async getSessionEvents(id) {
        return this.request({
            method: 'GET',
            url: `/sessions/${id}/events`
        }, { retry: true });
    }
    /**
     * Add events to a session
     */
    async addSessionEvents(id, events) {
        return this.request({
            method: 'POST',
            url: `/sessions/${id}/events`,
            data: events
        });
    }
}
exports.PSPApiClient = PSPApiClient;
