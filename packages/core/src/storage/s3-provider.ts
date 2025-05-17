import { StorageProvider, StoredSession } from './provider';
import { SessionMetadata, SessionFilter } from '../types';

/**
 * S3 Storage Provider Configuration Options
 */
export interface S3StorageProviderOptions {
  /** Region for the S3 bucket */
  region: string;

  /** S3 bucket name */
  bucket: string;

  /** Optional prefix for all objects (like a folder) */
  prefix?: string;

  /** AWS access key ID */
  accessKeyId?: string;

  /** AWS secret access key */
  secretAccessKey?: string;

  /** Custom endpoint URL for S3-compatible services */
  endpoint?: string;

  /** Whether to use path-style S3 URLs */
  forcePathStyle?: boolean;
}

/**
 * S3 Storage Provider for Persistent Sessions Protocol
 * 
 * Stores session data in an S3 bucket or S3-compatible service
 */
export class S3StorageProvider implements StorageProvider {
  private region: string;
  private bucket: string;
  private prefix: string;
  private accessKeyId?: string;
  private secretAccessKey?: string;
  private endpoint?: string;
  private forcePathStyle: boolean;

  /**
   * Create a new S3 storage provider
   */
  constructor(options: S3StorageProviderOptions) {
    this.region = options.region;
    this.bucket = options.bucket;
    this.prefix = options.prefix || 'psp-sessions/';
    this.accessKeyId = options.accessKeyId;
    this.secretAccessKey = options.secretAccessKey;
    this.endpoint = options.endpoint;
    this.forcePathStyle = options.forcePathStyle || false;

    // Ensure prefix ends with a slash
    if (!this.prefix.endsWith('/')) {
      this.prefix += '/';
    }
  }

  /**
   * Initialize the S3 client
   */
  private async getS3Client() {
    // Use dynamic import to avoid bundling issues
    const { S3Client } = await import('@aws-sdk/client-s3');
    
    const clientOptions: any = {
      region: this.region
    };

    // Add credentials if provided
    if (this.accessKeyId && this.secretAccessKey) {
      clientOptions.credentials = {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey
      };
    }

    // Add custom endpoint and path style if needed
    if (this.endpoint) {
      clientOptions.endpoint = this.endpoint;
      if (this.forcePathStyle) {
        clientOptions.forcePathStyle = true;
      }
    }

    return new S3Client(clientOptions);
  }

  /**
   * Save session data to S3
   */
  async save(session: StoredSession): Promise<void> {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const s3 = await this.getS3Client();

    // Serialize browser state for JSON storage (convert Maps to objects)
    const serializedState = this.serializeState(session.state);

    const serializedData = JSON.stringify({
      metadata: session.metadata,
      state: serializedState
    });

    const key = `${this.prefix}${session.metadata.id}.json`;

    const params = {
      Bucket: this.bucket,
      Key: key,
      Body: serializedData,
      ContentType: 'application/json'
    };

    try {
      await s3.send(new PutObjectCommand(params));
    } catch (error) {
      console.error('Error saving session to S3:', error);
      throw new Error(`Failed to save session to S3: ${(error as Error).message}`);
    }
  }

