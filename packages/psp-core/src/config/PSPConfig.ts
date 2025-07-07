/**
 * PSP Configuration Management
 * 
 * Handles configuration loading from environment variables, config files,
 * and provides sensible defaults for all PSP operations.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { config as dotenvConfig } from 'dotenv';
import { PSPConfig } from '../types';

export class PSPConfigManager {
  private static instance: PSPConfigManager;
  private config: PSPConfig;
  private configPath: string;

  private constructor() {
    this.configPath = this.findConfigFile();
    this.config = this.loadConfig();
  }

  public static getInstance(): PSPConfigManager {
    if (!PSPConfigManager.instance) {
      PSPConfigManager.instance = new PSPConfigManager();
    }
    return PSPConfigManager.instance;
  }

  /**
   * Get the current configuration
   */
  public getConfig(): PSPConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(updates: Partial<PSPConfig>): void {
    this.config = this.mergeConfig(this.config, updates);
    this.saveConfig();
  }

  /**
   * Load configuration from multiple sources
   */
  private loadConfig(): PSPConfig {
    // Load environment variables
    dotenvConfig();

    // Start with default configuration
    let config = this.getDefaultConfig();

    // Load from config file if exists
    if (fs.existsSync(this.configPath)) {
      try {
        const fileConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        config = this.mergeConfig(config, fileConfig);
      } catch (error) {
        console.warn(`Failed to load config file ${this.configPath}:`, error);
      }
    }

    // Override with environment variables
    config = this.loadFromEnvironment(config);

    return config;
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): PSPConfig {
    return {
      storage: {
        backend: 'local',
        local: {
          basePath: path.join(os.homedir(), '.psp')
        }
      },
      compression: {
        enabled: true,
        algorithm: 'gzip',
        level: 6
      },
      encryption: {
        enabled: false,
        algorithm: 'aes-256-gcm'
      },
      sync: {
        autoSync: false,
        conflictResolution: 'latest'
      },
      capture: {
        excludeExtensions: false,
        maxProfileSize: 5 * 1024 * 1024 * 1024 // 5GB
      }
    };
  }

  /**
   * Load configuration from environment variables
   */
  private loadFromEnvironment(config: PSPConfig): PSPConfig {
    const envConfig = { ...config };

    // Storage backend
    if (process.env.PSP_STORAGE_BACKEND) {
      envConfig.storage.backend = process.env.PSP_STORAGE_BACKEND as any;
    }

    // Local storage
    if (process.env.PSP_LOCAL_BASE_PATH) {
      envConfig.storage.local = {
        basePath: process.env.PSP_LOCAL_BASE_PATH
      };
    }

    // S3 configuration
    if (process.env.PSP_S3_ACCESS_KEY_ID) {
      envConfig.storage.s3 = {
        accessKeyId: process.env.PSP_S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.PSP_S3_SECRET_ACCESS_KEY!,
        region: process.env.PSP_S3_REGION || 'us-east-1',
        bucket: process.env.PSP_S3_BUCKET!,
        endpoint: process.env.PSP_S3_ENDPOINT
      };
    }

    // Cloudflare R2 configuration
    if (process.env.PSP_R2_ACCESS_KEY_ID) {
      envConfig.storage.cloudflareR2 = {
        accessKeyId: process.env.PSP_R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.PSP_R2_SECRET_ACCESS_KEY!,
        endpoint: process.env.PSP_R2_ENDPOINT!,
        bucket: process.env.PSP_R2_BUCKET!
      };
    }

    // GitHub configuration
    if (process.env.PSP_GITHUB_TOKEN) {
      envConfig.storage.github = {
        token: process.env.PSP_GITHUB_TOKEN,
        owner: process.env.PSP_GITHUB_OWNER!,
        repo: process.env.PSP_GITHUB_REPO!,
        branch: process.env.PSP_GITHUB_BRANCH || 'main'
      };
    }

    // HuggingFace configuration
    if (process.env.PSP_HF_TOKEN) {
      envConfig.storage.huggingface = {
        token: process.env.PSP_HF_TOKEN,
        space: process.env.PSP_HF_SPACE!
      };
    }

    // Compression settings
    if (process.env.PSP_COMPRESSION_ENABLED) {
      envConfig.compression.enabled = process.env.PSP_COMPRESSION_ENABLED === 'true';
    }
    if (process.env.PSP_COMPRESSION_ALGORITHM) {
      envConfig.compression.algorithm = process.env.PSP_COMPRESSION_ALGORITHM as any;
    }
    if (process.env.PSP_COMPRESSION_LEVEL) {
      envConfig.compression.level = parseInt(process.env.PSP_COMPRESSION_LEVEL);
    }

    // Encryption settings
    if (process.env.PSP_ENCRYPTION_ENABLED) {
      envConfig.encryption.enabled = process.env.PSP_ENCRYPTION_ENABLED === 'true';
    }
    if (process.env.PSP_ENCRYPTION_KEY) {
      envConfig.encryption.key = process.env.PSP_ENCRYPTION_KEY;
    }

    // Sync settings
    if (process.env.PSP_AUTO_SYNC) {
      envConfig.sync.autoSync = process.env.PSP_AUTO_SYNC === 'true';
    }
    if (process.env.PSP_SYNC_INTERVAL) {
      envConfig.sync.syncInterval = parseInt(process.env.PSP_SYNC_INTERVAL);
    }

    // Capture settings
    if (process.env.PSP_EXCLUDE_EXTENSIONS) {
      envConfig.capture.excludeExtensions = process.env.PSP_EXCLUDE_EXTENSIONS === 'true';
    }
    if (process.env.PSP_MAX_PROFILE_SIZE) {
      envConfig.capture.maxProfileSize = parseInt(process.env.PSP_MAX_PROFILE_SIZE);
    }

    return envConfig;
  }

  /**
   * Find configuration file
   */
  private findConfigFile(): string {
    const possiblePaths = [
      path.join(process.cwd(), 'psp.config.json'),
      path.join(process.cwd(), '.psprc'),
      path.join(os.homedir(), '.psp', 'config.json'),
      path.join(os.homedir(), '.psprc')
    ];

    for (const configPath of possiblePaths) {
      if (fs.existsSync(configPath)) {
        return configPath;
      }
    }

    // Default to user config directory
    return path.join(os.homedir(), '.psp', 'config.json');
  }

  /**
   * Save current configuration to file
   */
  private saveConfig(): void {
    try {
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.warn(`Failed to save config to ${this.configPath}:`, error);
    }
  }

  /**
   * Deep merge configuration objects
   */
  private mergeConfig(base: PSPConfig, override: Partial<PSPConfig>): PSPConfig {
    const result = { ...base };

    for (const key in override) {
      if (override[key] !== undefined) {
        if (typeof override[key] === 'object' && !Array.isArray(override[key])) {
          result[key] = { ...result[key], ...override[key] };
        } else {
          result[key] = override[key];
        }
      }
    }

    return result;
  }

  /**
   * Validate configuration
   */
  public validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate storage backend configuration
    switch (this.config.storage.backend) {
      case 's3':
        if (!this.config.storage.s3?.accessKeyId) {
          errors.push('S3 access key ID is required');
        }
        if (!this.config.storage.s3?.secretAccessKey) {
          errors.push('S3 secret access key is required');
        }
        if (!this.config.storage.s3?.bucket) {
          errors.push('S3 bucket name is required');
        }
        break;

      case 'cloudflare-r2':
        if (!this.config.storage.cloudflareR2?.accessKeyId) {
          errors.push('Cloudflare R2 access key ID is required');
        }
        if (!this.config.storage.cloudflareR2?.secretAccessKey) {
          errors.push('Cloudflare R2 secret access key is required');
        }
        if (!this.config.storage.cloudflareR2?.endpoint) {
          errors.push('Cloudflare R2 endpoint is required');
        }
        if (!this.config.storage.cloudflareR2?.bucket) {
          errors.push('Cloudflare R2 bucket name is required');
        }
        break;

      case 'github':
        if (!this.config.storage.github?.token) {
          errors.push('GitHub token is required');
        }
        if (!this.config.storage.github?.owner) {
          errors.push('GitHub owner is required');
        }
        if (!this.config.storage.github?.repo) {
          errors.push('GitHub repository is required');
        }
        break;

      case 'huggingface':
        if (!this.config.storage.huggingface?.token) {
          errors.push('HuggingFace token is required');
        }
        if (!this.config.storage.huggingface?.space) {
          errors.push('HuggingFace space is required');
        }
        break;
    }

    // Validate encryption
    if (this.config.encryption.enabled && !this.config.encryption.key) {
      errors.push('Encryption key is required when encryption is enabled');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Create example configuration file
   */
  public createExampleConfig(filePath?: string): void {
    const exampleConfig: PSPConfig = {
      storage: {
        backend: 'local',
        local: {
          basePath: path.join(os.homedir(), '.psp')
        },
        s3: {
          accessKeyId: 'YOUR_S3_ACCESS_KEY_ID',
          secretAccessKey: 'YOUR_S3_SECRET_ACCESS_KEY',
          region: 'us-east-1',
          bucket: 'your-psp-bucket'
        },
        cloudflareR2: {
          accessKeyId: 'YOUR_R2_ACCESS_KEY_ID',
          secretAccessKey: 'YOUR_R2_SECRET_ACCESS_KEY',
          endpoint: 'https://your-account-id.r2.cloudflarestorage.com',
          bucket: 'your-psp-bucket'
        }
      },
      compression: {
        enabled: true,
        algorithm: 'gzip',
        level: 6
      },
      encryption: {
        enabled: false,
        algorithm: 'aes-256-gcm',
        key: 'your-encryption-key-here'
      },
      sync: {
        autoSync: false,
        syncInterval: 300000, // 5 minutes
        conflictResolution: 'latest'
      },
      capture: {
        excludeExtensions: false,
        excludedExtensionIds: ['extension-id-1', 'extension-id-2'],
        includeDomains: ['gmail.com', 'github.com'],
        maxProfileSize: 5368709120 // 5GB
      }
    };

    const targetPath = filePath || path.join(process.cwd(), 'psp.config.example.json');
    fs.writeFileSync(targetPath, JSON.stringify(exampleConfig, null, 2));
    console.log(`Example configuration created at: ${targetPath}`);
  }
}

// Export singleton instance
export const PSPConfig = PSPConfigManager.getInstance();
