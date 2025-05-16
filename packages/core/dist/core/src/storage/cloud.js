"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudStorageProvider = void 0;
/**
 * Cloud storage provider implementation
 */
class CloudStorageProvider {
    /**
     * Creates a new CloudStorageProvider
     *
     * @param config Configuration options for the cloud storage provider
     */
    constructor(config) {
        this.config = {
            compress: true,
            ...config
        };
        // Initialize the appropriate client based on the provider
        this.initializeClient();
    }
    /**
     * Initializes the appropriate cloud storage client
     */
    async initializeClient() {
        try {
            switch (this.config.provider) {
                case 'aws':
                    await this.initializeAwsClient();
                    break;
                case 'gcp':
                    await this.initializeGcpClient();
                    break;
                case 'azure':
                    await this.initializeAzureClient();
                    break;
                default:
                    throw new Error(`Unsupported cloud provider: ${this.config.provider}`);
            }
        }
        catch (error) {
            throw new Error(`Failed to initialize cloud storage client: ${error}`);
        }
    }
    /**
     * Initializes an AWS S3 client
     */
    async initializeAwsClient() {
        try {
            // Dynamically import AWS SDK to avoid direct dependency
            const { S3 } = await Promise.resolve().then(() => __importStar(require('aws-sdk')));
            const s3Config = this.config.aws;
            if (!s3Config) {
                throw new Error('AWS configuration is required for AWS provider');
            }
            this.client = new S3({
                region: s3Config.region,
                credentials: s3Config.credentials
            });
        }
        catch (error) {
            if (error.code === 'MODULE_NOT_FOUND') {
                throw new Error('AWS SDK is not installed. Install it with: npm install aws-sdk');
            }
            throw error;
        }
    }
    /**
     * Initializes a Google Cloud Storage client
     */
    async initializeGcpClient() {
        try {
            // Dynamically import GCP SDK to avoid direct dependency
            const { Storage } = await Promise.resolve().then(() => __importStar(require('@google-cloud/storage')));
            const gcpConfig = this.config.gcp;
            if (!gcpConfig) {
                throw new Error('GCP configuration is required for GCP provider');
            }
            const options = {
                projectId: gcpConfig.projectId
            };
            if (gcpConfig.keyFile) {
                options.keyFilename = gcpConfig.keyFile;
            }
            this.client = new Storage(options);
        }
        catch (error) {
            if (error.code === 'MODULE_NOT_FOUND') {
                throw new Error('Google Cloud Storage SDK is not installed. Install it with: npm install @google-cloud/storage');
            }
            throw error;
        }
    }
    /**
     * Initializes an Azure Blob Storage client
     */
    async initializeAzureClient() {
        try {
            // Dynamically import Azure SDK to avoid direct dependency
            const { BlobServiceClient } = await Promise.resolve().then(() => __importStar(require('@azure/storage-blob')));
            const azureConfig = this.config.azure;
            if (!azureConfig) {
                throw new Error('Azure configuration is required for Azure provider');
            }
            if (azureConfig.connectionString) {
                this.client = BlobServiceClient.fromConnectionString(azureConfig.connectionString);
            }
            else if (azureConfig.accountName && azureConfig.accountKey) {
                this.client = new BlobServiceClient(`https://${azureConfig.accountName}.blob.core.windows.net`, { credential: azureConfig.accountKey });
            }
            else {
                throw new Error('Either connectionString or accountName+accountKey is required for Azure provider');
            }
        }
        catch (error) {
            if (error.code === 'MODULE_NOT_FOUND') {
                throw new Error('Azure Storage SDK is not installed. Install it with: npm install @azure/storage-blob');
            }
            throw error;
        }
    }
    /**
     * Save a session to cloud storage
     *
     * @param session The session to save
     */
    async save(session) {
        // Prepare session data for storage
        const data = this.prepareForStorage(session);
        try {
            switch (this.config.provider) {
                case 'aws':
                    await this.saveToAws(session.metadata.id, data);
                    await this.saveMetadataToAws(session.metadata);
                    break;
                case 'gcp':
                    await this.saveToGcp(session.metadata.id, data);
                    await this.saveMetadataToGcp(session.metadata);
                    break;
                case 'azure':
                    await this.saveToAzure(session.metadata.id, data);
                    await this.saveMetadataToAzure(session.metadata);
                    break;
            }
        }
        catch (error) {
            throw new Error(`Failed to save session to cloud storage: ${error}`);
        }
    }
    /**
     * Load a session from cloud storage
     *
     * @param id The session ID to load
     * @returns The loaded session
     */
    async load(id) {
        try {
            let data;
            switch (this.config.provider) {
                case 'aws':
                    data = await this.loadFromAws(id);
                    break;
                case 'gcp':
                    data = await this.loadFromGcp(id);
                    break;
                case 'azure':
                    data = await this.loadFromAzure(id);
                    break;
            }
            return this.processFromStorage(data);
        }
        catch (error) {
            throw new Error(`Failed to load session from cloud storage: ${error}`);
        }
    }
    /**
     * Delete a session from cloud storage
     *
     * @param id The session ID to delete
     */
    async delete(id) {
        try {
            switch (this.config.provider) {
                case 'aws':
                    await this.deleteFromAws(id);
                    await this.deleteMetadataFromAws(id);
                    break;
                case 'gcp':
                    await this.deleteFromGcp(id);
                    await this.deleteMetadataFromGcp(id);
                    break;
                case 'azure':
                    await this.deleteFromAzure(id);
                    await this.deleteMetadataFromAzure(id);
                    break;
            }
        }
        catch (error) {
            throw new Error(`Failed to delete session from cloud storage: ${error}`);
        }
    }
    /**
     * List sessions from cloud storage
     *
     * @param filter Optional filter for listing sessions
     * @returns List of session metadata
     */
    async list(filter) {
        try {
            let metadata;
            switch (this.config.provider) {
                case 'aws':
                    metadata = await this.listFromAws();
                    break;
                case 'gcp':
                    metadata = await this.listFromGcp();
                    break;
                case 'azure':
                    metadata = await this.listFromAzure();
                    break;
                default:
                    throw new Error(`Unsupported cloud provider: ${this.config.provider}`);
            }
            // Apply filters if present
            if (filter) {
                // Filter by name (case-insensitive)
                if (filter.name) {
                    metadata = metadata.filter(m => m.name.toLowerCase().includes(filter.name.toLowerCase()));
                }
                // Filter by tags (all specified tags must be present)
                if (filter.tags && filter.tags.length > 0) {
                    metadata = metadata.filter(m => filter.tags.every(tag => m.tags?.includes(tag)));
                }
                // Sort by update time (newest first)
                metadata.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
                // Apply offset and limit
                if (filter.offset || filter.limit) {
                    const offset = filter.offset || 0;
                    const limit = filter.limit;
                    metadata = metadata.slice(offset, limit ? offset + limit : undefined);
                }
            }
            return metadata;
        }
        catch (error) {
            throw new Error(`Failed to list sessions from cloud storage: ${error}`);
        }
    }
    /**
     * Check if a session exists in cloud storage
     *
     * @param id The session ID to check
     * @returns Whether the session exists
     */
    async exists(id) {
        try {
            switch (this.config.provider) {
                case 'aws':
                    return await this.existsInAws(id);
                case 'gcp':
                    return await this.existsInGcp(id);
                case 'azure':
                    return await this.existsInAzure(id);
                default:
                    throw new Error(`Unsupported cloud provider: ${this.config.provider}`);
            }
        }
        catch (error) {
            throw new Error(`Failed to check if session exists in cloud storage: ${error}`);
        }
    }
    /**
     * Prepare session data for storage
     *
     * @param session The session to prepare
     * @returns Prepared session data as a string
     */
    prepareForStorage(session) {
        // Serialize the state
        const serializedSession = {
            metadata: session.metadata,
            state: this.serializeState(session.state)
        };
        // Convert to JSON
        const jsonData = JSON.stringify(serializedSession);
        // Apply compression if enabled
        if (this.config.compress) {
            return this.compress(jsonData);
        }
        // Apply encryption if enabled
        if (this.config.encryptionKey) {
            return this.encrypt(jsonData);
        }
        return jsonData;
    }
    /**
     * Process session data from storage
     *
     * @param data The session data as a string
     * @returns The processed session
     */
    processFromStorage(data) {
        let jsonData = data;
        // Apply decryption if enabled
        if (this.config.encryptionKey) {
            jsonData = this.decrypt(data);
        }
        // Apply decompression if enabled
        if (this.config.compress) {
            jsonData = this.decompress(data);
        }
        // Parse the JSON
        const sessionData = JSON.parse(jsonData);
        // Deserialize the state
        return {
            metadata: sessionData.metadata,
            state: this.deserializeState(sessionData.state)
        };
    }
    /**
     * Compress a string using gzip
     *
     * @param data The data to compress
     * @returns Compressed data
     */
    compress(data) {
        try {
            // In a real implementation, we would use a compression library like zlib
            // For now, this is a placeholder
            return data;
        }
        catch (error) {
            throw new Error(`Failed to compress data: ${error}`);
        }
    }
    /**
     * Decompress a string using gzip
     *
     * @param data The data to decompress
     * @returns Decompressed data
     */
    decompress(data) {
        try {
            // In a real implementation, we would use a compression library like zlib
            // For now, this is a placeholder
            return data;
        }
        catch (error) {
            throw new Error(`Failed to decompress data: ${error}`);
        }
    }
    /**
     * Encrypt a string
     *
     * @param data The data to encrypt
     * @returns Encrypted data
     */
    encrypt(data) {
        try {
            // In a real implementation, we would use an encryption library
            // For now, this is a placeholder
            return data;
        }
        catch (error) {
            throw new Error(`Failed to encrypt data: ${error}`);
        }
    }
    /**
     * Decrypt a string
     *
     * @param data The data to decrypt
     * @returns Decrypted data
     */
    decrypt(data) {
        try {
            // In a real implementation, we would use an encryption library
            // For now, this is a placeholder
            return data;
        }
        catch (error) {
            throw new Error(`Failed to decrypt data: ${error}`);
        }
    }
    /**
     * Serialize state for storage
     *
     * @param state The state to serialize
     * @returns Serialized state
     */
    serializeState(state) {
        const serialized = { ...state };
        // Convert Maps to objects
        if (state.storage?.localStorage instanceof Map) {
            serialized.storage = { ...serialized.storage };
            const localStorage = {};
            for (const [origin, storage] of state.storage.localStorage.entries()) {
                localStorage[origin] = Object.fromEntries(storage);
            }
            serialized.storage.localStorage = localStorage;
        }
        if (state.storage?.sessionStorage instanceof Map) {
            serialized.storage = { ...serialized.storage };
            const sessionStorage = {};
            for (const [origin, storage] of state.storage.sessionStorage.entries()) {
                sessionStorage[origin] = Object.fromEntries(storage);
            }
            serialized.storage.sessionStorage = sessionStorage;
        }
        return serialized;
    }
    /**
     * Deserialize state from storage
     *
     * @param state The state to deserialize
     * @returns Deserialized state
     */
    deserializeState(state) {
        const deserialized = { ...state };
        // Convert objects back to Maps
        if (state.storage?.localStorage && typeof state.storage.localStorage === 'object') {
            deserialized.storage = { ...deserialized.storage };
            const localStorage = new Map();
            for (const [origin, storage] of Object.entries(state.storage.localStorage)) {
                localStorage.set(origin, new Map(Object.entries(storage)));
            }
            deserialized.storage.localStorage = localStorage;
        }
        if (state.storage?.sessionStorage && typeof state.storage.sessionStorage === 'object') {
            deserialized.storage = { ...deserialized.storage };
            const sessionStorage = new Map();
            for (const [origin, storage] of Object.entries(state.storage.sessionStorage)) {
                sessionStorage.set(origin, new Map(Object.entries(storage)));
            }
            deserialized.storage.sessionStorage = sessionStorage;
        }
        return deserialized;
    }
    // AWS-specific implementations
    /**
     * Save a session to AWS S3
     *
     * @param id The session ID
     * @param data The session data
     */
    async saveToAws(id, data) {
        if (!this.config.aws) {
            throw new Error('AWS configuration is required');
        }
        const { bucket, prefix = 'psp-sessions/' } = this.config.aws;
        const key = `${prefix}${id}.json`;
        await this.client.putObject({
            Bucket: bucket,
            Key: key,
            Body: data,
            ContentType: 'application/json'
        }).promise();
    }
    /**
     * Save session metadata to AWS S3
     *
     * @param metadata The session metadata
     */
    async saveMetadataToAws(metadata) {
        if (!this.config.aws) {
            throw new Error('AWS configuration is required');
        }
        const { bucket, prefix = 'psp-sessions/' } = this.config.aws;
        const key = `${prefix}meta/${metadata.id}.json`;
        await this.client.putObject({
            Bucket: bucket,
            Key: key,
            Body: JSON.stringify(metadata),
            ContentType: 'application/json'
        }).promise();
    }
    /**
     * Load a session from AWS S3
     *
     * @param id The session ID
     * @returns The session data
     */
    async loadFromAws(id) {
        if (!this.config.aws) {
            throw new Error('AWS configuration is required');
        }
        const { bucket, prefix = 'psp-sessions/' } = this.config.aws;
        const key = `${prefix}${id}.json`;
        const response = await this.client.getObject({
            Bucket: bucket,
            Key: key
        }).promise();
        return response.Body.toString();
    }
    /**
     * Delete a session from AWS S3
     *
     * @param id The session ID
     */
    async deleteFromAws(id) {
        if (!this.config.aws) {
            throw new Error('AWS configuration is required');
        }
        const { bucket, prefix = 'psp-sessions/' } = this.config.aws;
        const key = `${prefix}${id}.json`;
        await this.client.deleteObject({
            Bucket: bucket,
            Key: key
        }).promise();
    }
    /**
     * Delete session metadata from AWS S3
     *
     * @param id The session ID
     */
    async deleteMetadataFromAws(id) {
        if (!this.config.aws) {
            throw new Error('AWS configuration is required');
        }
        const { bucket, prefix = 'psp-sessions/' } = this.config.aws;
        const key = `${prefix}meta/${id}.json`;
        await this.client.deleteObject({
            Bucket: bucket,
            Key: key
        }).promise();
    }
    /**
     * List sessions from AWS S3
     *
     * @returns List of session metadata
     */
    async listFromAws() {
        if (!this.config.aws) {
            throw new Error('AWS configuration is required');
        }
        const { bucket, prefix = 'psp-sessions/' } = this.config.aws;
        const metaPrefix = `${prefix}meta/`;
        const response = await this.client.listObjectsV2({
            Bucket: bucket,
            Prefix: metaPrefix
        }).promise();
        if (!response.Contents) {
            return [];
        }
        const metadataPromises = response.Contents.map(async (obj) => {
            const response = await this.client.getObject({
                Bucket: bucket,
                Key: obj.Key
            }).promise();
            return JSON.parse(response.Body.toString());
        });
        return Promise.all(metadataPromises);
    }
    /**
     * Check if a session exists in AWS S3
     *
     * @param id The session ID
     * @returns Whether the session exists
     */
    async existsInAws(id) {
        if (!this.config.aws) {
            throw new Error('AWS configuration is required');
        }
        const { bucket, prefix = 'psp-sessions/' } = this.config.aws;
        const key = `${prefix}${id}.json`;
        try {
            await this.client.headObject({
                Bucket: bucket,
                Key: key
            }).promise();
            return true;
        }
        catch (error) {
            if (error.code === 'NotFound') {
                return false;
            }
            throw error;
        }
    }
    // GCP-specific implementations
    /**
     * Save a session to Google Cloud Storage
     *
     * @param id The session ID
     * @param data The session data
     */
    async saveToGcp(id, data) {
        if (!this.config.gcp) {
            throw new Error('GCP configuration is required');
        }
        const { bucket: bucketName, prefix = 'psp-sessions/' } = this.config.gcp;
        const fileName = `${prefix}${id}.json`;
        const bucket = this.client.bucket(bucketName);
        const file = bucket.file(fileName);
        await file.save(data, {
            contentType: 'application/json',
            metadata: {
                contentType: 'application/json'
            }
        });
    }
    /**
     * Save session metadata to Google Cloud Storage
     *
     * @param metadata The session metadata
     */
    async saveMetadataToGcp(metadata) {
        if (!this.config.gcp) {
            throw new Error('GCP configuration is required');
        }
        const { bucket: bucketName, prefix = 'psp-sessions/' } = this.config.gcp;
        const fileName = `${prefix}meta/${metadata.id}.json`;
        const bucket = this.client.bucket(bucketName);
        const file = bucket.file(fileName);
        await file.save(JSON.stringify(metadata), {
            contentType: 'application/json',
            metadata: {
                contentType: 'application/json'
            }
        });
    }
    /**
     * Load a session from Google Cloud Storage
     *
     * @param id The session ID
     * @returns The session data
     */
    async loadFromGcp(id) {
        if (!this.config.gcp) {
            throw new Error('GCP configuration is required');
        }
        const { bucket: bucketName, prefix = 'psp-sessions/' } = this.config.gcp;
        const fileName = `${prefix}${id}.json`;
        const bucket = this.client.bucket(bucketName);
        const file = bucket.file(fileName);
        const [contents] = await file.download();
        return contents.toString();
    }
    /**
     * Delete a session from Google Cloud Storage
     *
     * @param id The session ID
     */
    async deleteFromGcp(id) {
        if (!this.config.gcp) {
            throw new Error('GCP configuration is required');
        }
        const { bucket: bucketName, prefix = 'psp-sessions/' } = this.config.gcp;
        const fileName = `${prefix}${id}.json`;
        const bucket = this.client.bucket(bucketName);
        const file = bucket.file(fileName);
        await file.delete();
    }
    /**
     * Delete session metadata from Google Cloud Storage
     *
     * @param id The session ID
     */
    async deleteMetadataFromGcp(id) {
        if (!this.config.gcp) {
            throw new Error('GCP configuration is required');
        }
        const { bucket: bucketName, prefix = 'psp-sessions/' } = this.config.gcp;
        const fileName = `${prefix}meta/${id}.json`;
        const bucket = this.client.bucket(bucketName);
        const file = bucket.file(fileName);
        await file.delete();
    }
    /**
     * List sessions from Google Cloud Storage
     *
     * @returns List of session metadata
     */
    async listFromGcp() {
        if (!this.config.gcp) {
            throw new Error('GCP configuration is required');
        }
        const { bucket: bucketName, prefix = 'psp-sessions/' } = this.config.gcp;
        const metaPrefix = `${prefix}meta/`;
        const bucket = this.client.bucket(bucketName);
        const [files] = await bucket.getFiles({ prefix: metaPrefix });
        const metadataPromises = files.map(async (file) => {
            const [contents] = await file.download();
            return JSON.parse(contents.toString());
        });
        return Promise.all(metadataPromises);
    }
    /**
     * Check if a session exists in Google Cloud Storage
     *
     * @param id The session ID
     * @returns Whether the session exists
     */
    async existsInGcp(id) {
        if (!this.config.gcp) {
            throw new Error('GCP configuration is required');
        }
        const { bucket: bucketName, prefix = 'psp-sessions/' } = this.config.gcp;
        const fileName = `${prefix}${id}.json`;
        const bucket = this.client.bucket(bucketName);
        const file = bucket.file(fileName);
        const [exists] = await file.exists();
        return exists;
    }
    // Azure-specific implementations
    /**
     * Save a session to Azure Blob Storage
     *
     * @param id The session ID
     * @param data The session data
     */
    async saveToAzure(id, data) {
        if (!this.config.azure) {
            throw new Error('Azure configuration is required');
        }
        const { containerName, prefix = 'psp-sessions/' } = this.config.azure;
        const blobName = `${prefix}${id}.json`;
        const containerClient = this.client.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.upload(data, data.length, {
            blobHTTPHeaders: {
                blobContentType: 'application/json'
            }
        });
    }
    /**
     * Save session metadata to Azure Blob Storage
     *
     * @param metadata The session metadata
     */
    async saveMetadataToAzure(metadata) {
        if (!this.config.azure) {
            throw new Error('Azure configuration is required');
        }
        const { containerName, prefix = 'psp-sessions/' } = this.config.azure;
        const blobName = `${prefix}meta/${metadata.id}.json`;
        const containerClient = this.client.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        const data = JSON.stringify(metadata);
        await blockBlobClient.upload(data, data.length, {
            blobHTTPHeaders: {
                blobContentType: 'application/json'
            }
        });
    }
    /**
     * Load a session from Azure Blob Storage
     *
     * @param id The session ID
     * @returns The session data
     */
    async loadFromAzure(id) {
        if (!this.config.azure) {
            throw new Error('Azure configuration is required');
        }
        const { containerName, prefix = 'psp-sessions/' } = this.config.azure;
        const blobName = `${prefix}${id}.json`;
        const containerClient = this.client.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        const response = await blockBlobClient.download();
        const data = await this.streamToString(response.readableStreamBody);
        return data;
    }
    /**
     * Delete a session from Azure Blob Storage
     *
     * @param id The session ID
     */
    async deleteFromAzure(id) {
        if (!this.config.azure) {
            throw new Error('Azure configuration is required');
        }
        const { containerName, prefix = 'psp-sessions/' } = this.config.azure;
        const blobName = `${prefix}${id}.json`;
        const containerClient = this.client.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.delete();
    }
    /**
     * Delete session metadata from Azure Blob Storage
     *
     * @param id The session ID
     */
    async deleteMetadataFromAzure(id) {
        if (!this.config.azure) {
            throw new Error('Azure configuration is required');
        }
        const { containerName, prefix = 'psp-sessions/' } = this.config.azure;
        const blobName = `${prefix}meta/${id}.json`;
        const containerClient = this.client.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.delete();
    }
    /**
     * List sessions from Azure Blob Storage
     *
     * @returns List of session metadata
     */
    async listFromAzure() {
        if (!this.config.azure) {
            throw new Error('Azure configuration is required');
        }
        const { containerName, prefix = 'psp-sessions/' } = this.config.azure;
        const metaPrefix = `${prefix}meta/`;
        const containerClient = this.client.getContainerClient(containerName);
        const blobs = containerClient.listBlobsFlat({ prefix: metaPrefix });
        const metadataPromises = [];
        for await (const blob of blobs) {
            const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
            const response = await blockBlobClient.download();
            const data = await this.streamToString(response.readableStreamBody);
            metadataPromises.push(JSON.parse(data));
        }
        return Promise.all(metadataPromises);
    }
    /**
     * Check if a session exists in Azure Blob Storage
     *
     * @param id The session ID
     * @returns Whether the session exists
     */
    async existsInAzure(id) {
        if (!this.config.azure) {
            throw new Error('Azure configuration is required');
        }
        const { containerName, prefix = 'psp-sessions/' } = this.config.azure;
        const blobName = `${prefix}${id}.json`;
        const containerClient = this.client.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        return await blockBlobClient.exists();
    }
    /**
     * Convert a readable stream to a string
     *
     * @param readableStream The readable stream
     * @returns The string
     */
    async streamToString(readableStream) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            readableStream.on('data', (data) => {
                chunks.push(data.toString());
            });
            readableStream.on('end', () => {
                resolve(chunks.join(''));
            });
            readableStream.on('error', reject);
        });
    }
}
exports.CloudStorageProvider = CloudStorageProvider;
