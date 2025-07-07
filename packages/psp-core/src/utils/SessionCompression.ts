/**
 * Session Compression Utilities
 * 
 * Handles compression and decompression of Chrome profile data
 * using various algorithms for optimal storage efficiency.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import * as tar from 'tar';

export class SessionCompression {
  /**
   * Compress a directory or file
   */
  static async compress(
    sourcePath: string,
    targetPath: string,
    algorithm: 'gzip' | 'brotli' | 'lz4' = 'gzip',
    level: number = 6
  ): Promise<void> {
    const isDirectory = fs.statSync(sourcePath).isDirectory();
    
    if (isDirectory) {
      await this.compressDirectory(sourcePath, targetPath, algorithm, level);
    } else {
      await this.compressFile(sourcePath, targetPath, algorithm, level);
    }
  }

  /**
   * Decompress a file to directory or file
   */
  static async decompress(
    sourcePath: string | Buffer,
    targetPath: string
  ): Promise<void> {
    if (Buffer.isBuffer(sourcePath)) {
      await this.decompressBuffer(sourcePath, targetPath);
    } else {
      await this.decompressFile(sourcePath, targetPath);
    }
  }

  /**
   * Compress directory to tar.gz
   */
  private static async compressDirectory(
    sourcePath: string,
    targetPath: string,
    algorithm: string,
    level: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(targetPath);
      let compressionStream;

      switch (algorithm) {
        case 'gzip':
          compressionStream = zlib.createGzip({ level });
          break;
        case 'brotli':
          compressionStream = zlib.createBrotliCompress({
            params: { [zlib.constants.BROTLI_PARAM_QUALITY]: level }
          });
          break;
        default:
          compressionStream = zlib.createGzip({ level });
      }

      const tarStream = tar.create(
        {
          gzip: false, // We handle compression separately
          cwd: path.dirname(sourcePath),
          portable: true
        },
        [path.basename(sourcePath)]
      );

      tarStream
        .pipe(compressionStream)
        .pipe(output)
        .on('error', reject)
        .on('finish', resolve);

      tarStream.on('error', reject);
    });
  }

  /**
   * Compress single file
   */
  private static async compressFile(
    sourcePath: string,
    targetPath: string,
    algorithm: string,
    level: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const input = fs.createReadStream(sourcePath);
      const output = fs.createWriteStream(targetPath);
      let compressionStream;

      switch (algorithm) {
        case 'gzip':
          compressionStream = zlib.createGzip({ level });
          break;
        case 'brotli':
          compressionStream = zlib.createBrotliCompress({
            params: { [zlib.constants.BROTLI_PARAM_QUALITY]: level }
          });
          break;
        default:
          compressionStream = zlib.createGzip({ level });
      }

      input
        .pipe(compressionStream)
        .pipe(output)
        .on('error', reject)
        .on('finish', resolve);

      input.on('error', reject);
    });
  }

  /**
   * Decompress buffer to directory
   */
  private static async decompressBuffer(
    buffer: Buffer,
    targetPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Try different decompression methods
      const tryDecompress = async (decompressor: any) => {
        try {
          const decompressed = await new Promise<Buffer>((res, rej) => {
            decompressor(buffer, (err: any, result: Buffer) => {
              if (err) rej(err);
              else res(result);
            });
          });

          // Extract tar if it's a tar archive
          if (this.isTarBuffer(decompressed)) {
            await this.extractTarBuffer(decompressed, targetPath);
          } else {
            // Write as single file
            fs.writeFileSync(targetPath, decompressed);
          }
          
          resolve();
        } catch (error) {
          reject(error);
        }
      };

      // Try gzip first, then brotli
      tryDecompress(zlib.gunzip).catch(() => {
        tryDecompress(zlib.brotliDecompress).catch(reject);
      });
    });
  }

  /**
   * Decompress file to directory or file
   */
  private static async decompressFile(
    sourcePath: string,
    targetPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const input = fs.createReadStream(sourcePath);
      
      // Try to detect compression type and decompress
      const tryDecompression = (decompressor: any) => {
        const decompressionStream = decompressor();
        const chunks: Buffer[] = [];

        input
          .pipe(decompressionStream)
          .on('data', (chunk: Buffer) => chunks.push(chunk))
          .on('end', async () => {
            try {
              const decompressed = Buffer.concat(chunks);
              
              if (this.isTarBuffer(decompressed)) {
                await this.extractTarBuffer(decompressed, targetPath);
              } else {
                fs.writeFileSync(targetPath, decompressed);
              }
              
              resolve();
            } catch (error) {
              reject(error);
            }
          })
          .on('error', reject);
      };

      // Try gzip first
      tryDecompression(zlib.createGunzip);
    });
  }

  /**
   * Check if buffer contains tar data
   */
  private static isTarBuffer(buffer: Buffer): boolean {
    // Check for tar magic number at offset 257
    if (buffer.length < 262) return false;
    
    const magic = buffer.slice(257, 262).toString();
    return magic === 'ustar' || magic.startsWith('ustar');
  }

  /**
   * Extract tar buffer to directory
   */
  private static async extractTarBuffer(
    buffer: Buffer,
    targetPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.mkdirSync(targetPath, { recursive: true });
      
      tar.extract({
        cwd: targetPath,
        strict: true
      })
      .on('error', reject)
      .on('end', resolve)
      .end(buffer);
    });
  }

  /**
   * Get compression ratio
   */
  static getCompressionRatio(originalSize: number, compressedSize: number): number {
    if (originalSize === 0) return 0;
    return Math.round((1 - compressedSize / originalSize) * 100);
  }

  /**
   * Estimate compression size
   */
  static estimateCompressedSize(
    originalSize: number,
    algorithm: 'gzip' | 'brotli' | 'lz4' = 'gzip'
  ): number {
    // Rough estimates based on typical compression ratios
    const ratios = {
      gzip: 0.3,    // ~70% compression
      brotli: 0.25, // ~75% compression  
      lz4: 0.5      // ~50% compression (faster)
    };

    return Math.round(originalSize * ratios[algorithm]);
  }
}
