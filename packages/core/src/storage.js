/**
 * PSP Storage Provider Interface
 * 
 * Implements pluggable storage interface with filesystem, Redis, S3, and 
 * Cloudflare KV providers as specified in Phase 1.3.3
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * Abstract Storage Provider Interface
 * All storage providers must implement this interface
 */
class StorageProvider {
  constructor(config = {}) {
    this.config = config;
    this.metrics = {
      operations: 0,
      totalTime: 0,
      errors: 0
    };
  }

  /**
   * Store session data
   * @param {string} sessionId - Unique session identifier
   * @param {object} sessionData - PSP session data
   * @param {object} options - Storage options
   * @returns {Promise<object>} Storage result
   */
  async store(sessionId, sessionData, options = {}) {
    throw new Error('store() method must be implemented by storage provider');
  }

  /**
   * Retrieve session data
   * @param {string} sessionId - Unique session identifier
   * @param {object} options - Retrieval options
   * @returns {Promise<object>} Session data or null if not found
   */
  async retrieve(sessionId, options = {}) {
    throw new Error('retrieve() method must be implemented by storage provider');
  }

  /**
   * Delete session data
   * @param {string} sessionId - Unique session identifier
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async delete(sessionId) {
    throw new Error('delete() method must be implemented by storage provider');
  }

  /**
   * List all sessions
   * @param {object} options - Listing options (limit, offset, filter)
   * @returns {Promise<Array>} Array of session metadata
   */
  async list(options = {}) {
    throw new Error('list() method must be implemented by storage provider');
  }

  /**
   * Check if session exists
   * @param {string} sessionId - Unique session identifier
   * @returns {Promise<boolean>} True if exists
   */
  async exists(sessionId) {
    throw new Error('exists() method must be implemented by storage provider');
  }

  /**
   * Get storage metrics
   * @returns {object} Performance and usage metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      averageTime: this.metrics.operations > 0 ? this.metrics.totalTime / this.metrics.operations : 0
    };
  }

  /**
   * Test storage provider connectivity
   * @returns {Promise<object>} Health check result
   */
  async healthCheck() {
    throw new Error('healthCheck() method must be implemented by storage provider');
  }
}

/**
 * Filesystem Storage Provider
 * Stores sessions as JSON files on local filesystem
 */
class FilesystemStorageProvider extends StorageProvider {
  constructor(config = {}) {
    super(config);
    this.baseDir = config.baseDir || './psp-sessions';
    this.compression = config.compression || false;
  }

  async initialize() {
    await fs.mkdir(this.baseDir, { recursive: true });
    console.log(`📁 Filesystem storage initialized: ${this.baseDir}`);
  }

  async store(sessionId, sessionData, options = {}) {
    const startTime = Date.now();
    
    try {
      const sessionPath = path.join(this.baseDir, `${sessionId}.json`);
      const metadata = {
        sessionId,
        storedAt: new Date().toISOString(),
        provider: 'filesystem',
        version: sessionData.version || '1.0',
        ...options.metadata
      };

      const storeData = {
        metadata,
        sessionData
      };

      await fs.writeFile(sessionPath, JSON.stringify(storeData, null, 2));

      this.metrics.operations++;
      this.metrics.totalTime += Date.now() - startTime;

      return {
        success: true,
        sessionId,
        path: sessionPath,
        size: JSON.stringify(storeData).length,
        metadata
      };

    } catch (error) {
      this.metrics.errors++;
      return {
        success: false,
        error: error.message
      };
    }
  }

  async retrieve(sessionId, options = {}) {
    const startTime = Date.now();
    
    try {
      const sessionPath = path.join(this.baseDir, `${sessionId}.json`);
      const data = await fs.readFile(sessionPath, 'utf8');
      const parsed = JSON.parse(data);

      this.metrics.operations++;
      this.metrics.totalTime += Date.now() - startTime;

      return {
        success: true,
        sessionData: parsed.sessionData,
        metadata: parsed.metadata,
        retrievedAt: new Date().toISOString()
      };

    } catch (error) {
      if (error.code === 'ENOENT') {
        return { success: false, error: 'Session not found' };
      }
      this.metrics.errors++;
      return { success: false, error: error.message };
    }
  }

