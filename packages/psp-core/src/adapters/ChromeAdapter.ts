/**
 * Chrome Adapter for PSP
 * 
 * Handles Chrome browser session capture and restoration using the
 * complete Chrome profile approach for maximum compatibility.
 */

import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { BrowserAdapter, CaptureOptions, RestoreOptions, LaunchOptions, PSPConfig } from '../types';
import { PSPSession } from '../session/PSPSession';

export class ChromeAdapter implements BrowserAdapter {
  private config: PSPConfig;

  constructor(config: PSPConfig) {
    this.config = config;
  }

  /**
   * Capture a complete Chrome session
   */
  async captureSession(options: CaptureOptions): Promise<PSPSession> {
    console.log(`🚀 Starting Chrome session capture: ${options.sessionName}`);

    const sessionId = uuidv4();
    const captureTime = Date.now();

    // Find current Chrome profile
    const sourceChromeDir = this.findCurrentChromeProfile();
    console.log(`🔍 Found Chrome profile: ${sourceChromeDir}`);

    // Create target directory
    const targetProfileDir = path.join(
      this.config.storage.local?.basePath || path.join(os.homedir(), '.psp'),
      'profiles',
      sessionId
    );

    fs.mkdirSync(targetProfileDir, { recursive: true });

    // Calculate source size
    const sourceSize = this.getDirectorySize(sourceChromeDir);
    console.log(`📊 Source profile size: ${this.formatBytes(sourceSize)}`);

    // Check size limits
    if (options.maxSize && sourceSize > options.maxSize) {
      throw new Error(`Profile size (${this.formatBytes(sourceSize)}) exceeds limit (${this.formatBytes(options.maxSize)})`);
    }

    if (this.config.capture.maxProfileSize && sourceSize > this.config.capture.maxProfileSize) {
      throw new Error(`Profile size (${this.formatBytes(sourceSize)}) exceeds configured limit (${this.formatBytes(this.config.capture.maxProfileSize)})`);
    }

    // Copy Chrome profile
    console.log('🔄 Copying Chrome profile...');
    const startTime = Date.now();

    try {
      if (process.platform === 'win32') {
        execSync(`robocopy "${sourceChromeDir}" "${targetProfileDir}" /E /COPYALL /R:3 /W:1`, { 
          stdio: 'pipe' 
        });
      } else {
        execSync(`rsync -a "${sourceChromeDir}/" "${targetProfileDir}/"`, { 
          stdio: 'pipe' 
        });
      }
    } catch (error) {
      if (!fs.existsSync(targetProfileDir)) {
        throw new Error(`Failed to copy Chrome profile: ${error.message}`);
      }
    }

    const copyTime = Date.now() - startTime;
    const targetSize = this.getDirectorySize(targetProfileDir);

    console.log(`✅ Profile copied in ${Math.round(copyTime / 1000)}s`);
    console.log(`📊 Copied size: ${this.formatBytes(targetSize)}`);

    // Apply exclusions if specified
    if (options.excludeExtensions || this.config.capture.excludeExtensions) {
      await this.excludeExtensions(targetProfileDir, options.excludedExtensionIds);
    }

    // Analyze captured content
    const profileAnalysis = await this.analyzeProfileContents(targetProfileDir);

    // Create session metadata
    const metadata = {
      id: sessionId,
      name: options.sessionName,
      description: options.description || 'Chrome session captured with PSP',
      createdAt: captureTime,
      updatedAt: captureTime,
      captureType: 'complete_chrome_state' as const,
      platform: process.platform,
      version: '1.0.0',
      tags: [],
      captureInfo: {
        sourceSize,
        targetSize,
        copyTimeMs: copyTime,
        chromeProcesses: this.getChromeProcessCount(),
        profileAnalysis,
        captureMethod: 'full_profile_copy',
        excludedExtensions: options.excludedExtensionIds,
        includedDomains: options.includeDomains
      }
    };

    // Create PSP session
    const session = new PSPSession(metadata, targetProfileDir, this.config);
    await session.save();

    console.log(`✅ Chrome session captured: ${sessionId}`);
    return session;
  }

  /**
   * Restore a Chrome session
   */
  async restoreSession(session: PSPSession, options: RestoreOptions = {}): Promise<void> {
    console.log(`🔄 Restoring Chrome session: ${session.metadata.name}`);

    if (!fs.existsSync(session.profilePath)) {
      throw new Error(`Session profile not found: ${session.profilePath}`);
    }

    // Remove any existing lock files
    this.removeLockFiles(session.profilePath);

    // Launch Chrome with the session profile
    const context = await chromium.launchPersistentContext(session.profilePath, {
      headless: options.headless ?? false,
      viewport: options.viewport,
      userAgent: options.userAgent,
      locale: options.locale,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-first-run',
        '--no-default-browser-check'
      ]
    });

