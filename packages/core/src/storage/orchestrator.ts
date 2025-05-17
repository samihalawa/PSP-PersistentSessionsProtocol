import { StorageProvider, StoredSession } from './provider';
import { SessionMetadata, SessionFilter } from '../types';

/**
 * Options for the StorageOrchestrator
 */
export interface StorageOrchestratorOptions {
  /**
   * Primary storage provider
   */
  primary: StorageProvider;
  
  /**
   * Secondary storage providers for replication or fallback
   */
  secondary?: StorageProvider[];
  
  /**
   * Whether to use read-through caching
   * Default: true
   */
  useCache?: boolean;
  
  /**
   * Cache TTL in seconds (time-to-live)
   * Default: 300 (5 minutes)
   */
  cacheTtl?: number;
  
  /**
   * Cache capacity (number of items)
   * Default: 100
   */
  cacheCapacity?: number;
  
  /**
   * Whether to replicate operations to all providers
   * Default: true
   */
  replicate?: boolean;
  
  /**
   * Whether to fail if secondary storage operations fail
   * Default: false (primary is considered the source of truth)
   */
  strictConsistency?: boolean;
}

/**
 * Storage orchestrator that manages multiple storage providers 
 * with caching, replication, and fallback support
 */
export class StorageOrchestrator implements StorageProvider {
  private primary: StorageProvider;
  private secondary: StorageProvider[] = [];
  private useCache: boolean;
  private cacheTtl: number;
  private cacheCapacity: number;
  private replicate: boolean;
  private strictConsistency: boolean;
  
  // Simple in-memory cache
  private cache: Map<string, { data: StoredSession, timestamp: number }> = new Map();
  
  /**
   * Creates a new StorageOrchestrator
   */
  constructor(options: StorageOrchestratorOptions) {
    this.primary = options.primary;
    this.secondary = options.secondary || [];
    this.useCache = options.useCache !== false;
    this.cacheTtl = options.cacheTtl || 300; // 5 minutes default
    this.cacheCapacity = options.cacheCapacity || 100;
    this.replicate = options.replicate !== false;
    this.strictConsistency = options.strictConsistency || false;
  }
  
  /**
   * Save a session to storage
   */
  async save(session: StoredSession): Promise<void> {
    // Always save to primary first
    await this.primary.save(session);
    
    // Update cache if enabled
    if (this.useCache) {
      this.updateCache(session.metadata.id, session);
    }
    
    // Replicate to secondary providers if enabled
    if (this.replicate && this.secondary.length > 0) {
      const promises = this.secondary.map(async (provider) => {
        try {
          await provider.save(session);
        } catch (error) {
          if (this.strictConsistency) {
            throw error;
          } else {
            console.warn(`Failed to replicate session to secondary storage: ${(error as Error).message}`);
          }
        }
      });
      
      if (this.strictConsistency) {
        // Wait for all replications to complete
        await Promise.all(promises);
      } else {
        // Fire and forget
        Promise.all(promises).catch((error) => {
          console.error('Replication error:', error);
        });
      }
    }
  }
  
  /**
   * Load a session from storage
   */
  async load(id: string): Promise<StoredSession> {
    // Check cache first if enabled
    if (this.useCache) {
      const cached = this.getFromCache(id);
      if (cached) {
        return cached;
      }
    }
    
    try {
      // Try loading from primary
      const session = await this.primary.load(id);
      
      // Update cache
      if (this.useCache) {
        this.updateCache(id, session);
      }
      
      return session;
    } catch (primaryError) {
      // If primary fails, try secondaries in order
      for (const provider of this.secondary) {
        try {
          const session = await provider.load(id);
          
          // Update cache
          if (this.useCache) {
            this.updateCache(id, session);
          }
          
          // Found in a secondary, replicate back to primary and other secondaries
          this.replicateSession(session, [this.primary, ...this.secondary.filter(p => p !== provider)]);
          
          return session;
        } catch (error) {
          // Continue to next provider
        }
      }
      
      // If we get here, all providers failed
      throw primaryError;
    }
  }
  
  /**
   * Delete a session from storage
   */
  async delete(id: string): Promise<void> {
    // Remove from cache first
    if (this.useCache) {
      this.cache.delete(id);
    }
    
    // Delete from primary
    await this.primary.delete(id);
    
    // Delete from secondaries if replication is enabled
    if (this.replicate && this.secondary.length > 0) {
      const promises = this.secondary.map(async (provider) => {
        try {
          await provider.delete(id);
        } catch (error) {
          if (this.strictConsistency) {
            throw error;
          } else {
            console.warn(`Failed to delete session from secondary storage: ${(error as Error).message}`);
          }
        }
      });
      
      if (this.strictConsistency) {
        // Wait for all deletions to complete
        await Promise.all(promises);
      } else {
        // Fire and forget
        Promise.all(promises).catch((error) => {
          console.error('Deletion error:', error);
        });
      }
    }
  }
  
  /**
   * List sessions from storage
   */
  async list(filter?: SessionFilter): Promise<SessionMetadata[]> {
    try {
      // Try primary first
      return await this.primary.list(filter);
    } catch (primaryError) {
      // If primary fails, try secondaries in order
      for (const provider of this.secondary) {
        try {
          return await provider.list(filter);
        } catch (error) {
          // Continue to next provider
        }
      }
      
      // If we get here, all providers failed
      throw primaryError;
    }
  }
  
