/**
 * PSP Encryption & Security Module
 * 
 * Implements AES-256-GCM encryption with HMAC integrity verification
 * and secure key derivation as specified in Phase 1.3.2
 */

const crypto = require('crypto');
const { promisify } = require('util');

const randomBytes = promisify(crypto.randomBytes);
const scrypt = promisify(crypto.scrypt);

/**
 * PSP Security Configuration
 */
const PSP_SECURITY_CONFIG = {
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,     // 256 bits
    ivLength: 16,      // 128 bits
    tagLength: 16,     // 128 bits
    saltLength: 32     // 256 bits
  },
  integrity: {
    algorithm: 'sha256',
    keyLength: 32
  },
  keyDerivation: {
    algorithm: 'scrypt',
    cost: 16384,       // N parameter
    blockSize: 8,      // r parameter  
    parallelization: 1, // p parameter
    keyLength: 64      // 512 bits total (32 for encryption + 32 for HMAC)
  }
};

/**
 * PSP Encryption Manager
 * Handles all cryptographic operations for PSP sessions
 */
class PSPEncryption {
  constructor(options = {}) {
    this.config = { ...PSP_SECURITY_CONFIG, ...options };
    this.keyCache = new Map();
    this.performanceMetrics = {
      encryptionTimes: [],
      decryptionTimes: [],
      keyDerivationTimes: []
    };
  }

  /**
   * Encrypt PSP session data
   */
  async encrypt(sessionData, password, metadata = {}) {
    const startTime = performance.now();
    
    try {
      // Generate salt and derive keys
      const salt = await randomBytes(this.config.encryption.saltLength);
      const { encryptionKey, hmacKey } = await this.deriveKeys(password, salt);

      // Serialize session data
      const plaintext = JSON.stringify(sessionData);
      const plaintextBuffer = Buffer.from(plaintext, 'utf8');

      // Generate IV
      const iv = await randomBytes(this.config.encryption.ivLength);

      // Encrypt data
      const cipher = crypto.createCipherGCM('aes-256-gcm', encryptionKey, iv);
      cipher.setAAD(Buffer.from(JSON.stringify(metadata)));
      
      const encrypted = Buffer.concat([
        cipher.update(plaintextBuffer),
        cipher.final()
      ]);
      
      const authTag = cipher.getAuthTag();

      // Create encrypted blob
      const encryptedBlob = {
        version: '1.0',
        algorithm: this.config.encryption.algorithm,
        salt: salt.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        data: encrypted.toString('base64'),
        metadata: metadata,
        timestamp: new Date().toISOString()
      };

      // Generate HMAC for integrity
      const hmac = crypto.createHmac(this.config.integrity.algorithm, hmacKey);
      hmac.update(JSON.stringify(encryptedBlob));
      encryptedBlob.hmac = hmac.digest('base64');

      const endTime = performance.now();
      this.performanceMetrics.encryptionTimes.push(endTime - startTime);

      return {
        success: true,
        encryptedBlob,
        metrics: {
          encryptionTime: endTime - startTime,
          originalSize: plaintextBuffer.length,
          encryptedSize: Buffer.from(JSON.stringify(encryptedBlob)).length,
          compressionRatio: plaintextBuffer.length / Buffer.from(JSON.stringify(encryptedBlob)).length
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        metrics: {
          encryptionTime: performance.now() - startTime
        }
      };
    }
  }

  /**
   * Decrypt PSP session data
   */
  async decrypt(encryptedBlob, password) {
    const startTime = performance.now();
    
    try {
      // Verify HMAC integrity first
      const blobCopy = { ...encryptedBlob };
      const receivedHmac = blobCopy.hmac;
      delete blobCopy.hmac;

      const salt = Buffer.from(encryptedBlob.salt, 'base64');
      const { encryptionKey, hmacKey } = await this.deriveKeys(password, salt);

      const hmac = crypto.createHmac(this.config.integrity.algorithm, hmacKey);
      hmac.update(JSON.stringify(blobCopy));
      const computedHmac = hmac.digest('base64');

      if (receivedHmac !== computedHmac) {
        throw new Error('HMAC verification failed - data integrity compromised');
      }

      // Decrypt data
      const iv = Buffer.from(encryptedBlob.iv, 'base64');
      const authTag = Buffer.from(encryptedBlob.authTag, 'base64');
      const encryptedData = Buffer.from(encryptedBlob.data, 'base64');

      const decipher = crypto.createDecipherGCM('aes-256-gcm', encryptionKey, iv);
      decipher.setAuthTag(authTag);
      decipher.setAAD(Buffer.from(JSON.stringify(encryptedBlob.metadata || {})));

      const decrypted = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final()
      ]);

      const sessionData = JSON.parse(decrypted.toString('utf8'));

      const endTime = performance.now();
      this.performanceMetrics.decryptionTimes.push(endTime - startTime);

      return {
        success: true,
        sessionData,
        metadata: encryptedBlob.metadata,
        metrics: {
          decryptionTime: endTime - startTime,
          decryptedSize: decrypted.length
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        metrics: {
          decryptionTime: performance.now() - startTime
        }
      };
    }
  }

