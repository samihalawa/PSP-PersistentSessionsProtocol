import {
  StorageProvider,
  StoredSession,
  SessionFilter,
  SessionMetadata,
} from '../../../core/dist';
import { createClient, RedisClientType } from 'redis';
import { createLogger } from '../utils/logger';

/**
 * Redis storage provider for PSP
 */
export class RedisStorageProvider implements StorageProvider {
  private client: RedisClientType;
  private logger = createLogger('redis-provider');
  private namespace: string;
  private connected = false;

  /**
   * Creates a new RedisStorageProvider
   */
  constructor(options?: {
    redisUrl?: string;
    redisPassword?: string;
    namespace?: string;
  }) {
    this.namespace = options?.namespace || 'psp:sessions';

    // Create Redis client
    this.client = createClient({
      url: options?.redisUrl,
      password: options?.redisPassword,
    });

    // Set up event handlers
    this.client.on('error', (err) => {
      this.logger.error('Redis error:', err);
    });

    this.client.on('connect', () => {
      this.logger.info('Connected to Redis');
      this.connected = true;
    });

    this.client.on('end', () => {
      this.logger.info('Disconnected from Redis');
      this.connected = false;
    });

    // Connect to Redis
    this.connect();
  }

  /**
   * Connect to Redis
   */
  private async connect(): Promise<void> {
    if (!this.connected) {
      try {
        await this.client.connect();
      } catch (error) {
        this.logger.error('Failed to connect to Redis:', error);
        throw error;
      }
    }
  }

  /**
   * Save a session to Redis
   */
  async save(session: StoredSession): Promise<void> {
    await this.ensureConnected();

    try {
      const id = session.metadata.id;
      const key = `${this.namespace}:${id}`;

      // Serialize the session for Redis storage
      const serializedSession = this.serializeForStorage(session);

      // Store the full session
      await this.client.set(key, serializedSession);

      // Store metadata in a hash for efficient filtering
      await this.client.hSet(
        `${this.namespace}:metadata`,
        id,
        JSON.stringify(session.metadata)
      );

      // Add to index by name (for name-based searching)
      await this.client.zAdd(`${this.namespace}:index:name`, {
        score: session.metadata.updatedAt,
        value: `${session.metadata.name}:${id}`,
      });

      // Add to tags sets (for tag-based filtering)
      if (session.metadata.tags && session.metadata.tags.length > 0) {
        for (const tag of session.metadata.tags) {
          await this.client.sAdd(`${this.namespace}:tags:${tag}`, id);
        }
      }

      this.logger.debug(`Saved session ${id} to Redis`);
    } catch (error) {
      this.logger.error('Error saving session to Redis:', error);
      throw error;
    }
  }

  /**
   * Load a session from Redis
   */
  async load(id: string): Promise<StoredSession> {
    await this.ensureConnected();

    try {
      const key = `${this.namespace}:${id}`;

      // Get the session from Redis
      const serializedSession = await this.client.get(key);

      if (!serializedSession) {
        throw new Error(`Session with ID ${id} not found`);
      }

      // Deserialize the session
      return this.deserializeFromStorage(serializedSession);
    } catch (error) {
      this.logger.error(`Error loading session ${id} from Redis:`, error);
      throw error;
    }
  }

  /**
   * Delete a session from Redis
   */
  async delete(id: string): Promise<void> {
    await this.ensureConnected();

    try {
      const key = `${this.namespace}:${id}`;

      // Get metadata for cleaning up indexes
      const metadataStr = await this.client.hGet(
        `${this.namespace}:metadata`,
        id
      );

      if (metadataStr) {
        const metadata = JSON.parse(metadataStr) as SessionMetadata;

        // Clean up name index
        await this.client.zRem(
          `${this.namespace}:index:name`,
          `${metadata.name}:${id}`
        );

        // Clean up tag indexes
        if (metadata.tags) {
          for (const tag of metadata.tags) {
            await this.client.sRem(`${this.namespace}:tags:${tag}`, id);
          }
        }

        // Remove from metadata hash
        await this.client.hDel(`${this.namespace}:metadata`, id);
      }

      // Delete the session
      await this.client.del(key);

      this.logger.debug(`Deleted session ${id} from Redis`);
    } catch (error) {
      this.logger.error(`Error deleting session ${id} from Redis:`, error);
      throw error;
    }
  }

