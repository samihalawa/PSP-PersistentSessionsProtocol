import { StorageProvider, StoredSession } from './provider';
import { SessionMetadata, SessionFilter } from '../types';

/**
 * Cloudflare Storage Provider Configuration Options
 */
export interface CloudflareStorageProviderOptions {
  /** 
   * Storage type to use
   * - 'kv': Cloudflare KV (good for smaller sessions, fast access)
   * - 'r2': Cloudflare R2 (good for large sessions, S3-compatible)
   * - 'do': Durable Objects (good for object-oriented storage with transactions)
   */
  type: 'kv' | 'r2' | 'do';

  /** API token with appropriate permissions */
  token?: string;

  /** Account ID - required for R2 and Workers KV operations */
  accountId?: string;

  /** 
   * For KV: Namespace ID
   * For R2: Bucket name
   * For DO: Class name
   */
  container: string;

  /** Cloudflare API endpoint */
  endpoint?: string;
}

/**
 * Cloudflare Storage Provider for Persistent Sessions Protocol
 * 
 * Provides storage options using Cloudflare's various storage mechanisms:
 * - KV: Key-Value storage (good for smaller sessions, fast access)
 * - R2: Object storage (good for large sessions, S3-compatible)
 * - Durable Objects: Object-oriented storage with transactions
 */
export class CloudflareStorageProvider implements StorageProvider {
  private type: 'kv' | 'r2' | 'do';
  private token?: string;
  private accountId?: string;
  private container: string;
  private endpoint: string;

  /**
   * Create a new Cloudflare storage provider
   */
  constructor(options: CloudflareStorageProviderOptions) {
    this.type = options.type;
    this.token = options.token;
    this.accountId = options.accountId;
    this.container = options.container;
    this.endpoint = options.endpoint || 'https://api.cloudflare.com/client/v4';

    // Validate options
    if ((this.type === 'kv' || this.type === 'r2') && !this.accountId) {
      throw new Error(`Account ID is required for ${this.type} storage`);
    }
  }

  /**
   * Save session data to Cloudflare storage
   */
  async save(session: StoredSession): Promise<void> {
    // Serialize state for JSON storage
    const serializedState = this.serializeState(session.state);
    const data = {
      metadata: session.metadata,
      state: serializedState
    };

    switch (this.type) {
      case 'kv':
        return this.saveToKV(session.metadata.id, data);
      case 'r2':
        return this.saveToR2(session.metadata.id, data);
      case 'do':
        return this.saveToDO(session.metadata.id, data);
      default:
        throw new Error(`Unsupported storage type: ${this.type}`);
    }
  }

  /**
   * Load session data from Cloudflare storage
   */
  async load(id: string): Promise<StoredSession> {
    let data;

    switch (this.type) {
      case 'kv':
        data = await this.loadFromKV(id);
        break;
      case 'r2':
        data = await this.loadFromR2(id);
        break;
      case 'do':
        data = await this.loadFromDO(id);
        break;
      default:
        throw new Error(`Unsupported storage type: ${this.type}`);
    }

    // Deserialize state from JSON storage
    return {
      metadata: data.metadata,
      state: this.deserializeState(data.state)
    };
  }

  /**
   * Delete session data from Cloudflare storage
   */
  async delete(id: string): Promise<void> {
    switch (this.type) {
      case 'kv':
        return this.deleteFromKV(id);
      case 'r2':
        return this.deleteFromR2(id);
      case 'do':
        return this.deleteFromDO(id);
      default:
        throw new Error(`Unsupported storage type: ${this.type}`);
    }
  }

  /**
   * List available sessions in Cloudflare storage
   */
  async list(filter?: SessionFilter): Promise<SessionMetadata[]> {
    let sessions: any[] = [];

    switch (this.type) {
      case 'kv':
        sessions = await this.listFromKV(filter);
        break;
      case 'r2':
        sessions = await this.listFromR2(filter);
        break;
      case 'do':
        sessions = await this.listFromDO(filter);
        break;
      default:
        throw new Error(`Unsupported storage type: ${this.type}`);
    }

    // Convert to proper metadata objects if needed
    let metadata = sessions.map(session => {
      if (session.metadata) {
        return session.metadata;
      } else if (session.id) {
        // Minimal metadata if only ID is available
        return {
          id: session.id,
          name: `Session ${session.id}`,
          createdAt: session.timestamp || Date.now(),
          updatedAt: session.lastModified || Date.now()
        };
      }
      return session;
    });

    // Apply filters
    if (filter) {
      // Filter by name (case-insensitive)
      if (filter.name) {
        metadata = metadata.filter(m =>
          m.name && m.name.toLowerCase().includes(filter.name.toLowerCase())
        );
      }

      // Filter by tags (all specified tags must be present)
      if (filter.tags && filter.tags.length > 0) {
        metadata = metadata.filter(m =>
          m.tags && filter.tags.every(tag => m.tags.includes(tag))
        );
      }

      // Apply date filters
      if (filter.created) {
        if (filter.created.from) {
          metadata = metadata.filter(m => m.createdAt >= filter.created.from);
        }
        if (filter.created.to) {
          metadata = metadata.filter(m => m.createdAt <= filter.created.to);
        }
      }

      if (filter.updated) {
        if (filter.updated.from) {
          metadata = metadata.filter(m => m.updatedAt >= filter.updated.from);
        }
        if (filter.updated.to) {
          metadata = metadata.filter(m => m.updatedAt <= filter.updated.to);
        }
      }

      // Sort by updated time (newest first)
      metadata.sort((a, b) => b.updatedAt - a.updatedAt);

      // Apply limit and offset
      if (filter.offset) {
        metadata = metadata.slice(filter.offset);
      }

      if (filter.limit) {
        metadata = metadata.slice(0, filter.limit);
      }
    }

    return metadata;
  }

