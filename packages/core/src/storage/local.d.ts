import { StorageProvider, StoredSession } from './provider';
import { SessionMetadata, SessionFilter } from '../types';
/**
 * A storage provider that saves sessions to the local filesystem
 */
export declare class LocalStorageProvider implements StorageProvider {
    private baseDir;
    /**
     * Creates a new LocalStorageProvider
     * @param options.directory Directory to store sessions in (defaults to ~/.psp/sessions)
     */
    constructor(options?: {
        directory?: string;
    });
    /**
     * Save a session to storage
     */
    save(session: StoredSession): Promise<void>;
    /**
     * Load a session from storage
     */
    load(id: string): Promise<StoredSession>;
    /**
     * Delete a session from storage
     */
    delete(id: string): Promise<void>;
    /**
     * List sessions matching the filter
     */
    list(filter?: SessionFilter): Promise<SessionMetadata[]>;
    /**
     * Check if a session exists
     */
    exists(id: string): Promise<boolean>;
    /**
     * Gets the file path for a session ID
     */
    private getFilePath;
    /**
     * Get all session files
     */
    private getSessionFiles;
    /**
     * Serialize state for JSON storage (convert Maps to objects)
     */
    private serializeState;
    /**
     * Deserialize state from JSON storage (convert objects to Maps)
     */
    private deserializeState;
}
