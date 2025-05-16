import { StorageProvider } from './provider';
import { StoredSession, SessionMetadata, SessionFilter } from '../types';

/**
 * Supported cloud storage providers
 */
export type CloudProvider = 'aws' | 'gcp' | 'azure';

/**
 * Configuration options for AWS S3 storage
 */
export interface AwsS3Config {
  /**
   * AWS region (e.g., 'us-east-1')
   */
  region: string;
  
  /**
   * S3 bucket name
   */
  bucket: string;
  
  /**
   * Optional prefix for objects in the bucket
   */
  prefix?: string;
  
  /**
   * AWS credentials
   */
  credentials?: {
    /**
     * AWS access key ID
     */
    accessKeyId: string;
    
    /**
     * AWS secret access key
     */
    secretAccessKey: string;
    
    /**
     * Optional session token
     */
    sessionToken?: string;
  };
}

/**
 * Configuration options for Google Cloud Storage
 */
export interface GcpStorageConfig {
  /**
   * GCP project ID
   */
  projectId: string;
  
  /**
   * GCS bucket name
   */
  bucket: string;
  
  /**
   * Optional prefix for objects in the bucket
   */
  prefix?: string;
  
  /**
   * Path to service account key file or key contents as a JSON string
   */
  keyFile?: string;
}

/**
 * Configuration options for Azure Blob Storage
 */
export interface AzureBlobConfig {
  /**
   * Azure storage account name
   */
  accountName: string;
  
  /**
   * Azure storage container name
   */
  containerName: string;
  
  /**
   * Optional prefix for blobs in the container
   */
  prefix?: string;
  
  /**
   * Azure storage connection string or account key
   */
  connectionString?: string;
  accountKey?: string;
}

/**
 * Configuration options for the cloud storage provider
 */
export interface CloudStorageConfig {
  /**
   * Cloud provider to use
   */
  provider: CloudProvider;
  
  /**
   * Provider-specific configuration
   */
  aws?: AwsS3Config;
  gcp?: GcpStorageConfig;
  azure?: AzureBlobConfig;
  
  /**
   * Whether to compress stored data (default: true)
   */
  compress?: boolean;
  
  /**
   * Optional encryption key for data encryption
   */
  encryptionKey?: string;
}

/**
 * Cloud storage provider implementation
 */
export class CloudStorageProvider implements StorageProvider {
  private config: CloudStorageConfig;
  private client: any;
  
  /**
   * Creates a new CloudStorageProvider
   * 
   * @param config Configuration options for the cloud storage provider
   */
  constructor(config: CloudStorageConfig) {
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
  private async initializeClient(): Promise<void> {
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
    } catch (error) {
      throw new Error(`Failed to initialize cloud storage client: ${error}`);
    }
  }
  
