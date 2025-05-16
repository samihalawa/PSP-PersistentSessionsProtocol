import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { w3cwebsocket as WebSocket } from 'websocket';
import { formatErrorMessage, retry } from '../utils/ErrorHandler';

// Types
export interface SessionMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  createdWith?: string;
  expireAt?: number;
}

export interface StorageState {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number | null;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "Strict" | "Lax" | "None";
  }>;
  localStorage: Record<string, Record<string, string>>;
  sessionStorage: Record<string, Record<string, string>>;
}

export interface BrowserSessionState {
  version: string;
  timestamp: number;
  origin: string;
  storage: StorageState;
  dom?: any;
  history?: any;
  network?: any;
  recording?: any;
  extensions?: Record<string, unknown>;
}

export interface Session {
  metadata: SessionMetadata;
  state: BrowserSessionState;
}

// WebSocket message types
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

interface WebSocketMessage {
  type: MessageType;
  sessionId?: string;
  data?: any;
  token?: string;
}

// Callback types
type SessionUpdateListener = (session: Session) => void;
type SessionEventListener = (event: any) => void;
type WebSocketErrorListener = (error: any) => void;

/**
 * PSP API Client
 */
export class PSPApiClient {
  private httpClient: AxiosInstance;
  private wsClient: WebSocket | null = null;
  private wsConnected: boolean = false;
  private sessionListeners: Map<string, Set<SessionUpdateListener>> = new Map();
  private eventListeners: Map<string, Set<SessionEventListener>> = new Map();
  private errorListeners: Set<WebSocketErrorListener> = new Set();
  private pingInterval: NodeJS.Timeout | null = null;

  /**
   * Create a new PSP API client
   */
  constructor(baseUrl: string = 'http://localhost:3000') {
    // Create HTTP client
    this.httpClient = axios.create({
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
  private connectWebSocket(wsUrl: string): void {
    try {
      this.wsClient = new WebSocket(`${wsUrl}/websocket`);
      
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
          const data = JSON.parse(message.data as string) as WebSocketMessage;
          this.handleWsMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  }

  /**
   * Send a WebSocket message
   */
  private sendWsMessage(message: WebSocketMessage): void {
    if (this.wsClient && this.wsConnected) {
      this.wsClient.send(JSON.stringify(message));
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleWsMessage(message: WebSocketMessage): void {
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
  public subscribeToSession(sessionId: string): void {
    this.sendWsMessage({
      type: MessageType.SUBSCRIBE,
      sessionId
    });
  }

  /**
   * Unsubscribe from session updates
   */
  public unsubscribeFromSession(sessionId: string): void {
    this.sendWsMessage({
      type: MessageType.UNSUBSCRIBE,
      sessionId
    });
  }

  /**
   * Add a listener for session updates
   */
  public addSessionListener(sessionId: string, listener: SessionUpdateListener): void {
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
  public removeSessionListener(sessionId: string, listener: SessionUpdateListener): void {
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
  public addEventListener(sessionId: string, listener: SessionEventListener): void {
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
  public removeEventListener(sessionId: string, listener: SessionEventListener): void {
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
  public addErrorListener(listener: WebSocketErrorListener): void {
    this.errorListeners.add(listener);
  }

  /**
   * Remove a listener for WebSocket errors
   */
  public removeErrorListener(listener: WebSocketErrorListener): void {
    this.errorListeners.delete(listener);
  }

  /**
   * Notify session listeners of updates
   */
  private notifySessionListeners(sessionId: string, data: any): void {
    const listeners = this.sessionListeners.get(sessionId);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('Error in session listener:', error);
        }
      });
    }
  }

  /**
   * Notify event listeners of updates
   */
  private notifyEventListeners(sessionId: string, data: any): void {
    const listeners = this.eventListeners.get(sessionId);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  /**
   * Notify error listeners of WebSocket errors
   */
  private notifyErrorListeners(error: any): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (e) {
        console.error('Error in error listener:', e);
      }
    });
  }

  /**
   * Make API request with error handling and retry for idempotent requests
   */
  private async request<T>(
    config: AxiosRequestConfig,
    retryOptions?: {
      retry?: boolean,
      maxRetries?: number
    }
  ): Promise<T> {
    const { retry: shouldRetry = false, maxRetries = 3 } = retryOptions || {};

    try {
      if (shouldRetry) {
        return await retry(
          async () => {
            const response = await this.httpClient.request(config);
            return response.data;
          },
          { maxRetries, shouldRetry: err => axios.isAxiosError(err) && (err.status >= 500 || err.status === 429) }
        );
      } else {
        const response = await this.httpClient.request(config);
        return response.data;
      }
    } catch (error) {
      console.error('API request failed:', error);
      const errorMessage = formatErrorMessage(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * List all sessions
   */
  public async listSessions(filters?: {
    name?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
  }): Promise<SessionMetadata[]> {
    return this.request<SessionMetadata[]>({
      method: 'GET',
      url: '/sessions',
      params: filters
    }, { retry: true });
  }

  /**
   * Get a session by ID
   */
  public async getSession(id: string): Promise<Session> {
    return this.request<Session>({
      method: 'GET',
      url: `/sessions/${id}`
    }, { retry: true });
  }

  /**
   * Create a new session
   */
  public async createSession(data: {
    name: string;
    description?: string;
    tags?: string[];
  }): Promise<SessionMetadata> {
    return this.request<SessionMetadata>({
      method: 'POST',
      url: '/sessions',
      data
    });
  }

  /**
   * Update a session
   */
  public async updateSession(id: string, data: Partial<Session>): Promise<Session> {
    return this.request<Session>({
      method: 'PUT',
      url: `/sessions/${id}`,
      data
    });
  }

  /**
   * Delete a session
   */
  public async deleteSession(id: string): Promise<void> {
    return this.request<void>({
      method: 'DELETE',
      url: `/sessions/${id}`
    });
  }

  /**
   * Get session events
   */
  public async getSessionEvents(id: string): Promise<any[]> {
    return this.request<any[]>({
      method: 'GET',
      url: `/sessions/${id}/events`
    }, { retry: true });
  }

  /**
   * Add events to a session
   */
  public async addSessionEvents(id: string, events: any[]): Promise<void> {
    return this.request<void>({
      method: 'POST',
      url: `/sessions/${id}/events`,
      data: events
    });
  }
}