import { Adapter, BrowserSessionState, AdapterOptions } from '@psp/core';

/**
 * Options for configuring the Computer-Use adapter
 */
export interface ComputerUseAdapterOptions extends AdapterOptions {
  /**
   * Custom options specific to Computer-Use
   */
  computerUseOptions?: {
    /**
     * Whether to include file system state in session capture
     */
    captureFileSystem?: boolean;
    
    /**
     * Specific directories to include when capturing filesystem state
     */
    fileSystemPaths?: string[];
    
    /**
     * Whether to include system state like environment variables
     */
    captureSystemState?: boolean;
  };
}

/**
 * Capture options for computer state
 */
export interface CaptureOptions {
  /**
   * Include file system state
   */
  includeFiles?: boolean;
  
  /**
   * Include system state (environment, etc.)
   */
  includeSystemState?: boolean;
  
  /**
   * Directory paths to include in file capture
   */
  filePaths?: string[];
}

/**
 * Adapter implementation for Computer-Use framework
 */
export class ComputerUseAdapter extends Adapter {
  private computer: any;
  private options: ComputerUseAdapterOptions;
  private browser: any;
  
  /**
   * Creates a new ComputerUseAdapter instance
   * 
   * @param options Configuration options for the adapter
   */
  constructor(options: ComputerUseAdapterOptions = {}) {
    super({
      ...options,
      type: 'computer-use'
    });
    
    this.options = options;
  }
  
  /**
   * Connects the adapter to a Computer-Use computer instance
   * 
   * @param computer The Computer-Use computer instance
   */
  async connect(computer: any): Promise<void> {
    this.computer = computer;
    
    // If there's an active browser, store reference to it
    const activeBrowser = await this.getActiveBrowser();
    if (activeBrowser) {
      this.browser = activeBrowser;
    }
    
    await super.connect(computer);
  }
  