  /**
   * Check if a session exists
   */
  async exists(id: string): Promise<boolean> {
    // Check cache first if enabled
    if (this.useCache && this.cache.has(id)) {
      return true;
    }
    
    try {
      // Try primary first
      return await this.primary.exists(id);
    } catch (primaryError) {
      // If primary fails, try secondaries in order
      for (const provider of this.secondary) {
        try {
          const exists = await provider.exists(id);
          if (exists) return true;
        } catch (error) {
          // Continue to next provider
        }
      }
      
      // If we get here, all providers failed or session doesn't exist
      return false;
    }
  }
  
  /**
   * Replicates a session to the specified providers
   */
  private replicateSession(session: StoredSession, providers: StorageProvider[]): void {
    if (!this.replicate) return;
    
    for (const provider of providers) {
      provider.save(session).catch((error) => {
        console.warn(`Failed to replicate session: ${(error as Error).message}`);
      });
    }
  }
  
  /**
   * Gets a session from the cache
   */
  private getFromCache(id: string): StoredSession | null {
    if (!this.useCache) return null;
    
    const cached = this.cache.get(id);
    if (!cached) return null;
    
    const now = Date.now();
    const { data, timestamp } = cached;
    
    // Check if cache entry is still valid
    if (now - timestamp > this.cacheTtl * 1000) {
      this.cache.delete(id);
      return null;
    }
    
    return data;
  }
  
  /**
   * Updates the cache with a session
   */
  private updateCache(id: string, session: StoredSession): void {
    if (!this.useCache) return;
    
    // Enforce cache capacity
    if (this.cache.size >= this.cacheCapacity) {
      // Remove oldest item (LRU implementation)
      const oldest = [...this.cache.entries()]
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      
      if (oldest) {
        this.cache.delete(oldest[0]);
      }
    }
    
    // Add to cache
    this.cache.set(id, {
      data: session,
      timestamp: Date.now()
    });
  }
  
  /**
   * Clears the cache
   */
  public clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Clears expired items from the cache
   */
  public clearExpiredCache(): void {
    if (!this.useCache) return;
    
    const now = Date.now();
    const expired = [...this.cache.entries()]
      .filter(([_, { timestamp }]) => now - timestamp > this.cacheTtl * 1000)
      .map(([id]) => id);
    
    for (const id of expired) {
      this.cache.delete(id);
    }
  }
  
  /**
   * Synchronizes data across all providers
   */
  public async syncAll(): Promise<void> {
    if (!this.replicate || this.secondary.length === 0) return;
    
    // Get all sessions from primary
    const sessions = await this.primary.list();
    
    // For each session, ensure it exists in all secondaries
    for (const metadata of sessions) {
      try {
        const session = await this.primary.load(metadata.id);
        for (const provider of this.secondary) {
          try {
            if (await provider.exists(metadata.id)) {
              // Session exists, but might be different
              const secondarySession = await provider.load(metadata.id);
              
              // Compare lastUpdated to decide which version to keep
              if (secondarySession.metadata.updatedAt > session.metadata.updatedAt) {
                // Secondary is newer, update primary
                await this.primary.save(secondarySession);
                
                // Update cache if enabled
                if (this.useCache) {
                  this.updateCache(metadata.id, secondarySession);
                }
              } else {
                // Primary is newer, update secondary
                await provider.save(session);
              }
            } else {
              // Session doesn't exist in secondary, create it
              await provider.save(session);
            }
          } catch (error) {
            console.warn(`Failed to sync session ${metadata.id} with secondary provider: ${(error as Error).message}`);
          }
        }
      } catch (error) {
        console.warn(`Failed to load session ${metadata.id} from primary: ${(error as Error).message}`);
      }
    }
    
    // Now check for sessions in secondaries that don't exist in primary
    const primaryIds = new Set(sessions.map(s => s.id));
    
    for (const provider of this.secondary) {
      try {
        const secondarySessions = await provider.list();
        
        for (const metadata of secondarySessions) {
          if (!primaryIds.has(metadata.id)) {
            try {
              const session = await provider.load(metadata.id);
              await this.primary.save(session);
              
              // Update cache if enabled
              if (this.useCache) {
                this.updateCache(metadata.id, session);
              }
              
              // Add to primary IDs to avoid duplicates
              primaryIds.add(metadata.id);
            } catch (error) {
              console.warn(`Failed to sync session ${metadata.id} from secondary to primary: ${(error as Error).message}`);
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to list sessions from secondary provider: ${(error as Error).message}`);
      }
    }
  }
  
  /**
   * Gets statistics about the orchestrator
   */
  public getStats(): Record<string, any> {
    return {
      cache: {
        enabled: this.useCache,
        size: this.cache.size,
        capacity: this.cacheCapacity,
        ttl: this.cacheTtl
      },
      replication: {
        enabled: this.replicate,
        providers: this.secondary.length + 1,
        strictConsistency: this.strictConsistency
      }
    };
  }
}