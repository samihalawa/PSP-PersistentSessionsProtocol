import { StorageProvider } from '@psp/core';
import { SessionMetadata, BrowserSessionState, SessionFilter } from '@psp/core';
/**
 * Cloud storage provider implementation (placeholder)
 * TODO: Implement with actual cloud storage service (AWS S3, Google Cloud Storage, etc.)
 */
export declare class CloudStorageProvider implements StorageProvider {
    private bucketName;
    private region;
    private credentials;
    constructor(options: {
        bucketName: string;
        region?: string;
        credentials?: any;
    });
    /**
     * Saves a session to cloud storage
     */
    save(session: {
        metadata: SessionMetadata;
        state: BrowserSessionState;
    }): Promise<void>;
    /**
     * Loads a session from cloud storage
     */
    load(id: string): Promise<{
        metadata: SessionMetadata;
        state: BrowserSessionState;
    }>;
    /**
     * Deletes a session from cloud storage
     */
    delete(id: string): Promise<void>;
    /**
     * Lists sessions from cloud storage
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
