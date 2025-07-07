import { PSPAdapter, SessionData, SessionMetadata } from '@psp/core';
import { chromium, Browser, BrowserContext } from 'playwright';

export interface BrowserlessConfig {
  token: string;
  endpoint?: string;
  timeout?: number;
}

export class BrowserlessAdapter implements PSPAdapter {
  private config: BrowserlessConfig;
  private browser?: Browser;
  private context?: BrowserContext;

  constructor(config: BrowserlessConfig) {
    this.config = {
      endpoint: 'https://chrome.browserless.io',
      timeout: 30000,
      ...config
    };
  }

  async initialize(): Promise<void> {
    const wsEndpoint = `${this.config.endpoint}?token=${this.config.token}`;
    
    try {
      this.browser = await chromium.connectOverCDPRuntimeOptions({
        endpointURL: wsEndpoint,
        timeout: this.config.timeout
      });
      
      console.log('✅ Connected to Browserless instance');
    } catch (error) {
      throw new Error(`Failed to connect to Browserless: ${error.message}`);
    }
  }

  async createSession(metadata: SessionMetadata): Promise<string> {
    if (!this.browser) {
      await this.initialize();
    }

    // Create new browser context for session
    this.context = await this.browser!.newContext({
      // Browserless session configuration
      ignoreHTTPSErrors: true,
      viewport: { width: 1920, height: 1080 }
    });

    return metadata.id;
  }

  async captureSession(sessionId: string): Promise<SessionData> {
    if (!this.context) {
      throw new Error('No active session context');
    }

    // Capture session data from Browserless context
    const cookies = await this.context.cookies();
    
    // Get localStorage and sessionStorage from all pages
    const pages = this.context.pages();
    const storageData: Record<string, any> = {};
    
    for (const page of pages) {
      const url = page.url();
      if (url && url.startsWith('http')) {
        try {
          const storage = await page.evaluate(() => ({
            localStorage: Object.fromEntries(Object.entries(localStorage)),
            sessionStorage: Object.fromEntries(Object.entries(sessionStorage))
          }));
          storageData[url] = storage;
        } catch (error) {
          console.warn(`Failed to capture storage for ${url}:`, error.message);
        }
      }
    }

    return {
      sessionId,
      cookies,
      localStorage: storageData,
      sessionStorage: storageData,
      capturedAt: Date.now(),
      browserType: 'chromium-browserless',
      metadata: {
        userAgent: await pages[0]?.evaluate(() => navigator.userAgent) || '',
        viewport: { width: 1920, height: 1080 },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };
  }

  async restoreSession(sessionData: SessionData): Promise<void> {
    if (!this.browser) {
      await this.initialize();
    }

    // Create new context with restored session data
    this.context = await this.browser!.newContext({
      ignoreHTTPSErrors: true,
      viewport: sessionData.metadata?.viewport || { width: 1920, height: 1080 }
    });

    // Restore cookies
    if (sessionData.cookies && sessionData.cookies.length > 0) {
      await this.context.addCookies(sessionData.cookies);
    }

    // Create a page to restore storage
    const page = await this.context.newPage();
    
    // Restore localStorage and sessionStorage for each origin
    for (const [url, storage] of Object.entries(sessionData.localStorage || {})) {
      try {
        await page.goto(url);
        await page.evaluate((storageData: any) => {
          // Restore localStorage
          if (storageData.localStorage) {
            for (const [key, value] of Object.entries(storageData.localStorage)) {
              localStorage.setItem(key, value as string);
            }
          }
          
          // Restore sessionStorage
          if (storageData.sessionStorage) {
            for (const [key, value] of Object.entries(storageData.sessionStorage)) {
              sessionStorage.setItem(key, value as string);
            }
          }
        }, storage);
      } catch (error) {
        console.warn(`Failed to restore storage for ${url}:`, error.message);
      }
    }

    console.log('✅ Session restored in Browserless instance');
  }

  async getContext(): Promise<BrowserContext> {
    if (!this.context) {
      throw new Error('No active session context. Call createSession first.');
    }
    return this.context;
  }

  async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      await this.initialize();
    }
    return this.browser!;
  }

  async cleanup(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = undefined;
    }
    
    if (this.browser) {
      await this.browser.close();
      this.browser = undefined;
    }
  }

  // Browserless-specific methods
  async getSessionInfo(): Promise<any> {
    if (!this.browser) {
      throw new Error('No active browser connection');
    }

    // Get Browserless session info
    try {
      const response = await fetch(`${this.config.endpoint}/sessions?token=${this.config.token}`);
      return await response.json();
    } catch (error) {
      console.warn('Failed to get Browserless session info:', error.message);
      return null;
    }
  }

  async takeScreenshot(options?: any): Promise<Buffer> {
    if (!this.context) {
      throw new Error('No active session context');
    }

    const pages = this.context.pages();
    if (pages.length === 0) {
      throw new Error('No pages available for screenshot');
    }

    return await pages[0].screenshot(options);
  }

  async executeScript(script: string): Promise<any> {
    if (!this.context) {
      throw new Error('No active session context');
    }

    const pages = this.context.pages();
    if (pages.length === 0) {
      throw new Error('No pages available for script execution');
    }

    return await pages[0].evaluate(script);
  }
}

// Export factory function
export function createBrowserlessAdapter(config: BrowserlessConfig): BrowserlessAdapter {
  return new BrowserlessAdapter(config);
}

// Export types
export type { BrowserlessConfig };