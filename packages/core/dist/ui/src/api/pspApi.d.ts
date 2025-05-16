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
type SessionUpdateListener = (session: Session) => void;
type SessionEventListener = (event: any) => void;
type WebSocketErrorListener = (error: any) => void;
/**
 * PSP API Client
 */
export declare class PSPApiClient {
    private httpClient;
    private wsClient;
    private wsConnected;
    private sessionListeners;
    private eventListeners;
    private errorListeners;
    private pingInterval;
    /**
     * Create a new PSP API client
     */
    constructor(baseUrl?: string);
    /**
     * Connect to the WebSocket server
     */
    private connectWebSocket;
    /**
     * Send a WebSocket message
     */
    private sendWsMessage;
    /**
     * Handle incoming WebSocket messages
     */
    private handleWsMessage;
    /**
     * Subscribe to session updates
     */
    subscribeToSession(sessionId: string): void;
    /**
     * Unsubscribe from session updates
     */
    unsubscribeFromSession(sessionId: string): void;
    /**
     * Add a listener for session updates
     */
    addSessionListener(sessionId: string, listener: SessionUpdateListener): void;
    /**
     * Remove a listener for session updates
     */
    removeSessionListener(sessionId: string, listener: SessionUpdateListener): void;
    /**
     * Add a listener for session events
     */
    addEventListener(sessionId: string, listener: SessionEventListener): void;
    /**
     * Remove a listener for session events
     */
    removeEventListener(sessionId: string, listener: SessionEventListener): void;
    /**
     * Add a listener for WebSocket errors
     */
    addErrorListener(listener: WebSocketErrorListener): void;
    /**
     * Remove a listener for WebSocket errors
     */
    removeErrorListener(listener: WebSocketErrorListener): void;
    /**
     * Notify session listeners of updates
     */
    private notifySessionListeners;
    /**
     * Notify event listeners of updates
     */
    private notifyEventListeners;
    /**
     * Notify error listeners of WebSocket errors
     */
    private notifyErrorListeners;
    /**
     * Make API request with error handling and retry for idempotent requests
     */
    private request;
    /**
     * List all sessions
     */
    listSessions(filters?: {
        name?: string;
        tags?: string[];
        limit?: number;
        offset?: number;
    }): Promise<SessionMetadata[]>;
    /**
     * Get a session by ID
     */
    getSession(id: string): Promise<Session>;
    /**
     * Create a new session
     */
    createSession(data: {
        name: string;
        description?: string;
        tags?: string[];
    }): Promise<SessionMetadata>;
    /**
     * Update a session
     */
    updateSession(id: string, data: Partial<Session>): Promise<Session>;
    /**
     * Delete a session
     */
    deleteSession(id: string): Promise<void>;
    /**
     * Get session events
     */
    getSessionEvents(id: string): Promise<any[]>;
    /**
     * Add events to a session
     */
    addSessionEvents(id: string, events: any[]): Promise<void>;
}
export {};
