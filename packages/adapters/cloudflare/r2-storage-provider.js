/**
 * Cloudflare R2 Storage Provider for PSP
 * 
 * Optimized provider for Cloudflare R2 object storage with Workers integration,
 * session encryption, and cross-platform compatibility.
 */

import { StorageProvider } from '../../core/src/storage.js';
import zlib from 'zlib';
import { promisify } from 'util';
import crypto from 'crypto';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export class CloudflareR2StorageProvider extends StorageProvider {
    constructor(config = {}) {
        super(config);
        
        // R2 Configuration
        this.r2Bucket = config.r2Bucket || null;
        this.accountId = config.accountId || null;
        this.accessKeyId = config.accessKeyId || null;
        this.secretAccessKey = config.secretAccessKey || null;
        
        // Session organization
        this.keyPrefix = config.keyPrefix || 'psp-sessions/';
        this.bucketName = config.bucketName || 'psp-sessions';
        
        // R2 Client configuration
        this.r2Client = null;
        this.endpoint = config.endpoint || `https://${this.accountId}.r2.cloudflarestorage.com`;
        
        // Advanced features
        this.enableEncryption = config.enableEncryption !== false;
        this.enableVersioning = config.enableVersioning || false;
        this.defaultTTL = config.defaultTTL || 86400; // 24 hours
        this.enableCompression = config.enableCompression !== false;
        this.compressionThreshold = config.compressionThreshold || 1024; // 1KB
        
        // Performance optimization
        this.connectionPool = new Map();
        this.retryConfig = {
            maxRetries: config.maxRetries || 3,
            baseDelay: config.baseDelay || 100
        };
        
        this.initializationPromise = null;
    }

    /**
     * Initialize R2 client
     */
    async initialize() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this._doInitialize();
        return this.initializationPromise;
    }

    async _doInitialize() {
        try {
            // For Workers environment
            if (this.r2Bucket) {
                console.log('🔗 Using Workers R2 binding');
                return;
            }

            // For external environments (Node.js)
            if (!this.accountId || !this.accessKeyId || !this.secretAccessKey) {
                throw new Error('R2 credentials not provided. Need accountId, accessKeyId, and secretAccessKey');
            }

            const { S3Client } = await import('@aws-sdk/client-s3');
            
            this.r2Client = new S3Client({
                region: 'auto',
                endpoint: this.endpoint,
                credentials: {
                    accessKeyId: this.accessKeyId,
                    secretAccessKey: this.secretAccessKey
                },
                forcePathStyle: true
            });

            console.log(`☁️ Cloudflare R2 storage initialized: ${this.bucketName}`);
            
        } catch (error) {
            console.error('R2 initialization failed:', error.message);
            throw error;
        }
    }

    /**
     * Store PSP session in R2
     */
    async store(sessionId, sessionData, options = {}) {
        await this.initialize();
        const startTime = Date.now();
        
        try {
            const key = `${this.keyPrefix}${options.category || 'general'}/${sessionId}.json`;
            const ttl = options.ttl || this.defaultTTL;
            
            const storeData = {
                sessionId,
                sessionData,
                storedAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + (ttl * 1000)).toISOString(),
                provider: 'cloudflare_r2',
                version: '1.0',
                metadata: {
                    platform: 'cloudflare',
                    originalProvider: sessionData.sessionData?.provider || 'unknown',
                    transferType: options.transferType || 'direct',
                    encryption: this.enableEncryption,
                    ...options.metadata
                }
            };

            // Encrypt if enabled
            if (this.enableEncryption && options.encryptionKey) {
                storeData.sessionData = await this._encryptSessionData(
                    storeData.sessionData, 
                    options.encryptionKey
                );
                storeData.encrypted = true;
            }

            let body = JSON.stringify(storeData);
            let contentEncoding = 'identity';
            
            // Compress if enabled and data is large enough
            if (this.enableCompression && body.length > this.compressionThreshold) {
                try {
                    const compressed = await gzip(body);
                    if (compressed.length < body.length * 0.9) { // Only use if significant savings
                        body = compressed;
                        contentEncoding = 'gzip';
                    }
                } catch (error) {
                    console.warn('Compression failed, using uncompressed data:', error.message);
                }
            }
            
            // Store using appropriate method with retry logic
            let result;
            if (this.r2Bucket) {
                // Workers environment
                result = await this._retryOperation(async () => {
                    return await this.r2Bucket.put(key, body, {
                        metadata: {
                            'session-id': sessionId,
                            'stored-at': storeData.storedAt,
                            'expires-at': storeData.expiresAt,
                            'psp-version': '1.0',
                            'provider': storeData.metadata.originalProvider,
                            'transfer-type': storeData.metadata.transferType,
                            'content-encoding': contentEncoding
                        }
                    });
                });
            } else {
                // External environment with AWS SDK
                const { PutObjectCommand } = await import('@aws-sdk/client-s3');
                const command = new PutObjectCommand({
                    Bucket: this.bucketName,
                    Key: key,
                    Body: body,
                    ContentType: contentEncoding === 'gzip' ? 'application/gzip' : 'application/json',
                    ContentEncoding: contentEncoding,
                    Metadata: {
                        'session-id': sessionId,
                        'stored-at': storeData.storedAt,
                        'expires-at': storeData.expiresAt,
                        'psp-version': '1.0',
                        'content-encoding': contentEncoding
                    }
                });
                
                result = await this._retryOperation(async () => {
                    return await this.r2Client.send(command);
                });
            }

            this.metrics.operations++;
            this.metrics.totalTime += Date.now() - startTime;

            return {
                success: true,
                sessionId,
                key,
                location: `r2://${this.bucketName}/${key}`,
                etag: result?.etag || result?.ETag,
                size: body.length,
                expiresAt: storeData.expiresAt,
                metadata: storeData.metadata
            };

        } catch (error) {
            this.metrics.errors++;
            console.error('R2 storage operation failed:', error.message);
            return {
                success: false,
                error: error.message,
                details: error.stack,
                retryable: this._isRetryableError(error)
            };
        }
    }

    /**
     * Retrieve PSP session from R2
     */
    async retrieve(sessionId, options = {}) {
        await this.initialize();
        const startTime = Date.now();
        
        try {
            const category = options.category || 'general';
            const key = `${this.keyPrefix}${category}/${sessionId}.json`;

            let result;
            if (this.r2Bucket) {
                // Workers environment
                result = await this._retryOperation(async () => {
                    return await this.r2Bucket.get(key);
                });
                
                if (!result) {
                    return { success: false, error: 'Session not found' };
                }
                
                let data = await result.text();
                
                // Handle compressed data
                const contentEncoding = result.httpMetadata?.contentEncoding || 
                                      result.metadata?.['content-encoding'];
                
                if (contentEncoding === 'gzip') {
                    try {
                        const buffer = Buffer.from(data, 'base64');
                        const decompressed = await gunzip(buffer);
                        data = decompressed.toString();
                    } catch (error) {
                        console.warn('Failed to decompress data, trying as plain text:', error.message);
                    }
                }
                
                const parsed = JSON.parse(data);

                // Check expiration
                if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
                    await this.r2Bucket.delete(key); // Clean up expired session
                    return { success: false, error: 'Session expired' };
                }

                this.metrics.operations++;
                this.metrics.totalTime += Date.now() - startTime;

                // Decrypt if needed
                let sessionData = parsed.sessionData;
                if (parsed.encrypted && options.encryptionKey) {
                    sessionData = await this._decryptSessionData(sessionData, options.encryptionKey);
                }

                return {
                    success: true,
                    sessionData,
                    metadata: parsed.metadata,
                    storedAt: parsed.storedAt,
                    expiresAt: parsed.expiresAt,
                    retrievedAt: new Date().toISOString(),
                    r2Metadata: {
                        key,
                        size: result.size,
                        lastModified: result.uploaded
                    }
                };

            } else {
                // External environment
                const { GetObjectCommand } = await import('@aws-sdk/client-s3');
                const command = new GetObjectCommand({
                    Bucket: this.bucketName,
                    Key: key
                });

                result = await this.r2Client.send(command);
                const body = await result.Body.transformToString();
                const parsed = JSON.parse(body);

                // Check expiration
                if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
                    await this.delete(sessionId, options);
                    return { success: false, error: 'Session expired' };
                }

                this.metrics.operations++;
                this.metrics.totalTime += Date.now() - startTime;

                return {
                    success: true,
                    sessionData: parsed.sessionData,
                    metadata: parsed.metadata,
                    storedAt: parsed.storedAt,
                    expiresAt: parsed.expiresAt,
                    retrievedAt: new Date().toISOString(),
                    r2Metadata: {
                        key,
                        lastModified: result.LastModified,
                        etag: result.ETag,
                        contentLength: result.ContentLength
                    }
                };
            }

        } catch (error) {
            if (error.name === 'NoSuchKey' || error.message?.includes('not found')) {
                return { success: false, error: 'Session not found' };
            }
            this.metrics.errors++;
            return { 
                success: false, 
                error: error.message,
                details: error.stack 
            };
        }
    }

    /**
     * Delete PSP session from R2
     */
    async delete(sessionId, options = {}) {
        await this.initialize();
        
        try {
            const category = options.category || 'general';
            const key = `${this.keyPrefix}${category}/${sessionId}.json`;

            if (this.r2Bucket) {
                await this.r2Bucket.delete(key);
            } else {
                const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
                const command = new DeleteObjectCommand({
                    Bucket: this.bucketName,
                    Key: key
                });
                await this.r2Client.send(command);
            }

            return true;
        } catch (error) {
            console.warn(`Failed to delete session ${sessionId}:`, error.message);
            return false;
        }
    }

    /**
     * List PSP sessions in R2
     */
    async list(options = {}) {
        await this.initialize();
        
        try {
            const { limit = 100, category = 'general', prefix = '' } = options;
            const listPrefix = `${this.keyPrefix}${category}/${prefix}`;

            let sessions = [];

            if (this.r2Bucket) {
                // Workers environment - list operation
                const objects = await this.r2Bucket.list({ prefix: listPrefix, limit });
                
                sessions = objects.objects?.map(obj => ({
                    sessionId: this._extractSessionIdFromKey(obj.key),
                    key: obj.key,
                    size: obj.size,
                    uploaded: obj.uploaded,
                    provider: 'cloudflare_r2'
                })) || [];

            } else {
                // External environment
                const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
                const command = new ListObjectsV2Command({
                    Bucket: this.bucketName,
                    Prefix: listPrefix,
                    MaxKeys: limit
                });

                const result = await this.r2Client.send(command);
                sessions = result.Contents?.map(obj => ({
                    sessionId: this._extractSessionIdFromKey(obj.Key),
                    key: obj.Key,
                    lastModified: obj.LastModified,
                    size: obj.Size,
                    etag: obj.ETag,
                    provider: 'cloudflare_r2'
                })) || [];
            }

            return {
                success: true,
                sessions,
                total: sessions.length,
                category,
                prefix: listPrefix
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Check if PSP session exists in R2
     */
    async exists(sessionId, options = {}) {
        await this.initialize();
        
        try {
            const category = options.category || 'general';
            const key = `${this.keyPrefix}${category}/${sessionId}.json`;

            if (this.r2Bucket) {
                const result = await this.r2Bucket.head(key);
                return result !== null;
            } else {
                const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
                const command = new HeadObjectCommand({
                    Bucket: this.bucketName,
                    Key: key
                });
                await this.r2Client.send(command);
                return true;
            }

        } catch (error) {
            return false;
        }
    }

    /**
     * Health check for R2 connectivity
     */
    async healthCheck() {
        try {
            await this.initialize();
            const testId = `health-check-${Date.now()}`;
            const testData = { 
                test: true, 
                timestamp: new Date().toISOString(),
                provider: 'cloudflare_r2'
            };
            
            // Store test session
            const storeResult = await this.store(testId, testData, { 
                category: 'health-check',
                ttl: 60 // 1 minute
            });
            
            if (!storeResult.success) {
                return {
                    healthy: false,
                    provider: 'cloudflare_r2',
                    error: 'Failed to store test object'
                };
            }

            // Retrieve test session
            const retrieveResult = await this.retrieve(testId, { 
                category: 'health-check' 
            });
            
            // Clean up
            await this.delete(testId, { category: 'health-check' });

            return {
                healthy: retrieveResult.success && retrieveResult.sessionData.test === true,
                provider: 'cloudflare_r2',
                bucket: this.bucketName,
                endpoint: this.endpoint,
                latency: Date.now() - new Date(testData.timestamp).getTime(),
                features: {
                    encryption: this.enableEncryption,
                    versioning: this.enableVersioning,
                    workersBinding: !!this.r2Bucket
                }
            };

        } catch (error) {
            return {
                healthy: false,
                provider: 'cloudflare_r2',
                error: error.message
            };
        }
    }

    /**
     * Transfer sessions between categories (e.g., local -> cloudflare)
     */
    async transferSession(sessionId, fromCategory, toCategory, options = {}) {
        try {
            // Retrieve from source category
            const retrieveResult = await this.retrieve(sessionId, { 
                category: fromCategory,
                ...options 
            });
            
            if (!retrieveResult.success) {
                return {
                    success: false,
                    error: `Failed to retrieve session from ${fromCategory}: ${retrieveResult.error}`
                };
            }

            // Store in target category
            const storeResult = await this.store(sessionId, retrieveResult.sessionData, {
                category: toCategory,
                metadata: {
                    ...retrieveResult.metadata,
                    transferredFrom: fromCategory,
                    transferredAt: new Date().toISOString()
                },
                ...options
            });

            // Optionally delete from source
            if (storeResult.success && options.deleteSource) {
                await this.delete(sessionId, { category: fromCategory });
            }

            return {
                success: storeResult.success,
                fromCategory,
                toCategory,
                sessionId,
                details: storeResult
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Clean up expired sessions
     */
    async cleanupExpiredSessions(category = 'general') {
        try {
            const sessions = await this.list({ category, limit: 1000 });
            if (!sessions.success) return { cleaned: 0, errors: [] };

            let cleaned = 0;
            const errors = [];

            for (const session of sessions.sessions) {
                try {
                    const retrieveResult = await this.retrieve(session.sessionId, { category });
                    if (!retrieveResult.success && retrieveResult.error === 'Session expired') {
                        cleaned++;
                    }
                } catch (error) {
                    errors.push({ sessionId: session.sessionId, error: error.message });
                }
            }

            return { cleaned, errors, category };

        } catch (error) {
            return { 
                cleaned: 0, 
                errors: [{ error: error.message }], 
                category 
            };
        }
    }

    // Private helper methods

    /**
     * Extract session ID from R2 object key
     */
    _extractSessionIdFromKey(key) {
        const parts = key.split('/');
        const filename = parts[parts.length - 1];
        return filename.replace('.json', '');
    }

    /**
     * Simple encryption for internal use
     */
    async _encryptSessionData(sessionData, encryptionKey) {
        try {
            if (!encryptionKey) {
                return sessionData;
            }
            
            const algorithm = 'aes-256-gcm';
            const key = crypto.scryptSync(encryptionKey, 'psp-salt', 32);
            const iv = crypto.randomBytes(16);
            
            const cipher = crypto.createCipher(algorithm, key);
            cipher.setAAD(Buffer.from('psp-session'));
            
            const encrypted = Buffer.concat([
                cipher.update(JSON.stringify(sessionData), 'utf8'),
                cipher.final()
            ]);
            
            const authTag = cipher.getAuthTag();
            
            return {
                encrypted: true,
                data: Buffer.concat([iv, authTag, encrypted]).toString('base64'),
                algorithm
            };
        } catch (error) {
            console.warn('Encryption failed, storing unencrypted:', error.message);
            return sessionData;
        }
    }

    /**
     * Simple decryption for internal use
     */
    async _decryptSessionData(encryptedData, encryptionKey) {
        try {
            if (!encryptedData.encrypted || !encryptionKey) {
                return encryptedData;
            }
            
            const algorithm = 'aes-256-gcm';
            const key = crypto.scryptSync(encryptionKey, 'psp-salt', 32);
            
            const buffer = Buffer.from(encryptedData.data, 'base64');
            const iv = buffer.slice(0, 16);
            const authTag = buffer.slice(16, 32);
            const encrypted = buffer.slice(32);
            
            const decipher = crypto.createDecipher(algorithm, key);
            decipher.setAAD(Buffer.from('psp-session'));
            decipher.setAuthTag(authTag);
            
            const decrypted = Buffer.concat([
                decipher.update(encrypted),
                decipher.final()
            ]);
            
            return JSON.parse(decrypted.toString('utf8'));
        } catch (error) {
            console.warn('Decryption failed, returning encrypted data:', error.message);
            return encryptedData;
        }
    }

    /**
     * Retry operation with exponential backoff
     */
    async _retryOperation(operation, maxRetries = this.retryConfig.maxRetries) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                
                if (attempt === maxRetries || !this._isRetryableError(error)) {
                    throw error;
                }
                
                const delay = this.retryConfig.baseDelay * Math.pow(2, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw lastError;
    }

    /**
     * Check if error is retryable
     */
    _isRetryableError(error) {
        if (!error) return false;
        
        const retryableErrorCodes = [
            'ECONNRESET',
            'ENOTFOUND',
            'ECONNREFUSED',
            'ETIMEDOUT'
        ];
        
        const retryableStatusCodes = [429, 500, 502, 503, 504];
        
        return retryableErrorCodes.includes(error.code) ||
               retryableStatusCodes.includes(error.statusCode) ||
               error.message?.includes('timeout') ||
               error.message?.includes('connection');
    }

    /**
     * Get storage statistics
     */
    async getStorageStats() {
        try {
            const categories = ['general', 'cloudflare', 'local', 'health-check'];
            const stats = {};

            for (const category of categories) {
                const sessions = await this.list({ category, limit: 1000 });
                stats[category] = {
                    count: sessions.success ? sessions.sessions.length : 0,
                    success: sessions.success
                };
            }

            return {
                success: true,
                categories: stats,
                metrics: this.getMetrics(),
                provider: 'cloudflare_r2',
                performance: {
                    avgOperationTime: this.metrics.totalTime / Math.max(this.metrics.operations, 1),
                    errorRate: this.metrics.errors / Math.max(this.metrics.operations, 1),
                    compressionEnabled: this.enableCompression
                }
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

export default CloudflareR2StorageProvider;