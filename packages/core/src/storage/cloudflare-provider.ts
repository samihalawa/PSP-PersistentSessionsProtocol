import { StorageProvider } from './provider';

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
  async save(id: string, data: any): Promise<void> {
    switch (this.type) {
      case 'kv':
        return this.saveToKV(id, data);
      case 'r2':
        return this.saveToR2(id, data);
      case 'do':
        return this.saveToDO(id, data);
      default:
        throw new Error(`Unsupported storage type: ${this.type}`);
    }
  }

  /**
   * Load session data from Cloudflare storage
   */
  async load(id: string): Promise<any> {
    switch (this.type) {
      case 'kv':
        return this.loadFromKV(id);
      case 'r2':
        return this.loadFromR2(id);
      case 'do':
        return this.loadFromDO(id);
      default:
        throw new Error(`Unsupported storage type: ${this.type}`);
    }
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
  async list(filter?: any): Promise<any[]> {
    switch (this.type) {
      case 'kv':
        return this.listFromKV(filter);
      case 'r2':
        return this.listFromR2(filter);
      case 'do':
        return this.listFromDO(filter);
      default:
        throw new Error(`Unsupported storage type: ${this.type}`);
    }
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
}