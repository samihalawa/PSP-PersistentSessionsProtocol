import { StorageProvider } from './provider';

/**
 * S3 Storage Provider Configuration Options
 */
export interface S3StorageProviderOptions {
  /** Region for the S3 bucket */
  region: string;

  /** S3 bucket name */
  bucket: string;

  /** Optional prefix for all objects (like a folder) */
  prefix?: string;

  /** AWS access key ID */
  accessKeyId?: string;

  /** AWS secret access key */
  secretAccessKey?: string;

  /** Custom endpoint URL for S3-compatible services */
  endpoint?: string;

  /** Whether to use path-style S3 URLs */
  forcePathStyle?: boolean;
}

/**
 * S3 Storage Provider for Persistent Sessions Protocol
 * 
 * Stores session data in an S3 bucket or S3-compatible service
 */
export class S3StorageProvider implements StorageProvider {
  private region: string;
  private bucket: string;
  private prefix: string;
  private accessKeyId?: string;
  private secretAccessKey?: string;
  private endpoint?: string;
  private forcePathStyle: boolean;

  /**
   * Create a new S3 storage provider
   */
  constructor(options: S3StorageProviderOptions) {
    this.region = options.region;
    this.bucket = options.bucket;
    this.prefix = options.prefix || 'psp-sessions/';
    this.accessKeyId = options.accessKeyId;
    this.secretAccessKey = options.secretAccessKey;
    this.endpoint = options.endpoint;
    this.forcePathStyle = options.forcePathStyle || false;

    // Ensure prefix ends with a slash
    if (!this.prefix.endsWith('/')) {
      this.prefix += '/';
    }
  }

  /**
   * Initialize the S3 client
   */
  private async getS3Client() {
    // Use dynamic import to avoid bundling issues
    const { S3Client } = await import('@aws-sdk/client-s3');
    
    const clientOptions: any = {
      region: this.region
    };

    // Add credentials if provided
    if (this.accessKeyId && this.secretAccessKey) {
      clientOptions.credentials = {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey
      };
    }

    // Add custom endpoint and path style if needed
    if (this.endpoint) {
      clientOptions.endpoint = this.endpoint;
      if (this.forcePathStyle) {
        clientOptions.forcePathStyle = true;
      }
    }

    return new S3Client(clientOptions);
  }

  /**
   * Save session data to S3
   */
  async save(id: string, data: any): Promise<void> {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const s3 = await this.getS3Client();

    const serializedData = JSON.stringify(data);
    const key = `${this.prefix}${id}.json`;

    const params = {
      Bucket: this.bucket,
      Key: key,
      Body: serializedData,
      ContentType: 'application/json'
    };

    try {
      await s3.send(new PutObjectCommand(params));
    } catch (error) {
      console.error('Error saving session to S3:', error);
      throw new Error(`Failed to save session to S3: ${(error as Error).message}`);
    }
  }

  /**
   * Load session data from S3
   */
  async load(id: string): Promise<any> {
    const { GetObjectCommand, NoSuchKey } = await import('@aws-sdk/client-s3');
    const s3 = await this.getS3Client();

    const key = `${this.prefix}${id}.json`;

    try {
      const response = await s3.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      }));

      // Convert stream to string
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }
      const body = Buffer.concat(chunks).toString('utf-8');
      
      return JSON.parse(body);
    } catch (error) {
      if ((error as any).name === 'NoSuchKey') {
        throw new Error(`Session not found: ${id}`);
      }
      throw new Error(`Failed to load session from S3: ${(error as Error).message}`);
    }
  }

  /**
   * Delete session data from S3
   */
  async delete(id: string): Promise<void> {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const s3 = await this.getS3Client();

    const key = `${this.prefix}${id}.json`;

    try {
      await s3.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      }));
    } catch (error) {
      throw new Error(`Failed to delete session from S3: ${(error as Error).message}`);
    }
  }

  /**
   * List available sessions from S3
   */
  async list(filter?: any): Promise<any[]> {
    const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    const s3 = await this.getS3Client();

    try {
      const response = await s3.send(new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: this.prefix
      }));

      const sessions = [];

      // If no objects found, return empty array
      if (!response.Contents) {
        return [];
      }

      // Process objects
      for (const object of response.Contents) {
        if (!object.Key) continue;
        
        // Only process JSON files
        if (!object.Key.endsWith('.json')) continue;
        
        // Extract session ID from key
        const id = object.Key.replace(this.prefix, '').replace('.json', '');
        
        // If we need detailed metadata, load the session
        if (filter?.includeMetadata) {
          try {
            const session = await this.load(id);
            sessions.push({
              id,
              metadata: session.metadata || {}
            });
          } catch (e) {
            console.warn(`Error loading session ${id}:`, e);
          }
        } else {
          sessions.push({ id });
        }
      }

      return sessions;
    } catch (error) {
      throw new Error(`Failed to list sessions from S3: ${(error as Error).message}`);
    }
  }

  /**
   * Check if a session exists in S3
   */
  async exists(id: string): Promise<boolean> {
    const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
    const s3 = await this.getS3Client();

    const key = `${this.prefix}${id}.json`;

    try {
      await s3.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key
      }));
      return true;
    } catch (error) {
      return false;
    }
  }
}