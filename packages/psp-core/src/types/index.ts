/**
 * PSP Core Types
 */

export interface PSPSessionMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  captureType: 'complete_chrome_state' | 'selective_capture' | 'minimal_session';
  platform: string;
  version: string;
  tags?: string[];
  captureInfo: {
    sourceSize: number;
    targetSize: number;
    compressedSize?: number;
    encryptedSize?: number;
    copyTimeMs: number;
    chromeProcesses: number;
    profileAnalysis: ProfileAnalysis;
    captureMethod: string;
    excludedExtensions?: string[];
    includedDomains?: string[];
  };
}

export interface ProfileAnalysis {
  profiles: ProfileInfo[];
  totalFiles: number;
  keyComponents: KeyComponents;
}

export interface ProfileInfo {
  name: string;
  path: string;
  size: number;
  components: Record<string, ComponentInfo>;
}

export interface ComponentInfo {
  exists: boolean;
  size: number;
  type: 'file' | 'directory';
}

export interface KeyComponents {
  extensions?: {
    count: number;
    totalSize: number;
  };
  bookmarks?: {
    exists: boolean;
    size: number;
    readable?: boolean;
  };
  history?: {
    exists: boolean;
    size: number;
  };
  preferences?: {
    exists: boolean;
    size: number;
    readable?: boolean;
  };
}

export interface PSPConfig {
  storage: {
    backend: 'local' | 's3' | 'cloudflare-r2' | 'github' | 'huggingface';
    local?: {
      basePath: string;
    };
    s3?: {
      accessKeyId: string;
      secretAccessKey: string;
      region: string;
      bucket: string;
      endpoint?: string;
    };
    cloudflareR2?: {
      accessKeyId: string;
      secretAccessKey: string;
      endpoint: string;
      bucket: string;
    };
    github?: {
      token: string;
      owner: string;
      repo: string;
      branch?: string;
    };
    huggingface?: {
      token: string;
      space: string;
    };
  };
  compression: {
    enabled: boolean;
    algorithm: 'gzip' | 'brotli' | 'lz4';
    level?: number;
  };
  encryption: {
    enabled: boolean;
    algorithm: 'aes-256-gcm' | 'chacha20-poly1305';
    key?: string;
  };
  sync: {
    autoSync: boolean;
    syncInterval?: number;
    conflictResolution: 'latest' | 'manual' | 'merge';
  };
  capture: {
    excludeExtensions: boolean;
    excludedExtensionIds?: string[];
    includeDomains?: string[];
    excludeDomains?: string[];
    maxProfileSize?: number;
  };
}

export interface StorageBackend {
  upload(sessionId: string, data: Buffer, metadata: PSPSessionMetadata): Promise<void>;
  download(sessionId: string): Promise<{ data: Buffer; metadata: PSPSessionMetadata }>;
  list(): Promise<PSPSessionMetadata[]>;
  delete(sessionId: string): Promise<void>;
  exists(sessionId: string): Promise<boolean>;
}

export interface BrowserAdapter {
  captureSession(options: CaptureOptions): Promise<PSPSession>;
  restoreSession(session: PSPSession, options: RestoreOptions): Promise<void>;
  launchWithSession(sessionId: string, options: LaunchOptions): Promise<any>;
}

export interface CaptureOptions {
  sessionName: string;
  description?: string;
  excludeExtensions?: boolean;
  excludedExtensionIds?: string[];
  includeDomains?: string[];
  excludeDomains?: string[];
  maxSize?: number;
}

export interface RestoreOptions {
  headless?: boolean;
  viewport?: { width: number; height: number };
  userAgent?: string;
  locale?: string;
}

export interface LaunchOptions extends RestoreOptions {
  waitForLoad?: boolean;
  timeout?: number;
}

export interface PSPSession {
  metadata: PSPSessionMetadata;
  profilePath: string;
  isCompressed: boolean;
  isEncrypted: boolean;
  
  // Methods
  compress(): Promise<void>;
  decompress(): Promise<void>;
  encrypt(key?: string): Promise<void>;
  decrypt(key?: string): Promise<void>;
  upload(): Promise<void>;
  download(): Promise<void>;
  clone(newName: string): Promise<PSPSession>;
  delete(): Promise<void>;
}

export interface SyncResult {
  success: boolean;
  sessionId: string;
  action: 'upload' | 'download' | 'conflict';
  message: string;
  conflictData?: {
    local: PSPSessionMetadata;
    remote: PSPSessionMetadata;
  };
}

export interface PSPClientOptions {
  config?: Partial<PSPConfig>;
  configPath?: string;
  autoLoadConfig?: boolean;
}