  /**
   * List sessions from Redis
   */
  async list(filter?: SessionFilter): Promise<SessionMetadata[]> {
    await this.ensureConnected();

    try {
      let sessionIds: string[] = [];

      // Filter by tags if specified
      if (filter?.tags && filter.tags.length > 0) {
        // Get intersection of tag sets
        const tagKeys = filter.tags.map(
          (tag) => `${this.namespace}:tags:${tag}`
        );
        sessionIds = await this.client.sInter(tagKeys);
      } else {
        // Get all session IDs from metadata hash
        sessionIds = await this.client.hKeys(`${this.namespace}:metadata`);
      }

      // Get metadata for each session
      const metadataPromises = sessionIds.map((id) =>
        this.client.hGet(`${this.namespace}:metadata`, id)
      );

      const metadataResults = await Promise.all(metadataPromises);
      let metadata = metadataResults
        .filter(Boolean)
        .map((json) => JSON.parse(json!) as SessionMetadata);

      // Filter by name if specified
      if (filter?.name) {
        metadata = metadata.filter((m) =>
          m.name.toLowerCase().includes(filter.name!.toLowerCase())
        );
      }

      // Sort by updated time (newest first)
      metadata.sort((a, b) => b.updatedAt - a.updatedAt);

      // Apply offset and limit if specified
      if (filter?.offset !== undefined || filter?.limit !== undefined) {
        const offset = filter?.offset || 0;
        const limit = filter?.limit;

        metadata = metadata.slice(offset, limit ? offset + limit : undefined);
      }

      return metadata;
    } catch (error) {
      this.logger.error('Error listing sessions from Redis:', error);
      throw error;
    }
  }

  /**
   * Check if a session exists in Redis
   */
  async exists(id: string): Promise<boolean> {
    await this.ensureConnected();

    try {
      const key = `${this.namespace}:${id}`;
      return (await this.client.exists(key)) === 1;
    } catch (error) {
      this.logger.error(
        `Error checking if session ${id} exists in Redis:`,
        error
      );
      throw error;
    }
  }

  /**
   * Ensure the Redis client is connected
   */
  private async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }
  }

  /**
   * Serialize a session for Redis storage
   */
  private serializeForStorage(session: StoredSession): string {
    const { metadata, state } = session;

    // Convert Maps in the state to objects
    const serializedState = this.serializeState(state);

    // Create the serialized session
    const serializedSession = {
      metadata,
      state: serializedState,
    };

    return JSON.stringify(serializedSession);
  }

  /**
   * Deserialize a session from Redis storage
   */
  private deserializeFromStorage(serializedSession: string): StoredSession {
    const parsed = JSON.parse(serializedSession);

    // Convert objects back to Maps in the state
    const deserializedState = this.deserializeState(parsed.state);

    return {
      metadata: parsed.metadata,
      state: deserializedState,
    };
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

    // Convert other Maps in the state (recursively if needed)
    return serialized;
  }

  /**
   * Deserialize state from JSON storage (convert objects to Maps)
   */
  private deserializeState(state: any): any {
    const deserialized: any = { ...state };

    // Convert localStorage object to Map
    if (
      state.storage?.localStorage &&
      typeof state.storage.localStorage === 'object'
    ) {
      deserialized.storage = { ...deserialized.storage };
      const localStorage = new Map<string, Map<string, string>>();

      for (const [origin, storage] of Object.entries(
        state.storage.localStorage
      )) {
        localStorage.set(
          origin,
          new Map(Object.entries(storage as Record<string, string>))
        );
      }

      deserialized.storage.localStorage = localStorage;
    }

    // Convert sessionStorage object to Map
    if (
      state.storage?.sessionStorage &&
      typeof state.storage.sessionStorage === 'object'
    ) {
      deserialized.storage = { ...deserialized.storage };
      const sessionStorage = new Map<string, Map<string, string>>();

      for (const [origin, storage] of Object.entries(
        state.storage.sessionStorage
      )) {
        sessionStorage.set(
          origin,
          new Map(Object.entries(storage as Record<string, string>))
        );
      }

      deserialized.storage.sessionStorage = sessionStorage;
    }

    // Convert other objects to Maps (recursively if needed)
    return deserialized;
  }

  /**
   * Close the Redis connection
   */
  async close(): Promise<void> {
    if (this.connected) {
      await this.client.quit();
      this.connected = false;
    }
  }
}
