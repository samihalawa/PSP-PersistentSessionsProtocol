/**
 * Local Storage Backend for PSP
 * 
 * Implements PSP storage using local filesystem.
 * Used as the default storage backend for local-only usage.
 */

import * as fs from 'fs';
import * as path from 'path';
import { StorageBackend, PSPSessionMetadata } from '../types';

export interface LocalStorageConfig {
  basePath: string;
}

export class LocalStorageBackend implements StorageBackend {
  private basePath: string;
  private sessionsDir: string;
  private dataDir: string;

  constructor(config: LocalStorageConfig) {
    this.basePath = config.basePath.replace('~', require('os').homedir());
    this.sessionsDir = path.join(this.basePath, 'sessions');
    this.dataDir = path.join(this.basePath, 'data');
    
    // Ensure directories exist
    fs.mkdirSync(this.sessionsDir, { recursive: true });
    fs.mkdirSync(this.dataDir, { recursive: true });
  }

  /**
   * Upload (save) session data locally
   */
  async upload(sessionId: string, data: Buffer, metadata: PSPSessionMetadata): Promise<void> {
    console.log(`💾 Saving session ${sessionId} locally...`);
    
    // Save session data
    const dataPath = path.join(this.dataDir, `${sessionId}.psp`);
    fs.writeFileSync(dataPath, data);
    
    // Save metadata
    const metadataPath = path.join(this.sessionsDir, `${sessionId}.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    
    console.log(`✅ Session ${sessionId} saved locally`);
  }

  /**
   * Download (load) session data locally
   */
  async download(sessionId: string): Promise<{ data: Buffer; metadata: PSPSessionMetadata }> {
    console.log(`📁 Loading session ${sessionId} locally...`);
    
    // Load metadata
    const metadataPath = path.join(this.sessionsDir, `${sessionId}.json`);
    if (!fs.existsSync(metadataPath)) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    const metadata: PSPSessionMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    
    // Load session data
    const dataPath = path.join(this.dataDir, `${sessionId}.psp`);
    if (!fs.existsSync(dataPath)) {
      throw new Error(`Session data for ${sessionId} not found`);
    }
    
    const data = fs.readFileSync(dataPath);
    
    console.log(`✅ Session ${sessionId} loaded locally`);
    return { data, metadata };
  }

  /**
   * List all local sessions
   */
  async list(): Promise<PSPSessionMetadata[]> {
    console.log('📋 Listing local sessions...');
    
    if (!fs.existsSync(this.sessionsDir)) {
      return [];
    }
    
    const sessions: PSPSessionMetadata[] = [];
    const files = fs.readdirSync(this.sessionsDir).filter(f => f.endsWith('.json'));
    
    for (const file of files) {
      try {
        const metadataPath = path.join(this.sessionsDir, file);
        const metadata: PSPSessionMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        sessions.push(metadata);
      } catch (error) {
        console.warn(`Failed to load session metadata from ${file}:`, error);
      }
    }
    
    console.log(`✅ Found ${sessions.length} local sessions`);
    return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Delete session from local storage
   */
  async delete(sessionId: string): Promise<void> {
    console.log(`🗑️  Deleting session ${sessionId} locally...`);
    
    // Delete metadata
    const metadataPath = path.join(this.sessionsDir, `${sessionId}.json`);
    if (fs.existsSync(metadataPath)) {
      fs.unlinkSync(metadataPath);
    }
    
    // Delete session data
    const dataPath = path.join(this.dataDir, `${sessionId}.psp`);
    if (fs.existsSync(dataPath)) {
      fs.unlinkSync(dataPath);
    }
    
    console.log(`✅ Session ${sessionId} deleted locally`);
  }

  /**
   * Check if session exists locally
   */
  async exists(sessionId: string): Promise<boolean> {
    const metadataPath = path.join(this.sessionsDir, `${sessionId}.json`);
    const dataPath = path.join(this.dataDir, `${sessionId}.psp`);
    
    return fs.existsSync(metadataPath) && fs.existsSync(dataPath);
  }
}
