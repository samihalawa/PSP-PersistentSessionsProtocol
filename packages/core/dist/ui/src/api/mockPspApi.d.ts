import { SessionMetadata, Session } from './pspApi';
/**
 * Mock PSP API for testing
 */
export declare class MockPspApiClient {
    private sessions;
    private sessionListeners;
    private eventListeners;
    /**
     * Simulates a delay for asynchronous operations
     */
    private delay;
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
    /**
     * Add a listener for session updates
     */
    addSessionListener(sessionId: string, listener: (session: Session) => void): void;
    /**
     * Remove a listener for session updates
     */
    removeSessionListener(sessionId: string, listener: (session: Session) => void): void;
    /**
     * Add a listener for session events
     */
    addEventListener(sessionId: string, listener: (events: any) => void): void;
    /**
     * Remove a listener for session events
     */
    removeEventListener(sessionId: string, listener: (events: any) => void): void;
    /**
     * Notify session listeners of updates
     */
    private notifySessionListeners;
    /**
     * Notify event listeners of updates
     */
    private notifyEventListeners;
    /**
     * Other methods (subscribe, unsubscribe, etc.) can be empty implementations
     * since they're not needed for mock testing
     */
    subscribeToSession(): void;
    unsubscribeFromSession(): void;
    addErrorListener(): void;
    removeErrorListener(): void;
}
