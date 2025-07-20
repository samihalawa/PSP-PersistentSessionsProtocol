import { StorageProvider } from '@psp/core';
import { SessionMetadata, BrowserSessionState, SessionFilter } from '@psp/core';
/**
 * Database storage provider implementation (placeholder)
 * TODO: Implement with actual database connection
 */
export declare class DatabaseStorageProvider implements StorageProvider {
    private connectionString;
    constructor(connectionString?: string);
    /**
     * Saves a session to the database
     */
    save(session: {
        metadata: SessionMetadata;
        state: BrowserSessionState;
    }): Promise<void>;
    /**
     * Loads a session from the database
     */
    load(id: string): Promise<{
        metadata: SessionMetadata;
        state: BrowserSessionState;
    }>;
    /**
     * Deletes a session from the database
     */
    delete(id: string): Promise<void>;
    /**
     * Lists sessions from the database
     */
    list(filter?: SessionFilter): Promise<SessionMetadata[]>;
    /**
     * Check if a session exists
     */
    exists(id: string): Promise<boolean>;
    /**
     * Clear all sessions (for testing)
     */
    clear(): Promise<void>;
}
