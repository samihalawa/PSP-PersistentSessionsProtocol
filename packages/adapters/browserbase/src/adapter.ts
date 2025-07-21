/**
 * Browserbase Adapter for PSP
 * Integrates PSP with Browserbase cloud browser automation platform
 */

import { Adapter, SessionOptions, PlaybackOptions } from '@psp/core';
import { BrowserSessionState, Event, Session } from '@psp/core';
import { chromium, Browser, BrowserContext, Page } from 'playwright-core';

interface BrowserbaseConfig {
  apiKey: string;
  projectId?: string;
  sessionId?: string;
  fingerprint?: {
    locales?: string[];
    operatingSystems?: string[];
    devices?: string[];
  };
  enableProxy?: boolean;
}

export { BrowserbaseConfig };

export class BrowserbaseAdapter extends Adapter {
  private config: BrowserbaseConfig;
  private browser?: Browser;
  private context?: BrowserContext;
  private page?: Page;
  private sessionId?: string;
  private recording = false;
  private events: Event[] = [];
  private recordingStartTime = 0;

  constructor(config: BrowserbaseConfig) {
    super({
      type: 'browserbase',
      ...config
    });
    this.config = config;
  }

  /**
   * Helper method to convert storage arrays to Maps
   */
  private convertStorageToMap(storageArray: any[]): Map<string, Map<string, string>> {
    const result = new Map<string, Map<string, string>>();
    
    for (const item of storageArray) {
      if (item && typeof item === 'object' && item.name && item.value) {
        // Use localhost as default origin for simplicity
        const origin = 'localhost';
        if (!result.has(origin)) {
          result.set(origin, new Map());
        }
        result.get(origin)!.set(item.name, item.value);
      }
    }
    
    return result;
  }

  /**
   * Connect to Browserbase
   */
  async connect(): Promise<void> {
    try {
      // Create session if not provided
      if (!this.config.sessionId) {
        await this.createBrowserbaseSession();
      }

      // Connect to Browserbase via CDP
      const endpoint = this.config.sessionId 
        ? `wss://connect.browserbase.com?apiKey=${this.config.apiKey}&sessionId=${this.config.sessionId}`
        : `wss://connect.browserbase.com?apiKey=${this.config.apiKey}`;

      this.browser = await chromium.connectOverCDP(endpoint);
      
      // Get the default context to ensure sessions are recorded
      this.context = this.browser.contexts()[0];
      this.page = this.context.pages()[0] || await this.context.newPage();

      console.log('✅ Connected to Browserbase');
    } catch (error) {
      throw new Error(`Failed to connect to Browserbase: ${error}`);
    }
  }

