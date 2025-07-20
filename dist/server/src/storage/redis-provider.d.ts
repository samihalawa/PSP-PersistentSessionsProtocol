import { StorageProvider, StoredSession, SessionFilter, SessionMetadata } from '../../../core/dist';
/**
 * Redis storage provider for PSP
 */
export declare class RedisStorageProvider implements StorageProvider {
    private client;
    private logger;
    private namespace;
    private connected;
    /**
     * Creates a new RedisStorageProvider
     */
    constructor(options?: {
        redisUrl?: string;
        redisPassword?: string;
        namespace?: string;
    });
    /**
     * Connect to Redis
     */
    private connect;
    /**
     * Save a session to Redis
     */
    save(session: StoredSession): Promise<void>;
    /**
     * Load a session from Redis
     */
    load(id: string): Promise<StoredSession>;
    /**
     * Delete a session from Redis
     */
    delete(id: string): Promise<void>;
    /**
     * List sessions from Redis
     */
    list(filter?: SessionFilter): Promise<SessionMetadata[]>;
    /**
     * Check if a session exists in Redis
     */
    exists(id: string): Promise<boolean>;
    /**
     * Ensure the Redis client is connected
     */
    private ensureConnected;
    /**
     * Serialize a session for Redis storage
     */
    private serializeForStorage;
    /**
     * Deserialize a session from Redis storage
     */
    private deserializeFromStorage;
    /**
     * Serialize state for JSON storage (convert Maps to objects)
     */
    private serializeState;
    /**
     * Deserialize state from JSON storage (convert objects to Maps)
     */
    private deserializeState;
    /**
     * Close the Redis connection
     */
    close(): Promise<void>;
}
