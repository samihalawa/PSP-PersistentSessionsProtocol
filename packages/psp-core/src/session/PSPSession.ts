/**
 * PSP Session Management
 * 
 * Handles session lifecycle including compression, encryption, 
 * cloud synchronization, and cross-machine restoration.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { PSPSessionMetadata, PSPConfig, PSPSession as IPSPSession } from '../types';
import { SessionCompression } from '../utils/SessionCompression';
import { SessionEncryption } from '../utils/SessionEncryption';

export class PSPSession implements IPSPSession {
  public metadata: PSPSessionMetadata;
  public profilePath: string;
  public isCompressed: boolean = false;
  public isEncrypted: boolean = false;
  
  private config: PSPConfig;
  private storageBackend: any; // Will be injected

  constructor(metadata: PSPSessionMetadata, profilePath: string, config: PSPConfig) {
    this.metadata = metadata;
    this.profilePath = profilePath;
    this.config = config;
  }

  /**
   * Create a new PSP session
   */
  static async create(
    name: string, 
    profilePath: string, 
    config: PSPConfig,
    options: {
      description?: string;
      tags?: string[];
      captureInfo?: any;
    } = {}
  ): Promise<PSPSession> {
    const metadata: PSPSessionMetadata = {
      id: uuidv4(),
      name,
      description: options.description || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      captureType: 'complete_chrome_state',
      platform: process.platform,
      version: '1.0.0',
      tags: options.tags || [],
      captureInfo: options.captureInfo || {
        sourceSize: 0,
        targetSize: 0,
        copyTimeMs: 0,
        chromeProcesses: 0,
        profileAnalysis: { profiles: [], totalFiles: 0, keyComponents: {} },
        captureMethod: 'unknown'
      }
    };

    return new PSPSession(metadata, profilePath, config);
  }

  /**
   * Load an existing session from local storage
   */
  static async load(sessionId: string, config: PSPConfig): Promise<PSPSession> {
    const sessionsDir = path.join(
      config.storage.local?.basePath || path.join(os.homedir(), '.psp'),
      'sessions'
    );
    
    const sessionFile = path.join(sessionsDir, `${sessionId}.json`);
    
    if (!fs.existsSync(sessionFile)) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
    return new PSPSession(sessionData.metadata, sessionData.userDataDir, config);
  }

  /**
   * Create session from buffer (for cloud downloads)
   */
  static async fromBuffer(
    data: Buffer, 
    metadata: PSPSessionMetadata, 
    config: PSPConfig
  ): Promise<PSPSession> {
    const profilePath = path.join(
      config.storage.local?.basePath || path.join(os.homedir(), '.psp'),
      'profiles',
      metadata.id
    );

    // Extract session data to profile directory
    await SessionCompression.decompress(data, profilePath);
    
    const session = new PSPSession(metadata, profilePath, config);
    await session.save();
    
    return session;
  }

  /**
   * List all local sessions
   */
  static async listLocal(config: PSPConfig): Promise<PSPSession[]> {
    const sessionsDir = path.join(
      config.storage.local?.basePath || path.join(os.homedir(), '.psp'),
      'sessions'
    );

    if (!fs.existsSync(sessionsDir)) {
      return [];
    }

    const sessions: PSPSession[] = [];
    const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.json'));

    for (const file of files) {
      try {
        const sessionId = path.basename(file, '.json');
        const session = await PSPSession.load(sessionId, config);
        sessions.push(session);
      } catch (error) {
        console.warn(`Failed to load session from ${file}:`, error);
      }
    }

    return sessions.sort((a, b) => b.metadata.updatedAt - a.metadata.updatedAt);
  }

  /**
   * Save session metadata to local storage
   */
  async save(): Promise<void> {
    const sessionsDir = path.join(
      this.config.storage.local?.basePath || path.join(os.homedir(), '.psp'),
      'sessions'
    );

    fs.mkdirSync(sessionsDir, { recursive: true });

    const sessionFile = path.join(sessionsDir, `${this.metadata.id}.json`);
    const sessionData = {
      metadata: this.metadata,
      userDataDir: this.profilePath
    };

    fs.writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));
  }

  /**
   * Compress session data
   */
  async compress(): Promise<void> {
    if (this.isCompressed) {
      console.log('Session is already compressed');
      return;
    }

    console.log(`🗜️  Compressing session: ${this.metadata.name}`);
    
    const compressedPath = `${this.profilePath}.compressed`;
    const originalSize = this.getDirectorySize(this.profilePath);
    
    await SessionCompression.compress(
      this.profilePath, 
      compressedPath,
      this.config.compression.algorithm,
      this.config.compression.level
    );

    const compressedSize = fs.statSync(compressedPath).size;
    
    // Replace original with compressed version
    fs.rmSync(this.profilePath, { recursive: true, force: true });
    fs.renameSync(compressedPath, this.profilePath);
    
    this.isCompressed = true;
    this.metadata.captureInfo.compressedSize = compressedSize;
    this.metadata.updatedAt = Date.now();
    
    await this.save();
    
    console.log(`✅ Compressed: ${this.formatBytes(originalSize)} → ${this.formatBytes(compressedSize)} (${Math.round((1 - compressedSize/originalSize) * 100)}% reduction)`);
  }

  /**
   * Decompress session data
   */
  async decompress(): Promise<void> {
    if (!this.isCompressed) {
      console.log('Session is not compressed');
      return;
    }

    console.log(`📦 Decompressing session: ${this.metadata.name}`);
    
    const decompressedPath = `${this.profilePath}.decompressed`;
    
    await SessionCompression.decompress(this.profilePath, decompressedPath);
    
    // Replace compressed with decompressed version
    fs.rmSync(this.profilePath, { recursive: true, force: true });
    fs.renameSync(decompressedPath, this.profilePath);
    
    this.isCompressed = false;
    this.metadata.updatedAt = Date.now();
    
    await this.save();
    
    console.log(`✅ Decompressed session: ${this.metadata.name}`);
  }

  /**
   * Encrypt session data
   */
  async encrypt(key?: string): Promise<void> {
    if (this.isEncrypted) {
      console.log('Session is already encrypted');
      return;
    }

    const encryptionKey = key || this.config.encryption.key;
    if (!encryptionKey) {
      throw new Error('Encryption key is required');
    }

    console.log(`🔐 Encrypting session: ${this.metadata.name}`);
    
    const encryptedPath = `${this.profilePath}.encrypted`;
    const originalSize = this.isCompressed ? 
      fs.statSync(this.profilePath).size : 
      this.getDirectorySize(this.profilePath);
    
    await SessionEncryption.encrypt(
      this.profilePath,
      encryptedPath,
      encryptionKey,
      this.config.encryption.algorithm
    );

    const encryptedSize = fs.statSync(encryptedPath).size;
    
    // Replace original with encrypted version
    if (fs.statSync(this.profilePath).isDirectory()) {
      fs.rmSync(this.profilePath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(this.profilePath);
    }
    fs.renameSync(encryptedPath, this.profilePath);
    
    this.isEncrypted = true;
    this.metadata.captureInfo.encryptedSize = encryptedSize;
    this.metadata.updatedAt = Date.now();
    
    await this.save();
    
    console.log(`✅ Encrypted session: ${this.formatBytes(encryptedSize)}`);
  }

  /**
   * Decrypt session data
   */
  async decrypt(key?: string): Promise<void> {
    if (!this.isEncrypted) {
      console.log('Session is not encrypted');
      return;
    }

    const encryptionKey = key || this.config.encryption.key;
    if (!encryptionKey) {
      throw new Error('Decryption key is required');
    }

    console.log(`🔓 Decrypting session: ${this.metadata.name}`);
    
    const decryptedPath = `${this.profilePath}.decrypted`;
    
    await SessionEncryption.decrypt(
      this.profilePath,
      decryptedPath,
      encryptionKey,
      this.config.encryption.algorithm
    );
    
    // Replace encrypted with decrypted version
    fs.unlinkSync(this.profilePath);
    fs.renameSync(decryptedPath, this.profilePath);
    
    this.isEncrypted = false;
    this.metadata.updatedAt = Date.now();
    
    await this.save();
    
    console.log(`✅ Decrypted session: ${this.metadata.name}`);
  }

  /**
   * Upload session to cloud storage
   */
  async upload(): Promise<void> {
    if (this.config.storage.backend === 'local') {
      throw new Error('Upload not available for local storage backend');
    }

    console.log(`☁️  Uploading session: ${this.metadata.name}`);
    
    // Prepare data for upload
    let dataBuffer: Buffer;
    
    if (fs.statSync(this.profilePath).isDirectory()) {
      // Compress directory to buffer
      const tempCompressedPath = `${this.profilePath}.temp.tar.gz`;
      await SessionCompression.compress(this.profilePath, tempCompressedPath);
      dataBuffer = fs.readFileSync(tempCompressedPath);
      fs.unlinkSync(tempCompressedPath);
    } else {
      // Already a file (compressed/encrypted)
      dataBuffer = fs.readFileSync(this.profilePath);
    }

    // Upload using storage backend (will be injected)
    if (this.storageBackend) {
      await this.storageBackend.upload(this.metadata.id, dataBuffer, this.metadata);
    }
    
    console.log(`✅ Uploaded session: ${this.metadata.name}`);
  }

  /**
   * Download session from cloud storage
   */
  async download(): Promise<void> {
    if (this.config.storage.backend === 'local') {
      throw new Error('Download not available for local storage backend');
    }

    console.log(`📥 Downloading session: ${this.metadata.id}`);
    
    // Download using storage backend (will be injected)
    if (this.storageBackend) {
      const { data, metadata } = await this.storageBackend.download(this.metadata.id);
      
      // Update metadata
      this.metadata = metadata;
      
      // Save data to profile path
      if (this.isCompressed || this.isEncrypted) {
        fs.writeFileSync(this.profilePath, data);
      } else {
        // Decompress to directory
        await SessionCompression.decompress(data, this.profilePath);
      }
      
      await this.save();
    }
    
    console.log(`✅ Downloaded session: ${this.metadata.name}`);
  }

  /**
   * Clone session with new name
   */
  async clone(newName: string): Promise<PSPSession> {
    console.log(`📋 Cloning session: ${this.metadata.name} → ${newName}`);
    
    const newSessionId = uuidv4();
    const newProfilePath = path.join(
      path.dirname(this.profilePath),
      newSessionId
    );

    // Copy profile data
    if (fs.statSync(this.profilePath).isDirectory()) {
      await this.copyDirectory(this.profilePath, newProfilePath);
    } else {
      fs.copyFileSync(this.profilePath, newProfilePath);
    }

    // Create new metadata
    const newMetadata: PSPSessionMetadata = {
      ...this.metadata,
      id: newSessionId,
      name: newName,
      description: `Cloned from ${this.metadata.name}`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const clonedSession = new PSPSession(newMetadata, newProfilePath, this.config);
    clonedSession.isCompressed = this.isCompressed;
    clonedSession.isEncrypted = this.isEncrypted;
    
    await clonedSession.save();
    
    console.log(`✅ Cloned session: ${newSessionId}`);
    return clonedSession;
  }

  /**
   * Delete session
   */
  async delete(): Promise<void> {
    console.log(`🗑️  Deleting session: ${this.metadata.name}`);
    
    // Delete profile data
    if (fs.existsSync(this.profilePath)) {
      if (fs.statSync(this.profilePath).isDirectory()) {
        fs.rmSync(this.profilePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(this.profilePath);
      }
    }

    // Delete metadata file
    const sessionsDir = path.join(
      this.config.storage.local?.basePath || path.join(os.homedir(), '.psp'),
      'sessions'
    );
    const sessionFile = path.join(sessionsDir, `${this.metadata.id}.json`);
    
    if (fs.existsSync(sessionFile)) {
      fs.unlinkSync(sessionFile);
    }
    
    console.log(`✅ Deleted session: ${this.metadata.name}`);
  }

  /**
   * Get session size
   */
  getSize(): number {
    if (!fs.existsSync(this.profilePath)) {
      return 0;
    }

    if (fs.statSync(this.profilePath).isDirectory()) {
      return this.getDirectorySize(this.profilePath);
    } else {
      return fs.statSync(this.profilePath).size;
    }
  }

  /**
   * Get session info
   */
  getInfo(): {
    id: string;
    name: string;
    size: string;
    created: string;
    updated: string;
    compressed: boolean;
    encrypted: boolean;
    platform: string;
  } {
    return {
      id: this.metadata.id,
      name: this.metadata.name,
      size: this.formatBytes(this.getSize()),
      created: new Date(this.metadata.createdAt).toLocaleString(),
      updated: new Date(this.metadata.updatedAt).toLocaleString(),
      compressed: this.isCompressed,
      encrypted: this.isEncrypted,
      platform: this.metadata.platform
    };
  }

  // Utility methods
  private async copyDirectory(src: string, dest: string): Promise<void> {
    fs.mkdirSync(dest, { recursive: true });
    
    const items = fs.readdirSync(src);
    
    for (const item of items) {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      
      if (fs.statSync(srcPath).isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  private getDirectorySize(dirPath: string): number {
    if (!fs.existsSync(dirPath)) return 0;
    
    let totalSize = 0;
    
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          totalSize += this.getDirectorySize(itemPath);
        } else {
          totalSize += stats.size;
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
    
    return totalSize;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
