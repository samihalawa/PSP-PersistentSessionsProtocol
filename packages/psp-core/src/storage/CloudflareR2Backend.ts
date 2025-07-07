/**
 * Cloudflare R2 Storage Backend for PSP
 * 
 * Implements PSP storage using Cloudflare R2 (S3-compatible) object storage.
 * Provides secure, scalable cloud storage for browser sessions.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { StorageBackend, PSPSessionMetadata } from '../types';

export interface CloudflareR2Config {
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  bucket: string;
}

export class CloudflareR2Backend implements StorageBackend {
  private s3Client: S3Client;
  private bucket: string;

  constructor(config: CloudflareR2Config) {
    this.bucket = config.bucket;
    
    this.s3Client = new S3Client({
      region: 'auto', // Cloudflare R2 uses 'auto' region
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      },
      forcePathStyle: true // Required for R2
    });
  }

  /**
   * Upload session data to Cloudflare R2
   */
  async upload(sessionId: string, data: Buffer, metadata: PSPSessionMetadata): Promise<void> {
    try {
      console.log(`☁️  Uploading session ${sessionId} to Cloudflare R2...`);
      
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

      // Upload metadata separately for easy querying
      const metadataKey = `sessions/${sessionId}/metadata.json`;
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: metadataKey,
        Body: JSON.stringify(metadata, null, 2),
        ContentType: 'application/json'
      }));

      console.log(`✅ Session ${sessionId} uploaded to Cloudflare R2`);
    } catch (error) {
      console.error(`❌ Failed to upload session ${sessionId}:`, error);
      throw new Error(`Failed to upload to Cloudflare R2: ${error.message}`);
    }
  }

  /**
   * Download session data from Cloudflare R2
   */
  async download(sessionId: string): Promise<{ data: Buffer; metadata: PSPSessionMetadata }> {
    try {
      console.log(`☁️  Downloading session ${sessionId} from Cloudflare R2...`);

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

      console.log(`✅ Session ${sessionId} downloaded from Cloudflare R2`);
      return { data, metadata };
    } catch (error) {
      console.error(`❌ Failed to download session ${sessionId}:`, error);
      throw new Error(`Failed to download from Cloudflare R2: ${error.message}`);
    }
  }

  /**
   * List all sessions in Cloudflare R2
   */
  async list(): Promise<PSPSessionMetadata[]> {
    try {
      console.log('📋 Listing sessions from Cloudflare R2...');

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
          // Get metadata for each session
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

      console.log(`✅ Found ${sessions.length} sessions in Cloudflare R2`);
      return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      console.error('❌ Failed to list sessions:', error);
      throw new Error(`Failed to list from Cloudflare R2: ${error.message}`);
    }
  }

  /**
   * Delete session from Cloudflare R2
   */
  async delete(sessionId: string): Promise<void> {
    try {
      console.log(`🗑️  Deleting session ${sessionId} from Cloudflare R2...`);

      // Delete both data and metadata
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

      console.log(`✅ Session ${sessionId} deleted from Cloudflare R2`);
    } catch (error) {
      console.error(`❌ Failed to delete session ${sessionId}:`, error);
      throw new Error(`Failed to delete from Cloudflare R2: ${error.message}`);
    }
  }

  /**
   * Check if session exists in Cloudflare R2
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
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    totalSessions: number;
    totalSize: number;
    oldestSession: Date | null;
    newestSession: Date | null;
  }> {
    try {
      const sessions = await this.list();
      let totalSize = 0;

      // Calculate total size by checking each session's data file
      for (const session of sessions) {
        try {
          const dataKey = `sessions/${session.id}/data.psp`;
          const headResponse = await this.s3Client.send(new HeadObjectCommand({
            Bucket: this.bucket,
            Key: dataKey
          }));
          totalSize += headResponse.ContentLength || 0;
        } catch (error) {
          console.warn(`Failed to get size for session ${session.id}:`, error);
        }
      }

      return {
        totalSessions: sessions.length,
        totalSize,
        oldestSession: sessions.length > 0 ? new Date(Math.min(...sessions.map(s => s.createdAt))) : null,
        newestSession: sessions.length > 0 ? new Date(Math.max(...sessions.map(s => s.updatedAt))) : null
      };
    } catch (error) {
      throw new Error(`Failed to get storage stats: ${error.message}`);
    }
  }

  /**
   * Clean up old sessions based on age or count
   */
  async cleanup(options: {
    maxAge?: number; // Maximum age in milliseconds
    maxCount?: number; // Maximum number of sessions to keep
  }): Promise<{ deleted: string[]; kept: string[] }> {
    try {
      const sessions = await this.list();
      const deleted: string[] = [];
      const kept: string[] = [];

      let sessionsToDelete: PSPSessionMetadata[] = [];

      // Filter by age if specified
      if (options.maxAge) {
        const cutoffTime = Date.now() - options.maxAge;
        sessionsToDelete = sessions.filter(s => s.updatedAt < cutoffTime);
      }

      // Filter by count if specified
      if (options.maxCount && sessions.length > options.maxCount) {
        const sortedSessions = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
        const sessionsToKeep = sortedSessions.slice(0, options.maxCount);
        const sessionsToDeleteByCount = sortedSessions.slice(options.maxCount);
        
        // Combine with age-based deletion
        sessionsToDelete = [...new Set([...sessionsToDelete, ...sessionsToDeleteByCount])];
      }

      // Delete sessions
      for (const session of sessionsToDelete) {
        try {
          await this.delete(session.id);
          deleted.push(session.id);
        } catch (error) {
          console.warn(`Failed to delete session ${session.id}:`, error);
          kept.push(session.id);
        }
      }

      // Track kept sessions
      for (const session of sessions) {
        if (!deleted.includes(session.id) && !kept.includes(session.id)) {
          kept.push(session.id);
        }
      }

      console.log(`🧹 Cleanup completed: ${deleted.length} deleted, ${kept.length} kept`);
      return { deleted, kept };
    } catch (error) {
      throw new Error(`Failed to cleanup sessions: ${error.message}`);
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

  /**
   * Test connection to Cloudflare R2
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Try to list objects to test connection
      await this.s3Client.send(new ListObjectsV2Command({
        Bucket: this.bucket,
        MaxKeys: 1
      }));

      return {
        success: true,
        message: 'Successfully connected to Cloudflare R2'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect to Cloudflare R2: ${error.message}`
      };
    }
  }
}