  /**
   * Create a new Browserbase session
   */
  private async createBrowserbaseSession(): Promise<void> {
    const response = await fetch('https://www.browserbase.com/v1/sessions', {
      method: 'POST',
      headers: {
        'x-bb-api-key': this.config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: this.config.projectId,
        fingerprint: this.config.fingerprint,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create Browserbase session: ${response.statusText}`);
    }

    const session = await response.json();
    this.config.sessionId = session.id;
    this.sessionId = session.id;
    console.log(`✅ Created Browserbase session: ${session.id}`);
  }

  /**
   * Navigate to a URL
   */
  async navigate(url: string): Promise<void> {
    if (!this.page) {
      throw new Error('Not connected to Browserbase');
    }
    await this.page.goto(url);
  }

  /**
   * Capture current browser state
   */
  async captureState(): Promise<BrowserSessionState> {
    if (!this.page || !this.context) {
      throw new Error('Not connected to Browserbase');
    }

    // Get storage state (cookies, localStorage, sessionStorage, etc.)
    const storageState = await this.context.storageState();
    
    // Get current URL
    const url = this.page.url();
    
    // Capture page content and DOM state
    const content = await this.page.content();
    const title = await this.page.title();

    // Get scroll position
    const scrollPosition = await this.page.evaluate(() => ({
      x: window.scrollX,
      y: window.scrollY,
    }));

    return {
      version: '1.0',
      timestamp: Date.now(),
      origin: url || 'unknown',
      storage: {
        cookies: storageState.cookies.map(cookie => ({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          expires: cookie.expires || null,
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite as 'Strict' | 'Lax' | 'None',
          partitioned: false, // Browserbase doesn't expose this yet
        })),
        localStorage: this.convertStorageToMap(storageState.origins?.[0]?.localStorage || []),
        sessionStorage: this.convertStorageToMap([]),
        indexedDB: {
          databases: []
        },
      },
      dom: {
        html: content,
        scrollPosition,
      },
      recording: this.recording ? {
        events: [...this.events],
        startTime: this.recordingStartTime,
        duration: this.recording ? Date.now() - this.recordingStartTime : 0,
      } : undefined,
      extensions: {
        browserbaseSessionId: this.sessionId,
      },
    };
  }

  /**
   * Restore browser state
   */
  async applyState(state: BrowserSessionState): Promise<void> {
    if (!this.page || !this.context) {
      throw new Error('Not connected to Browserbase');
    }

    // Set cookies
    if (state.storage.cookies) {
      await this.context.addCookies(state.storage.cookies.map(cookie => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expires ? cookie.expires : undefined,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
      })));
    }

    // Navigate to the original URL (using origin field)
    const targetUrl = state.origin !== 'unknown' ? state.origin : undefined;
    if (targetUrl) {
      await this.page.goto(targetUrl);
    }

    // Restore localStorage
    if (state.storage.localStorage.size > 0) {
      const localStorageItems: Array<{name: string, value: string}> = [];
      
      for (const [origin, items] of state.storage.localStorage) {
        for (const [name, value] of items) {
          localStorageItems.push({ name, value });
        }
      }
      
      if (localStorageItems.length > 0) {
        await this.page.evaluate((items) => {
          for (const item of items) {
            localStorage.setItem(item.name, item.value);
          }
        }, localStorageItems);
      }
    }

    // Restore scroll position
    if (state.dom?.scrollPosition) {
      await this.page.evaluate((pos) => {
        window.scrollTo(pos.x, pos.y);
      }, state.dom.scrollPosition);
    }
  }

  /**
   * Start recording user interactions
   */
  async startRecording(): Promise<void> {
    if (!this.page) {
      throw new Error('Not connected to Browserbase');
    }

    this.recording = true;
    this.events = [];
    this.recordingStartTime = Date.now();

    // Set up event listeners similar to Playwright adapter
    await this.page.evaluate((startTime: number) => {
      const events: Event[] = [];

      // Track clicks
      document.addEventListener('click', (e) => {
        const target = e.target as Element;
        const selector = target.tagName.toLowerCase() + 
          (target.id ? `#${target.id}` : '') +
          (target.className ? `.${target.className.split(' ').join('.')}` : '');

        events.push({
          type: 'click',
          timestamp: Date.now() - startTime,
          target: selector,
          data: {
            button: e.button,
            clientX: e.clientX,
            clientY: e.clientY,
          },
        });
      });

      // Store events on window for retrieval
      (window as any)._pspEvents = events;
    }, this.recordingStartTime);
  }

  /**
   * Stop recording and return events
   */
  async stopRecording(): Promise<Event[]> {
    if (!this.page) {
      throw new Error('Not connected to Browserbase');
    }

    this.recording = false;

    // Retrieve events from the page
    const events = await this.page.evaluate(() => {
      return (window as any)._pspEvents || [];
    });

    this.events = events;
    return events;
  }

  /**
   * Play back recorded events
   */
  async playRecording(events: Event[], options?: PlaybackOptions): Promise<void> {
    if (!this.page) {
      throw new Error('Not connected to Browserbase');
    }

    for (const event of events) {
      // Add delay between events (based on speed multiplier)
      if (options?.speed !== 0) {
        const delay = (options?.speed || 1) * 100;
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      switch (event.type) {
        case 'click':
          if (event.target) {
            await this.page.click(event.target);
          }
          break;
        case 'input':
          if (event.target && event.data?.value) {
            await this.page.fill(event.target, event.data.value);
          }
          break;
        case 'navigation':
          if (event.data?.url) {
            await this.page.goto(event.data.url);
          }
          break;
      }
    }
  }

  /**
   * Get session debug URL for live viewing
   */
  async getDebugUrl(): Promise<string | null> {
    if (!this.sessionId) {
      return null;
    }

    try {
      const response = await fetch(
        `https://www.browserbase.com/v1/sessions/${this.sessionId}/debug`,
        {
          method: 'GET',
          headers: {
            'x-bb-api-key': this.config.apiKey,
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.debuggerFullscreenUrl;
    } catch (error) {
      console.warn('Could not get debug URL:', error);
      return null;
    }
  }

  /**
   * Disconnect from Browserbase
   */
  async disconnect(): Promise<void> {
    if (this.page) {
      await this.page.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }

  /**
   * Export session for use with other Browserbase features
   */
  async exportForBrowserbase(): Promise<{
    sessionId: string;
    debugUrl: string | null;
    storageState: any;
  }> {
    if (!this.sessionId || !this.context) {
      throw new Error('No active Browserbase session');
    }

    const storageState = await this.context.storageState();
    const debugUrl = await this.getDebugUrl();

    return {
      sessionId: this.sessionId,
      debugUrl,
      storageState,
    };
  }
}

export default BrowserbaseAdapter;