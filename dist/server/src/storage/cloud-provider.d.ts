import { StorageProvider } from '../../core/src/types';
import { SessionMetadata, BrowserSessionState, SessionFilter } from '../../core/src/types';
/**
 * Cloud storage provider implementation (Future Feature)
 *
 * This is a placeholder implementation for future cloud storage integration.
 * Currently supports logging operations for development/debugging purposes.
 *
 * Planned integrations:
 * - AWS S3 with encryption and lifecycle policies
 * - Google Cloud Storage with regional replication
 * - Azure Blob Storage with access tiers
 * - Cloudflare R2 with zero egress costs
 * - Multi-cloud failover and data replication
 *
 * For production use, consider using LocalStorageProvider with encryption.
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