  /**
   * Initializes an AWS S3 client
   */
  private async initializeAwsClient(): Promise<void> {
    try {
      // Dynamically import AWS SDK to avoid direct dependency
      const { S3 } = await import('aws-sdk');
      
      const s3Config = this.config.aws;
      if (!s3Config) {
        throw new Error('AWS configuration is required for AWS provider');
      }
      
      this.client = new S3({
        region: s3Config.region,
        credentials: s3Config.credentials
      });
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error('AWS SDK is not installed. Install it with: npm install aws-sdk');
      }
      throw error;
    }
  }
  
  /**
   * Initializes a Google Cloud Storage client
   */
  private async initializeGcpClient(): Promise<void> {
    try {
      // Dynamically import GCP SDK to avoid direct dependency
      const { Storage } = await import('@google-cloud/storage');
      
      const gcpConfig = this.config.gcp;
      if (!gcpConfig) {
        throw new Error('GCP configuration is required for GCP provider');
      }
      
      const options: any = {
        projectId: gcpConfig.projectId
      };
      
      if (gcpConfig.keyFile) {
        options.keyFilename = gcpConfig.keyFile;
      }
      
      this.client = new Storage(options);
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error('Google Cloud Storage SDK is not installed. Install it with: npm install @google-cloud/storage');
      }
      throw error;
    }
  }
  
  /**
   * Initializes an Azure Blob Storage client
   */
  private async initializeAzureClient(): Promise<void> {
    try {
      // Dynamically import Azure SDK to avoid direct dependency
      const { BlobServiceClient } = await import('@azure/storage-blob');
      
      const azureConfig = this.config.azure;
      if (!azureConfig) {
        throw new Error('Azure configuration is required for Azure provider');
      }
      
      if (azureConfig.connectionString) {
        this.client = BlobServiceClient.fromConnectionString(azureConfig.connectionString);
      } else if (azureConfig.accountName && azureConfig.accountKey) {
        this.client = new BlobServiceClient(
          `https://${azureConfig.accountName}.blob.core.windows.net`,
          { credential: azureConfig.accountKey }
        );
      } else {
        throw new Error('Either connectionString or accountName+accountKey is required for Azure provider');
      }
    } catch (error) {
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
  async save(session: StoredSession): Promise<void> {
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
    } catch (error) {
      throw new Error(`Failed to save session to cloud storage: ${error}`);
    }
  }
  
  /**
   * Load a session from cloud storage
   * 
   * @param id The session ID to load
   * @returns The loaded session
   */
  async load(id: string): Promise<StoredSession> {
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
    } catch (error) {
      throw new Error(`Failed to load session from cloud storage: ${error}`);
    }
  }
  
  /**
   * Delete a session from cloud storage
   * 
   * @param id The session ID to delete
   */
  async delete(id: string): Promise<void> {
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
    } catch (error) {
      throw new Error(`Failed to delete session from cloud storage: ${error}`);
    }
  }
  
  /**
   * List sessions from cloud storage
   * 
   * @param filter Optional filter for listing sessions
   * @returns List of session metadata
   */
  async list(filter?: SessionFilter): Promise<SessionMetadata[]> {
    try {
      let metadata: SessionMetadata[];
      
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
          metadata = metadata.filter(m => 
            m.name.toLowerCase().includes(filter.name.toLowerCase())
          );
        }
        
        // Filter by tags (all specified tags must be present)
        if (filter.tags && filter.tags.length > 0) {
          metadata = metadata.filter(m => 
            filter.tags.every(tag => m.tags?.includes(tag))
          );
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
    } catch (error) {
      throw new Error(`Failed to list sessions from cloud storage: ${error}`);
    }
  }
  
  /**
   * Check if a session exists in cloud storage
   * 
   * @param id The session ID to check
   * @returns Whether the session exists
   */
  async exists(id: string): Promise<boolean> {
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
    } catch (error) {
      throw new Error(`Failed to check if session exists in cloud storage: ${error}`);
    }
  }
  
  /**
   * Prepare session data for storage
   * 
   * @param session The session to prepare
   * @returns Prepared session data as a string
   */
  private prepareForStorage(session: StoredSession): string {
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
  private processFromStorage(data: string): StoredSession {
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
  private compress(data: string): string {
    try {
      // In a real implementation, we would use a compression library like zlib
      // For now, this is a placeholder
      return data;
    } catch (error) {
      throw new Error(`Failed to compress data: ${error}`);
    }
  }
  
  /**
   * Decompress a string using gzip
   * 
   * @param data The data to decompress
   * @returns Decompressed data
   */
  private decompress(data: string): string {
    try {
      // In a real implementation, we would use a compression library like zlib
      // For now, this is a placeholder
      return data;
    } catch (error) {
      throw new Error(`Failed to decompress data: ${error}`);
    }
  }
  
  /**
   * Encrypt a string
   * 
   * @param data The data to encrypt
   * @returns Encrypted data
   */
  private encrypt(data: string): string {
    try {
      // In a real implementation, we would use an encryption library
      // For now, this is a placeholder
      return data;
    } catch (error) {
      throw new Error(`Failed to encrypt data: ${error}`);
    }
  }
  
  /**
   * Decrypt a string
   * 
   * @param data The data to decrypt
   * @returns Decrypted data
   */
  private decrypt(data: string): string {
    try {
      // In a real implementation, we would use an encryption library
      // For now, this is a placeholder
      return data;
    } catch (error) {
      throw new Error(`Failed to decrypt data: ${error}`);
    }
  }
  
  /**
   * Serialize state for storage
   * 
   * @param state The state to serialize
   * @returns Serialized state
   */
  private serializeState(state: any): any {
    const serialized: any = { ...state };
    
    // Convert Maps to objects
    if (state.storage?.localStorage instanceof Map) {
      serialized.storage = { ...serialized.storage };
      const localStorage: Record<string, Record<string, string>> = {};
      
      for (const [origin, storage] of state.storage.localStorage.entries()) {
        localStorage[origin] = Object.fromEntries(storage);
      }
      
      serialized.storage.localStorage = localStorage;
    }
    
    if (state.storage?.sessionStorage instanceof Map) {
      serialized.storage = { ...serialized.storage };
      const sessionStorage: Record<string, Record<string, string>> = {};
      
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
  private deserializeState(state: any): any {
    const deserialized: any = { ...state };
    
    // Convert objects back to Maps
    if (state.storage?.localStorage && typeof state.storage.localStorage === 'object') {
      deserialized.storage = { ...deserialized.storage };
      const localStorage = new Map<string, Map<string, string>>();
      
      for (const [origin, storage] of Object.entries(state.storage.localStorage)) {
        localStorage.set(origin, new Map(Object.entries(storage as Record<string, string>)));
      }
      
      deserialized.storage.localStorage = localStorage;
    }
    
    if (state.storage?.sessionStorage && typeof state.storage.sessionStorage === 'object') {
      deserialized.storage = { ...deserialized.storage };
      const sessionStorage = new Map<string, Map<string, string>>();
      
      for (const [origin, storage] of Object.entries(state.storage.sessionStorage)) {
        sessionStorage.set(origin, new Map(Object.entries(storage as Record<string, string>)));
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
  private async saveToAws(id: string, data: string): Promise<void> {
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
  private async saveMetadataToAws(metadata: SessionMetadata): Promise<void> {
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
  private async loadFromAws(id: string): Promise<string> {
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
  private async deleteFromAws(id: string): Promise<void> {
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
  private async deleteMetadataFromAws(id: string): Promise<void> {
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
  private async listFromAws(): Promise<SessionMetadata[]> {
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
  private async existsInAws(id: string): Promise<boolean> {
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
    } catch (error) {
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
  private async saveToGcp(id: string, data: string): Promise<void> {
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
  private async saveMetadataToGcp(metadata: SessionMetadata): Promise<void> {
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
  private async loadFromGcp(id: string): Promise<string> {
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
  private async deleteFromGcp(id: string): Promise<void> {
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
  private async deleteMetadataFromGcp(id: string): Promise<void> {
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
  private async listFromGcp(): Promise<SessionMetadata[]> {
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
  private async existsInGcp(id: string): Promise<boolean> {
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
  private async saveToAzure(id: string, data: string): Promise<void> {
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
  private async saveMetadataToAzure(metadata: SessionMetadata): Promise<void> {
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
  private async loadFromAzure(id: string): Promise<string> {
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
  private async deleteFromAzure(id: string): Promise<void> {
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
  private async deleteMetadataFromAzure(id: string): Promise<void> {
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
  private async listFromAzure(): Promise<SessionMetadata[]> {
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
  private async existsInAzure(id: string): Promise<boolean> {
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
  private async streamToString(readableStream: NodeJS.ReadableStream): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: any[] = [];
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