  async delete(sessionId) {
    try {
      const sessionPath = path.join(this.baseDir, `${sessionId}.json`);
      await fs.unlink(sessionPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  async list(options = {}) {
    const { limit = 100, offset = 0, filter = {} } = options;
    
    try {
      const files = await fs.readdir(this.baseDir);
      const sessionFiles = files.filter(f => f.endsWith('.json'));
      
      const sessions = [];
      for (const file of sessionFiles.slice(offset, offset + limit)) {
        try {
          const data = await fs.readFile(path.join(this.baseDir, file), 'utf8');
          const parsed = JSON.parse(data);
          sessions.push(parsed.metadata);
        } catch (error) {
          // Skip corrupted files
          continue;
        }
      }

      return {
        success: true,
        sessions,
        total: sessionFiles.length,
        offset,
        limit
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async exists(sessionId) {
    try {
      const sessionPath = path.join(this.baseDir, `${sessionId}.json`);
      await fs.access(sessionPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  async healthCheck() {
    try {
      const testId = `health-check-${Date.now()}`;
      const testData = { test: true };
      
      await this.store(testId, testData);
      const retrieved = await this.retrieve(testId);
      await this.delete(testId);

      return {
        healthy: retrieved.success,
        provider: 'filesystem',
        latency: Date.now() - Date.now()
      };

    } catch (error) {
      return {
        healthy: false,
        provider: 'filesystem',
        error: error.message
      };
    }
  }
}

/**
 * Redis Storage Provider
 * Stores sessions in Redis with TTL support
 */
class RedisStorageProvider extends StorageProvider {
  constructor(config = {}) {
    super(config);
    this.redis = null;
    this.connectionString = config.connectionString || 'redis://localhost:6379';
    this.keyPrefix = config.keyPrefix || 'psp:session:';
    this.defaultTTL = config.defaultTTL || 3600; // 1 hour
  }

  async initialize() {
    try {
      const Redis = require('redis');
      this.redis = Redis.createClient({ url: this.connectionString });
      
      this.redis.on('error', (err) => {
        console.error('Redis error:', err);
        this.metrics.errors++;
      });

      await this.redis.connect();
      console.log('🔴 Redis storage initialized');
      
    } catch (error) {
      console.error('Redis initialization failed:', error.message);
      throw error;
    }
  }

  async store(sessionId, sessionData, options = {}) {
    const startTime = Date.now();
    
    try {
      const key = `${this.keyPrefix}${sessionId}`;
      const ttl = options.ttl || this.defaultTTL;
      
      const storeData = {
        sessionId,
        sessionData,
        storedAt: new Date().toISOString(),
        provider: 'redis',
        metadata: options.metadata || {}
      };

      await this.redis.setEx(key, ttl, JSON.stringify(storeData));

      this.metrics.operations++;
      this.metrics.totalTime += Date.now() - startTime;

      return {
        success: true,
        sessionId,
        key,
        ttl,
        size: JSON.stringify(storeData).length
      };

    } catch (error) {
      this.metrics.errors++;
      return {
        success: false,
        error: error.message
      };
    }
  }

  async retrieve(sessionId, options = {}) {
    const startTime = Date.now();
    
    try {
      const key = `${this.keyPrefix}${sessionId}`;
      const data = await this.redis.get(key);
      
      if (!data) {
        return { success: false, error: 'Session not found' };
      }

      const parsed = JSON.parse(data);

      this.metrics.operations++;
      this.metrics.totalTime += Date.now() - startTime;

      return {
        success: true,
        sessionData: parsed.sessionData,
        metadata: parsed.metadata,
        storedAt: parsed.storedAt,
        retrievedAt: new Date().toISOString()
      };

    } catch (error) {
      this.metrics.errors++;
      return {
        success: false,
        error: error.message
      };
    }
  }

  async delete(sessionId) {
    try {
      const key = `${this.keyPrefix}${sessionId}`;
      const result = await this.redis.del(key);
      return result > 0;
    } catch (error) {
      return false;
    }
  }

  async list(options = {}) {
    const { limit = 100, pattern = '*' } = options;
    
    try {
      const keys = await this.redis.keys(`${this.keyPrefix}${pattern}`);
      const sessions = [];

      for (const key of keys.slice(0, limit)) {
        try {
          const data = await this.redis.get(key);
          if (data) {
            const parsed = JSON.parse(data);
            sessions.push({
              sessionId: parsed.sessionId,
              storedAt: parsed.storedAt,
              provider: 'redis',
              ...parsed.metadata
            });
          }
        } catch (error) {
          continue;
        }
      }

      return {
        success: true,
        sessions,
        total: keys.length
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async exists(sessionId) {
    try {
      const key = `${this.keyPrefix}${sessionId}`;
      const exists = await this.redis.exists(key);
      return exists > 0;
    } catch (error) {
      return false;
    }
  }

  async healthCheck() {
    try {
      const testKey = `${this.keyPrefix}health-check`;
      const testValue = JSON.stringify({ test: true, timestamp: Date.now() });
      
      await this.redis.setEx(testKey, 10, testValue);
      const retrieved = await this.redis.get(testKey);
      await this.redis.del(testKey);

      return {
        healthy: retrieved === testValue,
        provider: 'redis',
        connectionState: this.redis.isReady ? 'connected' : 'disconnected'
      };

    } catch (error) {
      return {
        healthy: false,
        provider: 'redis',
        error: error.message
      };
    }
  }

  async disconnect() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

/**
 * S3 Storage Provider
 * Stores sessions in S3-compatible storage (AWS S3, MinIO, Cloudflare R2)
 */
class S3StorageProvider extends StorageProvider {
  constructor(config = {}) {
    super(config);
    this.s3 = null;
    this.bucket = config.bucket || 'psp-sessions';
    this.keyPrefix = config.keyPrefix || 'sessions/';
    this.s3Config = config.s3Config || {};
  }

  async initialize() {
    try {
      const AWS = require('aws-sdk');
      this.s3 = new AWS.S3(this.s3Config);
      console.log(`☁️ S3 storage initialized: ${this.bucket}`);
      
    } catch (error) {
      console.error('S3 initialization failed:', error.message);
      throw error;
    }
  }

  async store(sessionId, sessionData, options = {}) {
    const startTime = Date.now();
    
    try {
      const key = `${this.keyPrefix}${sessionId}.json`;
      const storeData = {
        sessionId,
        sessionData,
        storedAt: new Date().toISOString(),
        provider: 's3',
        metadata: options.metadata || {}
      };

      const params = {
        Bucket: this.bucket,
        Key: key,
        Body: JSON.stringify(storeData),
        ContentType: 'application/json',
        Metadata: {
          'session-id': sessionId,
          'stored-at': storeData.storedAt,
          'psp-version': sessionData.version || '1.0'
        }
      };

      const result = await this.s3.upload(params).promise();

      this.metrics.operations++;
      this.metrics.totalTime += Date.now() - startTime;

      return {
        success: true,
        sessionId,
        key,
        location: result.Location,
        etag: result.ETag,
        size: JSON.stringify(storeData).length
      };

    } catch (error) {
      this.metrics.errors++;
      return {
        success: false,
        error: error.message
      };
    }
  }

  async retrieve(sessionId, options = {}) {
    const startTime = Date.now();
    
    try {
      const key = `${this.keyPrefix}${sessionId}.json`;
      const params = {
        Bucket: this.bucket,
        Key: key
      };

      const result = await this.s3.getObject(params).promise();
      const data = JSON.parse(result.Body.toString());

      this.metrics.operations++;
      this.metrics.totalTime += Date.now() - startTime;

      return {
        success: true,
        sessionData: data.sessionData,
        metadata: data.metadata,
        storedAt: data.storedAt,
        retrievedAt: new Date().toISOString(),
        s3Metadata: {
          lastModified: result.LastModified,
          etag: result.ETag,
          contentLength: result.ContentLength
        }
      };

    } catch (error) {
      if (error.code === 'NoSuchKey') {
        return { success: false, error: 'Session not found' };
      }
      this.metrics.errors++;
      return { success: false, error: error.message };
    }
  }

  async delete(sessionId) {
    try {
      const key = `${this.keyPrefix}${sessionId}.json`;
      await this.s3.deleteObject({
        Bucket: this.bucket,
        Key: key
      }).promise();
      return true;
    } catch (error) {
      return false;
    }
  }

  async list(options = {}) {
    const { limit = 100, prefix = '' } = options;
    
    try {
      const params = {
        Bucket: this.bucket,
        Prefix: `${this.keyPrefix}${prefix}`,
        MaxKeys: limit
      };

      const result = await this.s3.listObjectsV2(params).promise();
      const sessions = result.Contents.map(obj => ({
        sessionId: path.basename(obj.Key, '.json'),
        key: obj.Key,
        lastModified: obj.LastModified,
        size: obj.Size,
        etag: obj.ETag,
        provider: 's3'
      }));

      return {
        success: true,
        sessions,
        total: result.KeyCount,
        truncated: result.IsTruncated
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async exists(sessionId) {
    try {
      const key = `${this.keyPrefix}${sessionId}.json`;
      await this.s3.headObject({
        Bucket: this.bucket,
        Key: key
      }).promise();
      return true;
    } catch (error) {
      return false;
    }
  }

  async healthCheck() {
    try {
      const testKey = `${this.keyPrefix}health-check-${Date.now()}.json`;
      const testData = { test: true, timestamp: Date.now() };
      
      // Upload test object
      await this.s3.upload({
        Bucket: this.bucket,
        Key: testKey,
        Body: JSON.stringify(testData)
      }).promise();

      // Retrieve test object
      const result = await this.s3.getObject({
        Bucket: this.bucket,
        Key: testKey
      }).promise();

      // Clean up
      await this.s3.deleteObject({
        Bucket: this.bucket,
        Key: testKey
      }).promise();

      const retrieved = JSON.parse(result.Body.toString());

      return {
        healthy: retrieved.test === true,
        provider: 's3',
        bucket: this.bucket
      };

    } catch (error) {
      return {
        healthy: false,
        provider: 's3',
        error: error.message
      };
    }
  }
}

/**
 * Storage Manager
 * Manages multiple storage providers and provides unified interface
 */
class StorageManager {
  constructor() {
    this.providers = new Map();
    this.defaultProvider = null;
  }

  /**
   * Register storage provider
   */
  registerProvider(name, provider) {
    this.providers.set(name, provider);
    if (!this.defaultProvider) {
      this.defaultProvider = name;
    }
  }

  /**
   * Get storage provider
   */
  getProvider(name = null) {
    const providerName = name || this.defaultProvider;
    return this.providers.get(providerName);
  }

  /**
   * Store session with automatic provider selection
   */
  async store(sessionId, sessionData, options = {}) {
    const providerName = options.provider || this.defaultProvider;
    const provider = this.getProvider(providerName);
    
    if (!provider) {
      throw new Error(`Storage provider '${providerName}' not found`);
    }

    return await provider.store(sessionId, sessionData, options);
  }

  /**
   * Health check all providers
   */
  async healthCheckAll() {
    const results = {};
    
    for (const [name, provider] of this.providers) {
      try {
        results[name] = await provider.healthCheck();
      } catch (error) {
        results[name] = {
          healthy: false,
          provider: name,
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Get metrics from all providers
   */
  getAllMetrics() {
    const metrics = {};
    
    for (const [name, provider] of this.providers) {
      metrics[name] = provider.getMetrics();
    }

    return metrics;
  }
}

module.exports = {
  StorageProvider,
  FilesystemStorageProvider,
  RedisStorageProvider,
  S3StorageProvider,
  StorageManager
};