  /**
   * Derive encryption and HMAC keys from password
   */
  async deriveKeys(password, salt) {
    const startTime = performance.now();
    
    // Check cache first
    const cacheKey = `${password}:${salt.toString('base64')}`;
    if (this.keyCache.has(cacheKey)) {
      return this.keyCache.get(cacheKey);
    }

    try {
      const derivedKey = await scrypt(
        password,
        salt,
        this.config.keyDerivation.keyLength,
        {
          cost: this.config.keyDerivation.cost,
          blockSize: this.config.keyDerivation.blockSize,
          parallelization: this.config.keyDerivation.parallelization,
          maxmem: 64 * 1024 * 1024 // 64MB max memory
        }
      );

      const keys = {
        encryptionKey: derivedKey.slice(0, 32),
        hmacKey: derivedKey.slice(32, 64)
      };

      // Cache keys (with size limit)
      if (this.keyCache.size < 100) {
        this.keyCache.set(cacheKey, keys);
      }

      const endTime = performance.now();
      this.performanceMetrics.keyDerivationTimes.push(endTime - startTime);

      return keys;

    } catch (error) {
      throw new Error(`Key derivation failed: ${error.message}`);
    }
  }

  /**
   * Generate secure random password
   */
  async generateSecurePassword(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const randomBuffer = await randomBytes(length);
    
    return Array.from(randomBuffer)
      .map(byte => chars[byte % chars.length])
      .join('');
  }

  /**
   * Rotate encryption keys (for key rotation)
   */
  async rotateKeys(oldEncryptedBlob, oldPassword, newPassword) {
    // Decrypt with old password
    const decryptResult = await this.decrypt(oldEncryptedBlob, oldPassword);
    if (!decryptResult.success) {
      return decryptResult;
    }

    // Re-encrypt with new password
    const encryptResult = await this.encrypt(
      decryptResult.sessionData,
      newPassword,
      {
        ...decryptResult.metadata,
        keyRotated: true,
        rotationTimestamp: new Date().toISOString()
      }
    );

    return {
      ...encryptResult,
      rotated: true
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    const calculateStats = (times) => {
      if (times.length === 0) return { avg: 0, min: 0, max: 0, count: 0 };
      
      return {
        avg: times.reduce((a, b) => a + b, 0) / times.length,
        min: Math.min(...times),
        max: Math.max(...times),
        count: times.length
      };
    };

    return {
      encryption: calculateStats(this.performanceMetrics.encryptionTimes),
      decryption: calculateStats(this.performanceMetrics.decryptionTimes),
      keyDerivation: calculateStats(this.performanceMetrics.keyDerivationTimes),
      keysCached: this.keyCache.size
    };
  }

  /**
   * Verify encryption strength
   */
  verifyEncryptionStrength() {
    const checks = {
      algorithm: this.config.encryption.algorithm === 'aes-256-gcm',
      keyLength: this.config.encryption.keyLength >= 32,
      ivLength: this.config.encryption.ivLength >= 16,
      hmacEnabled: this.config.integrity.algorithm === 'sha256',
      scryptParams: this.config.keyDerivation.cost >= 16384
    };

    const allChecks = Object.values(checks).every(Boolean);

    return {
      secure: allChecks,
      checks,
      grade: allChecks ? 'A+' : 'Insufficient'
    };
  }

  /**
   * Clear sensitive data from memory
   */
  clearKeys() {
    this.keyCache.clear();
    this.performanceMetrics = {
      encryptionTimes: [],
      decryptionTimes: [],
      keyDerivationTimes: []
    };
  }
}

/**
 * PSP Security Utilities
 */
class PSPSecurityUtils {
  /**
   * Generate cryptographically secure session ID
   */
  static async generateSessionId() {
    const randomBuffer = await randomBytes(16);
    return randomBuffer.toString('hex');
  }

  /**
   * Hash password for storage (not for encryption)
   */
  static async hashPassword(password, rounds = 12) {
    const bcrypt = require('bcrypt');
    return await bcrypt.hash(password, rounds);
  }

  /**
   * Verify password hash
   */
  static async verifyPassword(password, hash) {
    const bcrypt = require('bcrypt');
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate secure API key
   */
  static async generateApiKey() {
    const buffer = await randomBytes(32);
    return `psp_${buffer.toString('base64url')}`;
  }

  /**
   * Validate encryption strength
   */
  static validateEncryptionStrength(encryptedBlob) {
    const required = {
      version: !!encryptedBlob.version,
      algorithm: encryptedBlob.algorithm === 'aes-256-gcm',
      salt: !!encryptedBlob.salt,
      iv: !!encryptedBlob.iv,
      authTag: !!encryptedBlob.authTag,
      hmac: !!encryptedBlob.hmac
    };

    const score = Object.values(required).filter(Boolean).length / Object.keys(required).length;

    return {
      valid: score === 1,
      score,
      missing: Object.entries(required).filter(([, valid]) => !valid).map(([key]) => key)
    };
  }
}

module.exports = {
  PSPEncryption,
  PSPSecurityUtils,
  PSP_SECURITY_CONFIG
};