  /**
   * Load session data from S3
   */
  async load(id: string): Promise<StoredSession> {
    const { GetObjectCommand, NoSuchKey } = await import('@aws-sdk/client-s3');
    const s3 = await this.getS3Client();

    const key = `${this.prefix}${id}.json`;

    try {
      const response = await s3.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      }));

      // Convert stream to string
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }
      const body = Buffer.concat(chunks).toString('utf-8');

      // Parse JSON
      const data = JSON.parse(body);

      // Deserialize state (convert objects back to Maps)
      return {
        metadata: data.metadata,
        state: this.deserializeState(data.state)
      };
    } catch (error) {
      if ((error as any).name === 'NoSuchKey') {
        throw new Error(`Session not found: ${id}`);
      }
      throw new Error(`Failed to load session from S3: ${(error as Error).message}`);
    }
  }

  /**
   * Delete session data from S3
   */
  async delete(id: string): Promise<void> {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const s3 = await this.getS3Client();

    const key = `${this.prefix}${id}.json`;

    try {
      await s3.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      }));
    } catch (error) {
      throw new Error(`Failed to delete session from S3: ${(error as Error).message}`);
    }
  }

  /**
   * List available sessions from S3
   */
  async list(filter?: SessionFilter): Promise<SessionMetadata[]> {
    const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    const s3 = await this.getS3Client();

    try {
      const response = await s3.send(new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: this.prefix
      }));

      const sessions: SessionMetadata[] = [];

      // If no objects found, return empty array
      if (!response.Contents) {
        return [];
      }

      // Process objects
      for (const object of response.Contents) {
        if (!object.Key) continue;

        // Only process JSON files
        if (!object.Key.endsWith('.json')) continue;

        // Extract session ID from key
        const id = object.Key.replace(this.prefix, '').replace('.json', '');

        // Always load session to get metadata for proper filtering
        try {
          const session = await this.load(id);
          sessions.push(session.metadata);
        } catch (e) {
          console.warn(`Error loading session ${id}:`, e);
        }
      }

      // Apply filters to the sessions
      let filteredSessions = sessions;

      if (filter) {
        // Filter by name (case-insensitive)
        if (filter.name) {
          filteredSessions = filteredSessions.filter(m =>
            m.name.toLowerCase().includes(filter.name!.toLowerCase())
          );
        }

        // Filter by tags (all specified tags must be present)
        if (filter.tags && filter.tags.length > 0) {
          filteredSessions = filteredSessions.filter(m =>
            m.tags && filter.tags!.every(tag => m.tags!.includes(tag))
          );
        }

        // Apply date filters
        if (filter.created) {
          if (filter.created.from) {
            filteredSessions = filteredSessions.filter(m =>
              m.createdAt >= filter.created!.from!
            );
          }
          if (filter.created.to) {
            filteredSessions = filteredSessions.filter(m =>
              m.createdAt <= filter.created!.to!
            );
          }
        }

        if (filter.updated) {
          if (filter.updated.from) {
            filteredSessions = filteredSessions.filter(m =>
              m.updatedAt >= filter.updated!.from!
            );
          }
          if (filter.updated.to) {
            filteredSessions = filteredSessions.filter(m =>
              m.updatedAt <= filter.updated!.to!
            );
          }
        }

        // Sort by updated time (newest first)
        filteredSessions.sort((a, b) => b.updatedAt - a.updatedAt);

        // Apply limit and offset
        if (filter.offset) {
          filteredSessions = filteredSessions.slice(filter.offset);
        }

        if (filter.limit) {
          filteredSessions = filteredSessions.slice(0, filter.limit);
        }
      }

      return filteredSessions;
    } catch (error) {
      throw new Error(`Failed to list sessions from S3: ${(error as Error).message}`);
    }
  }

  /**
   * Check if a session exists in S3
   */
  async exists(id: string): Promise<boolean> {
    const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
    const s3 = await this.getS3Client();

    const key = `${this.prefix}${id}.json`;

    try {
      await s3.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key
      }));
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Serialize state for JSON storage (convert Maps to objects)
   */
  private serializeState(state: any): any {
    const serialized: any = { ...state };

    // Convert localStorage Map
    if (state.storage?.localStorage instanceof Map) {
      serialized.storage = { ...serialized.storage };
      const localStorage: Record<string, Record<string, string>> = {};

      for (const [origin, storage] of state.storage.localStorage.entries()) {
        localStorage[origin] = Object.fromEntries(storage);
      }

      serialized.storage.localStorage = localStorage;
    }

    // Convert sessionStorage Map
    if (state.storage?.sessionStorage instanceof Map) {
      serialized.storage = { ...serialized.storage };
      const sessionStorage: Record<string, Record<string, string>> = {};

      for (const [origin, storage] of state.storage.sessionStorage.entries()) {
        sessionStorage[origin] = Object.fromEntries(storage);
      }

      serialized.storage.sessionStorage = sessionStorage;
    }

    // Convert cacheStorage Map if present
    if (state.storage?.cacheStorage?.caches instanceof Map) {
      serialized.storage = { ...serialized.storage };
      serialized.storage.cacheStorage = { ...serialized.storage.cacheStorage };

      const caches: Record<string, any[]> = {};
      for (const [name, entries] of state.storage.cacheStorage.caches.entries()) {
        caches[name] = [...entries];
      }

      serialized.storage.cacheStorage.caches = caches;
    }

    return serialized;
  }

  /**
   * Deserialize state from JSON storage (convert objects to Maps)
   */
  private deserializeState(state: any): any {
    const deserialized: any = { ...state };

    // Convert localStorage object to Map
    if (state.storage?.localStorage && typeof state.storage.localStorage === 'object') {
      deserialized.storage = { ...deserialized.storage };
      const localStorage = new Map<string, Map<string, string>>();

      for (const [origin, storage] of Object.entries(state.storage.localStorage)) {
        localStorage.set(origin, new Map(Object.entries(storage as Record<string, string>)));
      }

      deserialized.storage.localStorage = localStorage;
    }

    // Convert sessionStorage object to Map
    if (state.storage?.sessionStorage && typeof state.storage.sessionStorage === 'object') {
      deserialized.storage = { ...deserialized.storage };
      const sessionStorage = new Map<string, Map<string, string>>();

      for (const [origin, storage] of Object.entries(state.storage.sessionStorage)) {
        sessionStorage.set(origin, new Map(Object.entries(storage as Record<string, string>)));
      }

      deserialized.storage.sessionStorage = sessionStorage;
    }

    // Convert cacheStorage object to Map
    if (state.storage?.cacheStorage?.caches && typeof state.storage.cacheStorage.caches === 'object') {
      deserialized.storage = { ...deserialized.storage };
      deserialized.storage.cacheStorage = { ...deserialized.storage.cacheStorage };

      const caches = new Map<string, any[]>();
      for (const [name, entries] of Object.entries(state.storage.cacheStorage.caches)) {
        caches.set(name, entries as any[]);
      }

      deserialized.storage.cacheStorage.caches = caches;
    }

    return deserialized;
  }
}