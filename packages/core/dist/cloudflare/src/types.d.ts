/**
 * Type definitions specific to the Cloudflare adapter
 */
/**
 * Cloudflare KV namespace interface
 */
export interface KVNamespace {
    /**
     * Get a value from the KV store
     */
    get(key: string, options?: KVGetOptions): Promise<string | null>;
    /**
     * Get a value with type conversion
     */
    get(key: string, type: 'text'): Promise<string | null>;
    get(key: string, type: 'json'): Promise<any | null>;
    get(key: string, type: 'arrayBuffer'): Promise<ArrayBuffer | null>;
    get(key: string, type: 'stream'): Promise<ReadableStream | null>;
    /**
     * Put a value into the KV store
     */
    put(key: string, value: string | ReadableStream | ArrayBuffer | FormData, options?: KVPutOptions): Promise<void>;
    /**
     * Delete a value from the KV store
     */
    delete(key: string): Promise<void>;
    /**
     * List keys in the KV store
     */
    list(options?: KVListOptions): Promise<KVListResult>;
}
/**
 * Options for KV get operations
 */
export interface KVGetOptions {
    /**
     * Type conversion for the value
     */
    type?: 'text' | 'json' | 'arrayBuffer' | 'stream';
    /**
     * Whether to cache the response in Cloudflare's network
     */
    cacheTtl?: number;
}
/**
 * Options for KV put operations
 */
export interface KVPutOptions {
    /**
     * Expiration time in seconds
     */
    expirationTtl?: number;
    /**
     * Expiration date
     */
    expiration?: number;
    /**
     * Metadata to associate with the key
     */
    metadata?: any;
}
/**
 * Options for KV list operations
 */
export interface KVListOptions {
    /**
     * Key prefix to filter by
     */
    prefix?: string;
    /**
     * Maximum number of keys to return
     */
    limit?: number;
    /**
     * Cursor for pagination
     */
    cursor?: string;
}
/**
 * Result of a KV list operation
 */
export interface KVListResult {
    /**
     * List of keys
     */
    keys: KVListKey[];
    /**
     * Whether there are more keys to fetch
     */
    list_complete: boolean;
    /**
     * Cursor for pagination
     */
    cursor?: string;
}
/**
 * Key in a KV list result
 */
export interface KVListKey {
    /**
     * Name of the key
     */
    name: string;
    /**
     * Expiration time of the key (if set)
     */
    expiration?: number;
    /**
     * Metadata associated with the key (if any)
     */
    metadata?: any;
}