    console.log(`✅ Chrome session restored: ${session.metadata.name}`);
    return context;
  }

  /**
   * Launch Chrome with a specific session
   */
  async launchWithSession(sessionId: string, options: LaunchOptions = {}): Promise<any> {
    const session = await PSPSession.load(sessionId, this.config);
    return await this.restoreSession(session, options);
  }

  /**
   * Find the current Chrome user data directory
   */
  private findCurrentChromeProfile(): string {
    const possiblePaths = [
      // macOS
      path.join(os.homedir(), 'Library/Application Support/Google/Chrome'),
      // Windows
      path.join(os.homedir(), 'AppData/Local/Google/Chrome/User Data'),
      // Linux
      path.join(os.homedir(), '.config/google-chrome'),
      path.join(os.homedir(), '.config/chromium')
    ];

    for (const chromePath of possiblePaths) {
      if (fs.existsSync(chromePath)) {
        return chromePath;
      }
    }

    throw new Error('Could not find Chrome user data directory');
  }

  /**
   * Get Chrome process count
   */
  private getChromeProcessCount(): number {
    try {
      const processes = execSync('ps aux | grep -i chrome | grep -v grep', { encoding: 'utf8' });
      return processes.split('\n').filter(line => line.trim()).length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Remove Chrome lock files
   */
  private removeLockFiles(profileDir: string): void {
    const lockFiles = [
      path.join(profileDir, 'SingletonLock'),
      path.join(profileDir, 'Default', 'SingletonLock')
    ];

    for (const lockFile of lockFiles) {
      if (fs.existsSync(lockFile)) {
        try {
          fs.unlinkSync(lockFile);
        } catch (error) {
          console.warn(`Failed to remove lock file ${lockFile}:`, error);
        }
      }
    }
  }

  /**
   * Exclude extensions from captured profile
   */
  private async excludeExtensions(profileDir: string, excludedIds?: string[]): Promise<void> {
    const extensionsDir = path.join(profileDir, 'Default', 'Extensions');
    
    if (!fs.existsSync(extensionsDir)) {
      return;
    }

    const extensionIds = fs.readdirSync(extensionsDir);
    let removedCount = 0;

    for (const extensionId of extensionIds) {
      const shouldExclude = excludedIds?.includes(extensionId) || 
                           this.config.capture.excludedExtensionIds?.includes(extensionId);

      if (shouldExclude) {
        const extensionPath = path.join(extensionsDir, extensionId);
        try {
          fs.rmSync(extensionPath, { recursive: true, force: true });
          removedCount++;
        } catch (error) {
          console.warn(`Failed to remove extension ${extensionId}:`, error);
        }
      }
    }

    if (removedCount > 0) {
      console.log(`🧹 Excluded ${removedCount} extensions from capture`);
    }
  }

  /**
   * Analyze Chrome profile contents
   */
  private async analyzeProfileContents(profileDir: string) {
    const analysis = {
      profiles: [],
      totalFiles: 0,
      keyComponents: {}
    };

    try {
      const items = fs.readdirSync(profileDir);
      const profileDirs = items.filter(item => {
        const itemPath = path.join(profileDir, item);
        return fs.statSync(itemPath).isDirectory() && 
               (item === 'Default' || item.startsWith('Profile '));
      });

      for (const profile of profileDirs) {
        const profilePath = path.join(profileDir, profile);
        const profileInfo = {
          name: profile,
          path: profilePath,
          size: this.getDirectorySize(profilePath),
          components: {}
        };

        const keyFiles = [
          'Bookmarks', 'History', 'Cookies', 'Preferences', 
          'Web Data', 'Login Data', 'Local Storage', 
          'Session Storage', 'Extensions', 'Sync Data'
        ];

        for (const file of keyFiles) {
          const filePath = path.join(profilePath, file);
          if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            profileInfo.components[file] = {
              exists: true,
              size: stats.isDirectory() ? this.getDirectorySize(filePath) : stats.size,
              type: stats.isDirectory() ? 'directory' : 'file'
            };
          }
        }

        analysis.profiles.push(profileInfo);
      }

      analysis.totalFiles = this.countFiles(profileDir);
      analysis.keyComponents = this.analyzeKeyComponents(profileDir);

    } catch (error) {
      console.warn('Error analyzing profile:', error);
    }

    return analysis;
  }

  /**
   * Analyze key Chrome components
   */
  private analyzeKeyComponents(profileDir: string) {
    const components = {};

    try {
      const extensionsDir = path.join(profileDir, 'Default', 'Extensions');
      if (fs.existsSync(extensionsDir)) {
        const extensions = fs.readdirSync(extensionsDir);
        components.extensions = {
          count: extensions.length,
          totalSize: this.getDirectorySize(extensionsDir)
        };
      }

      const bookmarksFile = path.join(profileDir, 'Default', 'Bookmarks');
      if (fs.existsSync(bookmarksFile)) {
        components.bookmarks = {
          exists: true,
          size: fs.statSync(bookmarksFile).size,
          readable: true
        };
      }

      const historyFile = path.join(profileDir, 'Default', 'History');
      if (fs.existsSync(historyFile)) {
        components.history = {
          exists: true,
          size: fs.statSync(historyFile).size
        };
      }

    } catch (error) {
      console.warn('Error analyzing components:', error);
    }

    return components;
  }

  /**
   * Get directory size recursively
   */
  private getDirectorySize(dirPath: string): number {
    if (!fs.existsSync(dirPath)) return 0;
    
    let totalSize = 0;
    
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          totalSize += this.getDirectorySize(itemPath);
        } else {
          totalSize += stats.size;
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
    
    return totalSize;
  }

  /**
   * Count files recursively
   */
  private countFiles(dirPath: string): number {
    if (!fs.existsSync(dirPath)) return 0;
    
    let count = 0;
    
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          count += this.countFiles(itemPath);
        } else {
          count++;
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
    
    return count;
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
