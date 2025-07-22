import { Page, Browser } from 'puppeteer';
import { Adapter } from '../../core/src/adapter';
import { BrowserSessionState, RecordingOptions, PlaybackOptions } from '../../core/src/types';

export interface PuppeteerConfig {
  /** Whether to capture screenshots during recording */
  captureScreenshots?: boolean;
  /** Maximum wait time for elements (ms) */
  waitTimeout?: number;
  /** Additional options for Puppeteer */
  puppeteerOptions?: Record<string, any>;
}

/**
 * Puppeteer adapter for PSP
 * Provides session capture and restore functionality for Google Puppeteer
 */
export class PuppeteerAdapter implements Adapter {
  public readonly type = 'puppeteer';
  private page: Page;
  private browser?: Browser;
  private config: PuppeteerConfig;
  private isRecording = false;
  private recordedEvents: any[] = [];

  constructor(page: Page, config: PuppeteerConfig = {}) {
    this.page = page;
    this.browser = page.browser();
    this.config = {
      captureScreenshots: false,
      waitTimeout: 5000,
      ...config
    };
  }

  /**
   * Connect to a new page or browser
   */
  async connect(target: Page | Browser): Promise<void> {
    if ('newPage' in target) {
      // It's a Browser
      this.browser = target;
      this.page = await target.newPage();
    } else {
      // It's a Page
      this.page = target;
      this.browser = target.browser();
    }
  }