  /**
   * Gets the active browser instance from the computer
   * 
   * @returns The active browser instance or null if none is active
   */
  private async getActiveBrowser(): Promise<any> {
    if (!this.computer) {
      return null;
    }
    
    try {
      const activeBrowser = await this.computer.getActiveBrowser();
      return activeBrowser;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Captures the current browser and computer state
   * 
   * @param options Optional capture options
   * @returns The captured browser session state
   */
  async captureState(options?: CaptureOptions): Promise<BrowserSessionState> {
    if (!this.computer) {
      throw new Error('Not connected to a computer');
    }
    
    // Try to get an active browser if we don't have one
    if (!this.browser) {
      this.browser = await this.getActiveBrowser();
      if (!this.browser) {
        throw new Error('No active browser found to capture state from');
      }
    }
    
    // Get current URL and extract origin
    const url = await this.browser.getCurrentUrl();
    const origin = new URL(url).origin;
    
    // Get page details
    const title = await this.browser.getTitle();
    
    // Capture cookies
    const cookies = await this.browser.getCookies();
    
    // Capture storage (localStorage and sessionStorage)
    const storage = await this.browser.evaluate(`(() => {
      const localStorage = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        localStorage[key] = window.localStorage.getItem(key);
      }
      
      const sessionStorage = {};
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        sessionStorage[key] = window.sessionStorage.getItem(key);
      }
      
      return { localStorage, sessionStorage };
    })()`);
    
    // Capture file system state if requested
    let fileSystem = undefined;
    const includeFiles = options?.includeFiles ?? this.options.computerUseOptions?.captureFileSystem ?? false;
    const filePaths = options?.filePaths ?? this.options.computerUseOptions?.fileSystemPaths ?? [];
    
    if (includeFiles && filePaths.length > 0) {
      fileSystem = await this.captureFileSystem(filePaths);
    }
    
    // Capture system state if requested
    let systemState = undefined;
    const includeSystemState = options?.includeSystemState ?? this.options.computerUseOptions?.captureSystemState ?? false;
    
    if (includeSystemState) {
      systemState = await this.captureSystemState();
    }
    
    // Build the extensions object for Computer-Use specific state
    const extensions: Record<string, unknown> = {};
    if (fileSystem) {
      extensions.fileSystem = fileSystem;
    }
    if (systemState) {
      extensions.systemState = systemState;
    }
    
    // Construct the session state
    return {
      version: '1.0.0',
      timestamp: Date.now(),
      origin,
      storage: {
        cookies: this.normalizeCookies(cookies),
        localStorage: this.mapStorage(storage.localStorage, origin),
        sessionStorage: this.mapStorage(storage.sessionStorage, origin)
      },
      history: {
        currentUrl: url,
        entries: [
          {
            url,
            title,
            timestamp: Date.now()
          }
        ],
        currentIndex: 0
      },
      extensions: Object.keys(extensions).length > 0 ? extensions : undefined
    };
  }
  
  /**
   * Applies a previously captured browser state to the current computer
   * 
   * @param state The browser session state to apply
   */
  async applyState(state: BrowserSessionState): Promise<void> {
    if (!this.computer) {
      throw new Error('Not connected to a computer');
    }
    
    // Get or create a browser if we don't have one
    if (!this.browser) {
      this.browser = await this.getActiveBrowser();
      if (!this.browser) {
        this.browser = await this.computer.openBrowser();
      }
    }
    
    // Navigate to the URL if history is available
    if (state.history?.currentUrl) {
      await this.browser.goto(state.history.currentUrl);
    }
    
    // Apply cookies
    for (const cookie of state.storage.cookies) {
      await this.browser.setCookie({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain || undefined,
        path: cookie.path || '/',
        expires: cookie.expires ? new Date(cookie.expires) : undefined,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite
      });
    }
    
    // Get current URL and origin
    const url = await this.browser.getCurrentUrl();
    const origin = new URL(url).origin;
    
    // Apply localStorage and sessionStorage
    const localStorage = state.storage.localStorage.get(origin);
    const sessionStorage = state.storage.sessionStorage.get(origin);
    
    await this.browser.evaluate(`((localStorage, sessionStorage) => {
      // Apply localStorage
      window.localStorage.clear();
      for (const [key, value] of Object.entries(localStorage || {})) {
        window.localStorage.setItem(key, value);
      }
      
      // Apply sessionStorage
      window.sessionStorage.clear();
      for (const [key, value] of Object.entries(sessionStorage || {})) {
        window.sessionStorage.setItem(key, value);
      }
    })(${JSON.stringify(Object.fromEntries(localStorage || []))}, ${JSON.stringify(Object.fromEntries(sessionStorage || []))})
    `);
    
    // Restore file system state if present
    if (state.extensions?.fileSystem) {
      await this.restoreFileSystem(state.extensions.fileSystem as any);
    }
    
    // Restore system state if present
    if (state.extensions?.systemState) {
      await this.restoreSystemState(state.extensions.systemState as any);
    }
    
    // Refresh to apply the full state
    await this.browser.refresh();
  }
  
  /**
   * Captures file system state for specified paths
   * 
   * @param paths Array of paths to capture
   * @returns Object representing file system state
   */
  private async captureFileSystem(paths: string[]): Promise<any> {
    const filesystem = await this.computer.filesystem();
    const fileSystem: Record<string, any> = {};
    
    for (const path of paths) {
      try {
        const stats = await filesystem.stat(path);
        
        if (stats.isDirectory()) {
          // For directories, recursively get structure
          const files = await filesystem.readdir(path);
          fileSystem[path] = {
            type: 'directory',
            children: files
          };
        } else {
          // For files, get content
          const content = await filesystem.readFile(path, { encoding: 'utf8' });
          fileSystem[path] = {
            type: 'file',
            content,
            stats: {
              size: stats.size,
              modified: stats.mtime.getTime()
            }
          };
        }
      } catch (error) {
        // Skip files/directories that can't be accessed
        console.warn(`Could not access path: ${path}`, error);
      }
    }
    
    return fileSystem;
  }
  
  /**
   * Restores file system state from captured data
   * 
   * @param fileSystem The file system state to restore
   */
  private async restoreFileSystem(fileSystem: Record<string, any>): Promise<void> {
    const filesystem = await this.computer.filesystem();
    
    for (const [path, data] of Object.entries(fileSystem)) {
      try {
        if (data.type === 'directory') {
          await filesystem.mkdir(path, { recursive: true });
        } else if (data.type === 'file') {
          // Ensure directory exists
          const dirPath = path.substring(0, path.lastIndexOf('/'));
          await filesystem.mkdir(dirPath, { recursive: true });
          
          // Write file
          await filesystem.writeFile(path, data.content);
        }
      } catch (error) {
        console.warn(`Could not restore path: ${path}`, error);
      }
    }
  }
  
  /**
   * Captures system state including environment variables
   * 
   * @returns Object containing system state
   */
  private async captureSystemState(): Promise<any> {
    const system = await this.computer.system();
    
    try {
      // Get environment variables
      const env = await system.getEnv();
      
      // Only include non-sensitive environment variables
      const filteredEnv: Record<string, string> = {};
      const sensitivePatterns = [
        /api[-_]?key/i,
        /auth[-_]?token/i,
        /password/i,
        /secret/i,
        /credential/i,
        /private[-_]?key/i
      ];
      
      for (const [key, value] of Object.entries(env)) {
        if (!sensitivePatterns.some(pattern => pattern.test(key))) {
          filteredEnv[key] = value;
        }
      }
      
      return {
        env: filteredEnv,
        platform: process.platform,
        timestamp: Date.now()
      };
    } catch (error) {
      console.warn('Could not capture system state', error);
      return {
        platform: process.platform,
        timestamp: Date.now()
      };
    }
  }
  
  /**
   * Restores system state from captured data
   * 
   * @param systemState The system state to restore
   */
  private async restoreSystemState(systemState: any): Promise<void> {
    try {
      const system = await this.computer.system();
      
      // Restore environment variables
      if (systemState.env) {
        for (const [key, value] of Object.entries(systemState.env)) {
          await system.setEnv(key, value);
        }
      }
    } catch (error) {
      console.warn('Could not restore system state', error);
    }
  }
  
  /**
   * Normalizes cookies to a common format
   * 
   * @param cookies The cookies array from Computer-Use
   * @returns Normalized cookies array
   */
  private normalizeCookies(cookies: any[]): Array<{
    name: string;
    value: string;
    domain?: string;
    path?: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
  }> {
    return cookies.map(cookie => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path || '/',
      expires: cookie.expires ? new Date(cookie.expires).getTime() : undefined,
      httpOnly: cookie.httpOnly || false,
      secure: cookie.secure || false,
      sameSite: cookie.sameSite || 'Lax'
    }));
  }
  
  /**
   * Maps storage objects to the PSP storage format
   * 
   * @param storageObj The storage object (localStorage or sessionStorage)
   * @param origin The origin for which the storage applies
   * @returns Mapped storage in PSP format
   */
  private mapStorage(storageObj: Record<string, string>, origin: string): Map<string, Map<string, string>> {
    const map = new Map<string, Map<string, string>>();
    map.set(origin, new Map(Object.entries(storageObj || {})));
    return map;
  }
}