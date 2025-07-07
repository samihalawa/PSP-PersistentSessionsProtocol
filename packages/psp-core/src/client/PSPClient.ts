/**
 * PSP Client - Main interface for PSP operations
 * 
 * Provides a high-level API for session capture, restoration, and synchronization
 * across different storage backends and browser adapters.
 */

import { PSPConfig } from '../config/PSPConfig';
import { PSPSession } from '../session/PSPSession';
import { StorageBackend, BrowserAdapter, PSPClientOptions, CaptureOptions, LaunchOptions, SyncResult } from '../types';
import { LocalStorageBackend } from '../storage/LocalStorageBackend';
import { S3StorageBackend } from '../storage/S3StorageBackend';
import { CloudflareR2Backend } from '../storage/CloudflareR2Backend';
import { ChromeAdapter } from '../adapters/ChromeAdapter';
import { PlaywrightAdapter } from '../adapters/PlaywrightAdapter';

export class PSPClient {
  private config: ReturnType<typeof PSPConfig.getConfig>;
  private storageBackend: StorageBackend;
  private browserAdapter: BrowserAdapter;

  constructor(options: PSPClientOptions = {}) {
    // Load configuration
    if (options.config) {
      PSPConfig.updateConfig(options.config);
    }
    
    this.config = PSPConfig.getConfig();
    
    // Validate configuration
    const validation = PSPConfig.validateConfig();
    if (!validation.valid) {
      throw new Error(`PSP Configuration invalid: ${validation.errors.join(', ')}`);
    }

    // Initialize storage backend
    this.storageBackend = this.createStorageBackend();
    
    // Initialize browser adapter (default to Chrome)
    this.browserAdapter = new ChromeAdapter(this.config);
  }

  /**
   * Capture a new browser session
   */
  async captureSession(options: CaptureOptions): Promise<PSPSession> {
    console.log(`🚀 Capturing session: ${options.sessionName}`);
    
    const session = await this.browserAdapter.captureSession(options);
    
    // Apply compression if enabled
    if (this.config.compression.enabled) {
      console.log('🗜️  Compressing session...');
      await session.compress();
    }
    
    // Apply encryption if enabled
    if (this.config.encryption.enabled) {
      console.log('🔐 Encrypting session...');
      await session.encrypt(this.config.encryption.key);
    }
    
    // Auto-sync if enabled
    if (this.config.sync.autoSync) {
      console.log('☁️  Uploading session...');
      await session.upload();
    }
    
    console.log(`✅ Session captured: ${session.metadata.id}`);
    return session;
  }

  /**
   * Load an existing session
   */
  async loadSession(sessionId: string): Promise<PSPSession> {
    console.log(`📥 Loading session: ${sessionId}`);
    
    // Try to load from local storage first
    let session: PSPSession;
    
    try {
      session = await PSPSession.load(sessionId, this.config);
    } catch (error) {
      // If not found locally, try to download from remote storage
      if (this.config.storage.backend !== 'local') {
        console.log('📡 Session not found locally, downloading from remote...');
        const { data, metadata } = await this.storageBackend.download(sessionId);
        session = await PSPSession.fromBuffer(data, metadata, this.config);
      } else {
        throw error;
      }
    }
    
    // Decrypt if needed
    if (session.isEncrypted) {
      console.log('🔓 Decrypting session...');
      await session.decrypt(this.config.encryption.key);
    }
    
    // Decompress if needed
    if (session.isCompressed) {
      console.log('📦 Decompressing session...');
      await session.decompress();
    }
    
    console.log(`✅ Session loaded: ${session.metadata.name}`);
    return session;
  }

  /**
   * Launch browser with a specific session
   */
  async launchWithSession(sessionId: string, options: LaunchOptions = {}): Promise<any> {
    console.log(`🚀 Launching browser with session: ${sessionId}`);
    
    const session = await this.loadSession(sessionId);
    return await this.browserAdapter.launchWithSession(sessionId, options);
  }

  /**
   * List all available sessions
   */
  async listSessions(): Promise<PSPSession[]> {
    console.log('📋 Listing sessions...');
    
    const sessions: PSPSession[] = [];
    
    // Get local sessions
    const localSessions = await PSPSession.listLocal(this.config);
    sessions.push(...localSessions);
    
    // Get remote sessions if using cloud storage
    if (this.config.storage.backend !== 'local') {
      try {
        const remoteMetadata = await this.storageBackend.list();
        
        // Add remote sessions that aren't already local
        for (const metadata of remoteMetadata) {
          if (!sessions.find(s => s.metadata.id === metadata.id)) {
            // Create a placeholder session for remote-only sessions
            const remoteSession = new PSPSession(metadata, '', this.config);
            sessions.push(remoteSession);
          }
        }
      } catch (error) {
        console.warn('Failed to list remote sessions:', error);
      }
    }
    
    return sessions.sort((a, b) => b.metadata.updatedAt - a.metadata.updatedAt);
  }