  /**
   * Capture current browser session state
   */
  async captureState(): Promise<BrowserSessionState> {
    if (!this.page) {
      throw new Error('No active page to capture state from');
    }

    try {
      // Get current URL
      const url = this.page.url();
      
      // Get all cookies
      const cookies = await this.page.cookies();
      
      // Get localStorage and sessionStorage
      const storageData = await this.page.evaluate(() => {
        const localStorage = {};
        const sessionStorage = {};
        
        // Extract localStorage
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key) {
            localStorage[key] = window.localStorage.getItem(key);
          }
        }
        
        // Extract sessionStorage
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          if (key) {
            sessionStorage[key] = window.sessionStorage.getItem(key);
          }
        }
        
        return { localStorage, sessionStorage };
      });

      const state: BrowserSessionState = {
        version: '1.0.0',
        timestamp: Date.now(),
        origin: new URL(url).origin,
        storage: {
          cookies: cookies.map(cookie => ({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            expires: cookie.expires ? new Date(cookie.expires * 1000).toISOString() : undefined,
            httpOnly: cookie.httpOnly,
            secure: cookie.secure,
            sameSite: cookie.sameSite as 'Strict' | 'Lax' | 'None' | undefined
          })),
          localStorage: new Map(Object.entries(storageData.localStorage)),
          sessionStorage: new Map(Object.entries(storageData.sessionStorage))
        }
      };

      // Add navigation state
      if (url && url !== 'about:blank') {
        state.navigation = {
          currentUrl: url,
          history: [] // Puppeteer doesn't provide easy access to history
        };
      }

      // Add viewport info
      const viewport = this.page.viewport();
      if (viewport) {
        state.viewport = {
          width: viewport.width,
          height: viewport.height,
          deviceScaleFactor: viewport.deviceScaleFactor,
          isMobile: viewport.isMobile,
          hasTouch: viewport.hasTouch
        };
      }

      return state;
    } catch (error) {
      throw new Error(`Failed to capture Puppeteer state: ${error.message}`);
    }
  }

  /**
   * Apply session state to the current browser
   */
  async applyState(state: BrowserSessionState): Promise<void> {
    if (!this.page) {
      throw new Error('No active page to apply state to');
    }

    try {
      // Set viewport if provided
      if (state.viewport) {
        await this.page.setViewport({
          width: state.viewport.width,
          height: state.viewport.height,
          deviceScaleFactor: state.viewport.deviceScaleFactor || 1,
          isMobile: state.viewport.isMobile || false,
          hasTouch: state.viewport.hasTouch || false
        });
      }

      // Set cookies
      if (state.storage.cookies?.length > 0) {
        const puppeteerCookies = state.storage.cookies.map(cookie => ({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path || '/',
          expires: cookie.expires ? Math.floor(new Date(cookie.expires).getTime() / 1000) : undefined,
          httpOnly: cookie.httpOnly || false,
          secure: cookie.secure || false,
          sameSite: cookie.sameSite as 'Strict' | 'Lax' | 'None' | undefined
        }));
        
        await this.page.setCookie(...puppeteerCookies);
      }

      // Navigate to a domain page first to set localStorage/sessionStorage
      const targetUrl = state.navigation?.currentUrl || state.origin || 'about:blank';
      if (targetUrl !== 'about:blank') {
        await this.page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
      }

      // Set localStorage and sessionStorage
      if (state.storage.localStorage || state.storage.sessionStorage) {
        await this.page.evaluate((storageData) => {
          // Set localStorage
          if (storageData.localStorage) {
            storageData.localStorage.forEach((value, key) => {
              window.localStorage.setItem(key, value);
            });
          }
          
          // Set sessionStorage
          if (storageData.sessionStorage) {
            storageData.sessionStorage.forEach((value, key) => {
              window.sessionStorage.setItem(key, value);
            });
          }
        }, {
          localStorage: state.storage.localStorage ? Array.from(state.storage.localStorage.entries()) : [],
          sessionStorage: state.storage.sessionStorage ? Array.from(state.storage.sessionStorage.entries()) : []
        });
      }

      // Reload to apply all changes
      if (targetUrl !== 'about:blank') {
        await this.page.reload({ waitUntil: 'domcontentloaded' });
      }

    } catch (error) {
      throw new Error(`Failed to apply Puppeteer state: ${error.message}`);
    }
  }

  /**
   * Start recording user interactions
   */
  async startRecording(options?: RecordingOptions): Promise<void> {
    if (this.isRecording) {
      throw new Error('Recording is already in progress');
    }

    this.isRecording = true;
    this.recordedEvents = [];

    try {
      // Enable domains for recording
      const client = await this.page.target().createCDPSession();
      await client.send('Runtime.enable');
      await client.send('Page.enable');
      await client.send('Input.enable');

      // Record mouse events
      client.on('Input.dispatchMouseEvent', (event) => {
        this.recordedEvents.push({
          type: 'mouse',
          timestamp: Date.now(),
          data: event
        });
      });

      // Record keyboard events
      client.on('Input.dispatchKeyEvent', (event) => {
        this.recordedEvents.push({
          type: 'keyboard',
          timestamp: Date.now(),
          data: event
        });
      });

      // Record page navigation
      this.page.on('framenavigated', (frame) => {
        if (frame === this.page.mainFrame()) {
          this.recordedEvents.push({
            type: 'navigation',
            timestamp: Date.now(),
            data: { url: frame.url() }
          });
        }
      });

    } catch (error) {
      this.isRecording = false;
      throw new Error(`Failed to start Puppeteer recording: ${error.message}`);
    }
  }

  /**
   * Stop recording and return events
   */
  async stopRecording(): Promise<any[]> {
    if (!this.isRecording) {
      throw new Error('No recording in progress');
    }

    this.isRecording = false;
    const events = [...this.recordedEvents];
    this.recordedEvents = [];

    return events;
  }

  /**
   * Play back recorded events
   */
  async playRecording(events: any[], options?: PlaybackOptions): Promise<void> {
    if (!this.page) {
      throw new Error('No active page for playback');
    }

    const speed = options?.speed || 1;
    const startTime = events.length > 0 ? events[0].timestamp : Date.now();

    for (const event of events) {
      const delay = (event.timestamp - startTime) / speed;
      
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      try {
        switch (event.type) {
          case 'navigation':
            await this.page.goto(event.data.url, { waitUntil: 'domcontentloaded' });
            break;
          case 'mouse':
            await this.page.mouse.click(event.data.x, event.data.y);
            break;
          case 'keyboard':
            if (event.data.text) {
              await this.page.keyboard.type(event.data.text);
            }
            break;
        }
      } catch (error) {
        if (!options?.continueOnError) {
          throw new Error(`Playback failed at event: ${error.message}`);
        }
        console.warn(`Skipped event due to error: ${error.message}`);
      }
    }
  }

  /**
   * Get the current page
   */
  getPage(): Page {
    return this.page;
  }

  /**
   * Get the browser instance
   */
  getBrowser(): Browser | undefined {
    return this.browser;
  }
}