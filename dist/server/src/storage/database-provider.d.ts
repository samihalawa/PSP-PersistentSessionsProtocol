import { StorageProvider } from '../../core/src/types';
import { SessionMetadata, BrowserSessionState, SessionFilter } from '../../core/src/types';
/**
 * Database storage provider implementation (Future Feature)
 *
 * This is a placeholder implementation for future database integration.
 * Currently supports logging operations for development/debugging purposes.
 *
 * Planned features:
 * - SQLite support for local development
 * - PostgreSQL/MySQL support for production deployments
 * - Connection pooling and transaction management
 * - Migration system for schema updates
 *
 * For production use, consider using LocalStorageProvider or CloudStorageProvider.
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