  /**
   * Synchronize sessions between local and remote storage
   */
  async syncSessions(): Promise<SyncResult[]> {
    if (this.config.storage.backend === 'local') {
      throw new Error('Sync is not available for local storage backend');
    }
    
    console.log('🔄 Synchronizing sessions...');
    
    const results: SyncResult[] = [];
    const localSessions = await PSPSession.listLocal(this.config);
    const remoteMetadata = await this.storageBackend.list();
    
    // Upload new local sessions
    for (const localSession of localSessions) {
      const remoteSession = remoteMetadata.find(r => r.id === localSession.metadata.id);
      
      if (!remoteSession) {
        // Upload new local session
        try {
          await localSession.upload();
          results.push({
            success: true,
            sessionId: localSession.metadata.id,
            action: 'upload',
            message: `Uploaded new session: ${localSession.metadata.name}`
          });
        } catch (error) {
          results.push({
            success: false,
            sessionId: localSession.metadata.id,
            action: 'upload',
            message: `Failed to upload: ${error.message}`
          });
        }
      } else if (localSession.metadata.updatedAt > remoteSession.updatedAt) {
        // Upload updated local session
        try {
          await localSession.upload();
          results.push({
            success: true,
            sessionId: localSession.metadata.id,
            action: 'upload',
            message: `Updated remote session: ${localSession.metadata.name}`
          });
        } catch (error) {
          results.push({
            success: false,
            sessionId: localSession.metadata.id,
            action: 'upload',
            message: `Failed to update: ${error.message}`
          });
        }
      } else if (remoteSession.updatedAt > localSession.metadata.updatedAt) {
        // Handle conflict based on resolution strategy
        if (this.config.sync.conflictResolution === 'latest') {
          try {
            const { data, metadata } = await this.storageBackend.download(localSession.metadata.id);
            const remoteSession = await PSPSession.fromBuffer(data, metadata, this.config);
            await remoteSession.save();
            
            results.push({
              success: true,
              sessionId: localSession.metadata.id,
              action: 'download',
              message: `Downloaded newer version: ${metadata.name}`
            });
          } catch (error) {
            results.push({
              success: false,
              sessionId: localSession.metadata.id,
              action: 'download',
              message: `Failed to download: ${error.message}`
            });
          }
        } else {
          results.push({
            success: false,
            sessionId: localSession.metadata.id,
            action: 'conflict',
            message: `Conflict detected: ${localSession.metadata.name}`,
            conflictData: {
              local: localSession.metadata,
              remote: remoteSession
            }
          });
        }
      }
    }
    
    // Download new remote sessions
    for (const remoteMetadata of remoteMetadata) {
      const localSession = localSessions.find(l => l.metadata.id === remoteMetadata.id);
      
      if (!localSession) {
        try {
          const { data, metadata } = await this.storageBackend.download(remoteMetadata.id);
          const session = await PSPSession.fromBuffer(data, metadata, this.config);
          await session.save();
          
          results.push({
            success: true,
            sessionId: remoteMetadata.id,
            action: 'download',
            message: `Downloaded new session: ${metadata.name}`
          });
        } catch (error) {
          results.push({
            success: false,
            sessionId: remoteMetadata.id,
            action: 'download',
            message: `Failed to download: ${error.message}`
          });
        }
      }
    }
    
    console.log(`✅ Sync completed: ${results.length} operations`);
    return results;
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string, deleteRemote: boolean = false): Promise<void> {
    console.log(`🗑️  Deleting session: ${sessionId}`);
    
    // Delete local session
    try {
      const session = await PSPSession.load(sessionId, this.config);
      await session.delete();
    } catch (error) {
      console.warn('Failed to delete local session:', error);
    }
    
    // Delete remote session if requested
    if (deleteRemote && this.config.storage.backend !== 'local') {
      try {
        await this.storageBackend.delete(sessionId);
      } catch (error) {
        console.warn('Failed to delete remote session:', error);
      }
    }
    
    console.log(`✅ Session deleted: ${sessionId}`);
  }

  /**
   * Clone a session with a new name
   */
  async cloneSession(sessionId: string, newName: string): Promise<PSPSession> {
    console.log(`📋 Cloning session: ${sessionId} -> ${newName}`);
    
    const originalSession = await this.loadSession(sessionId);
    const clonedSession = await originalSession.clone(newName);
    
    console.log(`✅ Session cloned: ${clonedSession.metadata.id}`);
    return clonedSession;
  }

  /**
   * Get configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<typeof this.config>): void {
    PSPConfig.updateConfig(updates);
    this.config = PSPConfig.getConfig();
    
    // Recreate storage backend if changed
    this.storageBackend = this.createStorageBackend();
  }

  /**
   * Create storage backend based on configuration
   */
  private createStorageBackend(): StorageBackend {
    switch (this.config.storage.backend) {
      case 'local':
        return new LocalStorageBackend(this.config.storage.local!);
      
      case 's3':
        return new S3StorageBackend(this.config.storage.s3!);
      
      case 'cloudflare-r2':
        return new CloudflareR2Backend(this.config.storage.cloudflareR2!);
      
      default:
        throw new Error(`Unsupported storage backend: ${this.config.storage.backend}`);
    }
  }

  /**
   * Test storage backend connection
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Try to list sessions to test connection
      await this.storageBackend.list();
      return {
        success: true,
        message: `Successfully connected to ${this.config.storage.backend} storage`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect to ${this.config.storage.backend} storage: ${error.message}`
      };
    }
  }
}
