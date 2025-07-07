/**
 * S3 Storage Backend for PSP
 * 
 * Implements PSP storage using AWS S3 or S3-compatible storage.
 * Provides scalable cloud storage for browser sessions.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { StorageBackend, PSPSessionMetadata } from '../types';

export interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  endpoint?: string;
}

export class S3StorageBackend implements StorageBackend {
  private s3Client: S3Client;
  private bucket: string;

  constructor(config: S3Config) {
    this.bucket = config.bucket;
    
    this.s3Client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });
  }

  /**
   * Upload session data to S3
   */
  async upload(sessionId: string, data: Buffer, metadata: PSPSessionMetadata): Promise<void> {
    try {
      console.log(`☁️  Uploading session ${sessionId} to S3...`);
      
      // Upload session data
      const dataKey = `sessions/${sessionId}/data.psp`;
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucket,
          Key: dataKey,
          Body: data,
          ContentType: 'application/octet-stream',
          Metadata: {
            'psp-session-id': sessionId,
            'psp-session-name': metadata.name,
            'psp-capture-type': metadata.captureType,
            'psp-platform': metadata.platform,
            'psp-version': metadata.version,
            'psp-created-at': metadata.createdAt.toString(),
            'psp-updated-at': metadata.updatedAt.toString()
          }
        }
      });

      await upload.done();

      // Upload metadata separately
      const metadataKey = `sessions/${sessionId}/metadata.json`;
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: metadataKey,
        Body: JSON.stringify(metadata, null, 2),
        ContentType: 'application/json'
      }));

      console.log(`✅ Session ${sessionId} uploaded to S3`);
    } catch (error) {
      console.error(`❌ Failed to upload session ${sessionId}:`, error);
      throw new Error(`Failed to upload to S3: ${error.message}`);
    }
  }

  /**
   * Download session data from S3
   */
  async download(sessionId: string): Promise<{ data: Buffer; metadata: PSPSessionMetadata }> {
    try {
      console.log(`☁️  Downloading session ${sessionId} from S3...`);

      // Download metadata first
      const metadataKey = `sessions/${sessionId}/metadata.json`;
      const metadataResponse = await this.s3Client.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: metadataKey
      }));

      if (!metadataResponse.Body) {
        throw new Error('No metadata found');
      }

      const metadataContent = await this.streamToBuffer(metadataResponse.Body as any);
      const metadata: PSPSessionMetadata = JSON.parse(metadataContent.toString());

      // Download session data
      const dataKey = `sessions/${sessionId}/data.psp`;
      const dataResponse = await this.s3Client.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: dataKey
      }));

      if (!dataResponse.Body) {
        throw new Error('No session data found');
      }

      const data = await this.streamToBuffer(dataResponse.Body as any);

      console.log(`✅ Session ${sessionId} downloaded from S3`);
      return { data, metadata };
    } catch (error) {
      console.error(`❌ Failed to download session ${sessionId}:`, error);
      throw new Error(`Failed to download from S3: ${error.message}`);
    }
  }

  /**
   * List all sessions in S3
   */
  async list(): Promise<PSPSessionMetadata[]> {
    try {
      console.log('📋 Listing sessions from S3...');

      const sessions: PSPSessionMetadata[] = [];
      let continuationToken: string | undefined;

      do {
        const response = await this.s3Client.send(new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: 'sessions/',
          Delimiter: '/',
          ContinuationToken: continuationToken
        }));

        if (response.CommonPrefixes) {
          for (const prefix of response.CommonPrefixes) {
            if (prefix.Prefix) {
              const sessionId = prefix.Prefix.split('/')[1];
              try {
                const metadataKey = `sessions/${sessionId}/metadata.json`;
                const metadataResponse = await this.s3Client.send(new GetObjectCommand({
                  Bucket: this.bucket,
                  Key: metadataKey
                }));

                if (metadataResponse.Body) {
                  const metadataContent = await this.streamToBuffer(metadataResponse.Body as any);
                  const metadata: PSPSessionMetadata = JSON.parse(metadataContent.toString());
                  sessions.push(metadata);
                }
              } catch (error) {
                console.warn(`Failed to load metadata for session ${sessionId}:`, error);
              }
            }
          }
        }

        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      console.log(`✅ Found ${sessions.length} sessions in S3`);
      return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      console.error('❌ Failed to list sessions:', error);
      throw new Error(`Failed to list from S3: ${error.message}`);
    }
  }

  /**
   * Delete session from S3
   */
  async delete(sessionId: string): Promise<void> {
    try {
      console.log(`🗑️  Deleting session ${sessionId} from S3...`);

      const dataKey = `sessions/${sessionId}/data.psp`;
      const metadataKey = `sessions/${sessionId}/metadata.json`;

      await Promise.all([
        this.s3Client.send(new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: dataKey
        })),
        this.s3Client.send(new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: metadataKey
        }))
      ]);

      console.log(`✅ Session ${sessionId} deleted from S3`);
    } catch (error) {
      console.error(`❌ Failed to delete session ${sessionId}:`, error);
      throw new Error(`Failed to delete from S3: ${error.message}`);
    }
  }

  /**
   * Check if session exists in S3
   */
  async exists(sessionId: string): Promise<boolean> {
    try {
      const metadataKey = `sessions/${sessionId}/metadata.json`;
      await this.s3Client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: metadataKey
      }));
      return true;
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Convert stream to buffer
   */
  private async streamToBuffer(stream: any): Promise<Buffer> {
    const chunks: Buffer[] = [];
    
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
}
