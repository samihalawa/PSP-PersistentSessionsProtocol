/**
 * Session Encryption Utilities
 * 
 * Handles encryption and decryption of Chrome profile data
 * using industry-standard encryption algorithms.
 */

import * as fs from 'fs';
import * as crypto from 'crypto';

export class SessionEncryption {
  /**
   * Encrypt a file or directory
   */
  static async encrypt(
    sourcePath: string,
    targetPath: string,
    key: string,
    algorithm: 'aes-256-gcm' | 'chacha20-poly1305' = 'aes-256-gcm'
  ): Promise<void> {
    const data = fs.readFileSync(sourcePath);
    const encrypted = this.encryptBuffer(data, key, algorithm);
    fs.writeFileSync(targetPath, encrypted);
  }

  /**
   * Decrypt a file
   */
  static async decrypt(
    sourcePath: string,
    targetPath: string,
    key: string,
    algorithm: 'aes-256-gcm' | 'chacha20-poly1305' = 'aes-256-gcm'
  ): Promise<void> {
    const encryptedData = fs.readFileSync(sourcePath);
    const decrypted = this.decryptBuffer(encryptedData, key, algorithm);
    fs.writeFileSync(targetPath, decrypted);
  }

  /**
   * Encrypt buffer data
   */
  static encryptBuffer(
    data: Buffer,
    key: string,
    algorithm: 'aes-256-gcm' | 'chacha20-poly1305' = 'aes-256-gcm'
  ): Buffer {
    const keyBuffer = this.deriveKey(key);
    
    if (algorithm === 'aes-256-gcm') {
      return this.encryptAES(data, keyBuffer);
    } else {
      return this.encryptChaCha20(data, keyBuffer);
    }
  }

  /**
   * Decrypt buffer data
   */
  static decryptBuffer(
    encryptedData: Buffer,
    key: string,
    algorithm: 'aes-256-gcm' | 'chacha20-poly1305' = 'aes-256-gcm'
  ): Buffer {
    const keyBuffer = this.deriveKey(key);
    
    if (algorithm === 'aes-256-gcm') {
      return this.decryptAES(encryptedData, keyBuffer);
    } else {
      return this.decryptChaCha20(encryptedData, keyBuffer);
    }
  }

  /**
   * Encrypt using AES-256-GCM
   */
  private static encryptAES(data: Buffer, key: Buffer): Buffer {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', key);
    cipher.setAAD(Buffer.from('PSP-SESSION-DATA'));
    
    const encrypted = Buffer.concat([
      cipher.update(data),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    // Format: [IV(16)] + [AuthTag(16)] + [EncryptedData]
    return Buffer.concat([iv, authTag, encrypted]);
  }

  /**
   * Decrypt using AES-256-GCM
   */
  private static decryptAES(encryptedData: Buffer, key: Buffer): Buffer {
    if (encryptedData.length < 32) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = encryptedData.slice(0, 16);
    const authTag = encryptedData.slice(16, 32);
    const encrypted = encryptedData.slice(32);
    
    const decipher = crypto.createDecipher('aes-256-gcm', key);
    decipher.setAuthTag(authTag);
    decipher.setAAD(Buffer.from('PSP-SESSION-DATA'));
    
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
  }

  /**
   * Encrypt using ChaCha20-Poly1305
   */
  private static encryptChaCha20(data: Buffer, key: Buffer): Buffer {
    const nonce = crypto.randomBytes(12);
    const cipher = crypto.createCipher('chacha20-poly1305', key);
    cipher.setAAD(Buffer.from('PSP-SESSION-DATA'));
    
    const encrypted = Buffer.concat([
      cipher.update(data),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    // Format: [Nonce(12)] + [AuthTag(16)] + [EncryptedData]
    return Buffer.concat([nonce, authTag, encrypted]);
  }

  /**
   * Decrypt using ChaCha20-Poly1305
   */
  private static decryptChaCha20(encryptedData: Buffer, key: Buffer): Buffer {
    if (encryptedData.length < 28) {
      throw new Error('Invalid encrypted data format');
    }
    
    const nonce = encryptedData.slice(0, 12);
    const authTag = encryptedData.slice(12, 28);
    const encrypted = encryptedData.slice(28);
    
    const decipher = crypto.createDecipher('chacha20-poly1305', key);
    decipher.setAuthTag(authTag);
    decipher.setAAD(Buffer.from('PSP-SESSION-DATA'));
    
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
  }

  /**
   * Derive encryption key from password
   */
  private static deriveKey(password: string): Buffer {
    // Use PBKDF2 to derive a strong key from password
    const salt = crypto.createHash('sha256').update('PSP-SALT').digest();
    return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  }

  /**
   * Generate a random encryption key
   */
  static generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate encryption key
   */
  static validateKey(key: string): boolean {
    try {
      if (key.length < 16) return false;
      this.deriveKey(key);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get encryption overhead size
   */
  static getEncryptionOverhead(algorithm: 'aes-256-gcm' | 'chacha20-poly1305'): number {
    // AES-GCM: IV(16) + AuthTag(16) = 32 bytes
    // ChaCha20-Poly1305: Nonce(12) + AuthTag(16) = 28 bytes
    return algorithm === 'aes-256-gcm' ? 32 : 28;
  }
}