  /**
   * Check if a session exists in Cloudflare storage
   */
  async exists(id: string): Promise<boolean> {
    try {
      await this.load(id);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * KV Implementation
   */
  
  private async saveToKV(id: string, data: any): Promise<void> {
    const url = `${this.endpoint}/accounts/${this.accountId}/storage/kv/namespaces/${this.container}/values/${id}`;
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to save to KV: ${error}`);
    }
  }

  private async loadFromKV(id: string): Promise<any> {
    const url = `${this.endpoint}/accounts/${this.accountId}/storage/kv/namespaces/${this.container}/values/${id}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Session not found: ${id}`);
      }
      throw new Error(`Failed to load from KV: ${response.statusText}`);
    }

    return response.json();
  }

  private async deleteFromKV(id: string): Promise<void> {
    const url = `${this.endpoint}/accounts/${this.accountId}/storage/kv/namespaces/${this.container}/values/${id}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete from KV: ${response.statusText}`);
    }
  }

  private async listFromKV(filter?: any): Promise<any[]> {
    const prefix = filter?.prefix || '';
    const url = `${this.endpoint}/accounts/${this.accountId}/storage/kv/namespaces/${this.container}/keys?prefix=${prefix}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to list from KV: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success || !data.result) {
      return [];
    }

    return data.result.map((key: any) => ({
      id: key.name,
      metadata: key.metadata
    }));
  }

  /**
   * R2 Implementation - using S3-compatible API
   */
  
  private async saveToR2(id: string, data: any): Promise<void> {
    // For this implementation, we use direct R2 fetch API
    // In a full implementation, you might want to use the AWS S3 client with R2 compatibility
    const url = `${this.endpoint}/accounts/${this.accountId}/r2/buckets/${this.container}/objects/${id}`;
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Failed to save to R2: ${response.statusText}`);
    }
  }

  private async loadFromR2(id: string): Promise<any> {
    const url = `${this.endpoint}/accounts/${this.accountId}/r2/buckets/${this.container}/objects/${id}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Session not found: ${id}`);
      }
      throw new Error(`Failed to load from R2: ${response.statusText}`);
    }

    return response.json();
  }

  private async deleteFromR2(id: string): Promise<void> {
    const url = `${this.endpoint}/accounts/${this.accountId}/r2/buckets/${this.container}/objects/${id}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete from R2: ${response.statusText}`);
    }
  }

  private async listFromR2(filter?: any): Promise<any[]> {
    const prefix = filter?.prefix || '';
    const url = `${this.endpoint}/accounts/${this.accountId}/r2/buckets/${this.container}/objects?prefix=${prefix}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to list from R2: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.objects) {
      return [];
    }

    return data.objects.map((obj: any) => ({
      id: obj.key,
      size: obj.size,
      lastModified: obj.uploaded
    }));
  }

  /**
   * Durable Objects Implementation
   * 
   * Note: This is a simplified implementation. In practice, Durable Objects
   * are typically used via a Worker that has bound the DO class.
   */
  
  private async saveToDO(id: string, data: any): Promise<void> {
    const url = `${this.endpoint}/accounts/${this.accountId}/workers/durable-objects/namespaces/${this.container}/objects/${id}`;
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'save', data })
    });

    if (!response.ok) {
      throw new Error(`Failed to save to Durable Object: ${response.statusText}`);
    }
  }

  private async loadFromDO(id: string): Promise<any> {
    const url = `${this.endpoint}/accounts/${this.accountId}/workers/durable-objects/namespaces/${this.container}/objects/${id}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'load' })
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Session not found: ${id}`);
      }
      throw new Error(`Failed to load from Durable Object: ${response.statusText}`);
    }

    return response.json();
  }

  private async deleteFromDO(id: string): Promise<void> {
    const url = `${this.endpoint}/accounts/${this.accountId}/workers/durable-objects/namespaces/${this.container}/objects/${id}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'delete' })
    });

    if (!response.ok) {
      throw new Error(`Failed to delete from Durable Object: ${response.statusText}`);
    }
  }

  private async listFromDO(filter?: any): Promise<any[]> {
    const url = `${this.endpoint}/accounts/${this.accountId}/workers/durable-objects/namespaces/${this.container}/objects/list`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ filter })
    });

    if (!response.ok) {
      throw new Error(`Failed to list from Durable Objects: ${response.statusText}`);
    }

    return response.json();
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