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
export declare class CloudStorageProvider implements StorageProvider {
    private config;
    private client;
    /**
     * Creates a new CloudStorageProvider
     *
     * @param config Configuration options for the cloud storage provider
     */
    constructor(config: CloudStorageConfig);
    /**
     * Initializes the appropriate cloud storage client
     */
    private initializeClient;
    /**
     * Initializes an AWS S3 client
     */
    private initializeAwsClient;
    /**
     * Initializes a Google Cloud Storage client
     */
    private initializeGcpClient;
    /**
     * Initializes an Azure Blob Storage client
     */
    private initializeAzureClient;
    /**
     * Save a session to cloud storage
     *
     * @param session The session to save
     */
    save(session: StoredSession): Promise<void>;
    /**
     * Load a session from cloud storage
     *
     * @param id The session ID to load
     * @returns The loaded session
     */
    load(id: string): Promise<StoredSession>;
    /**
     * Delete a session from cloud storage
     *
     * @param id The session ID to delete
     */
    delete(id: string): Promise<void>;
    /**
     * List sessions from cloud storage
     *
     * @param filter Optional filter for listing sessions
     * @returns List of session metadata
     */
    list(filter?: SessionFilter): Promise<SessionMetadata[]>;
    /**
     * Check if a session exists in cloud storage
     *
     * @param id The session ID to check
     * @returns Whether the session exists
     */
    exists(id: string): Promise<boolean>;
    /**
     * Prepare session data for storage
     *
     * @param session The session to prepare
     * @returns Prepared session data as a string
     */
    private prepareForStorage;
    /**
     * Process session data from storage
     *
     * @param data The session data as a string
     * @returns The processed session
     */
    private processFromStorage;
    /**
     * Compress a string using gzip
     *
     * @param data The data to compress
     * @returns Compressed data
     */
    private compress;
    /**
     * Decompress a string using gzip
     *
     * @param data The data to decompress
     * @returns Decompressed data
     */
    private decompress;
    /**
     * Encrypt a string
     *
     * @param data The data to encrypt
     * @returns Encrypted data
     */
    private encrypt;
    /**
     * Decrypt a string
     *
     * @param data The data to decrypt
     * @returns Decrypted data
     */
    private decrypt;
    /**
     * Serialize state for storage
     *
     * @param state The state to serialize
     * @returns Serialized state
     */
    private serializeState;
    /**
     * Deserialize state from storage
     *
     * @param state The state to deserialize
     * @returns Deserialized state
     */
    private deserializeState;
    /**
     * Save a session to AWS S3
     *
     * @param id The session ID
     * @param data The session data
     */
    private saveToAws;
    /**
     * Save session metadata to AWS S3
     *
     * @param metadata The session metadata
     */
    private saveMetadataToAws;
    /**
     * Load a session from AWS S3
     *
     * @param id The session ID
     * @returns The session data
     */
    private loadFromAws;
    /**
     * Delete a session from AWS S3
     *
     * @param id The session ID
     */
    private deleteFromAws;
    /**
     * Delete session metadata from AWS S3
     *
     * @param id The session ID
     */
    private deleteMetadataFromAws;
    /**
     * List sessions from AWS S3
     *
     * @returns List of session metadata
     */
    private listFromAws;
    /**
     * Check if a session exists in AWS S3
     *
     * @param id The session ID
     * @returns Whether the session exists
     */
    private existsInAws;
    /**
     * Save a session to Google Cloud Storage
     *
     * @param id The session ID
     * @param data The session data
     */
    private saveToGcp;
    /**
     * Save session metadata to Google Cloud Storage
     *
     * @param metadata The session metadata
     */
    private saveMetadataToGcp;
    /**
     * Load a session from Google Cloud Storage
     *
     * @param id The session ID
     * @returns The session data
     */
    private loadFromGcp;
    /**
     * Delete a session from Google Cloud Storage
     *
     * @param id The session ID
     */
    private deleteFromGcp;
    /**
     * Delete session metadata from Google Cloud Storage
     *
     * @param id The session ID
     */
    private deleteMetadataFromGcp;
    /**
     * List sessions from Google Cloud Storage
     *
     * @returns List of session metadata
     */
    private listFromGcp;
    /**
     * Check if a session exists in Google Cloud Storage
     *
     * @param id The session ID
     * @returns Whether the session exists
     */
    private existsInGcp;
    /**
     * Save a session to Azure Blob Storage
     *
     * @param id The session ID
     * @param data The session data
     */
    private saveToAzure;
    /**
     * Save session metadata to Azure Blob Storage
     *
     * @param metadata The session metadata
     */
    private saveMetadataToAzure;
    /**
     * Load a session from Azure Blob Storage
     *
     * @param id The session ID
     * @returns The session data
     */
    private loadFromAzure;
    /**
     * Delete a session from Azure Blob Storage
     *
     * @param id The session ID
     */
    private deleteFromAzure;
    /**
     * Delete session metadata from Azure Blob Storage
     *
     * @param id The session ID
     */
    private deleteMetadataFromAzure;
    /**
     * List sessions from Azure Blob Storage
     *
     * @returns List of session metadata
     */
    private listFromAzure;
    /**
     * Check if a session exists in Azure Blob Storage
     *
     * @param id The session ID
     * @returns Whether the session exists
     */
    private existsInAzure;
    /**
     * Convert a readable stream to a string
     *
     * @param readableStream The readable stream
     * @returns The string
     */
    private streamToString;
}
