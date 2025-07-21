/**
 * PSP Adapter for Stagehand
 * Integrates PSP with Browserbase's Stagehand automation framework
 */

import {
  Adapter,
  BrowserSessionState,
  Event,
  RecordingOptions,
  PlaybackOptions,
} from '@psp/core';

interface StagehandPage {
  // Stagehand page interface
  goto(url: string, options?: any): Promise<void>;
  click(selector: string, options?: any): Promise<void>;
  fill(selector: string, value: string, options?: any): Promise<void>;
  type(selector: string, text: string, options?: any): Promise<void>;
  waitForSelector(selector: string, options?: any): Promise<void>;
  evaluate<T>(fn: () => T): Promise<T>;
  evaluateHandle<T>(fn: () => T): Promise<T>;
  cookies(): Promise<any[]>;
  setCookie(...cookies: any[]): Promise<void>;
  deleteCookie(...names: string[]): Promise<void>;
  content(): Promise<string>;
  title(): Promise<string>;
  url(): Promise<string>;
  screenshot(options?: any): Promise<Buffer>;
  pdf(options?: any): Promise<Buffer>;
}

/**
 * Adapter for Stagehand browser automation
 */
export class StagehandAdapter extends Adapter {
  /** The Stagehand page instance */
  private page?: StagehandPage;

  /** Recording in progress */
  private recording = false;

  /** Events recorded */
  private events: Event[] = [];

  /** Recording start time */
  private recordingStartTime = 0;

  /**
   * Creates a new StagehandAdapter
   */
  constructor(options: any = {}) {
    super({
      ...options,
      type: 'stagehand',
    });
  }

  /**
   * Connects to a Stagehand page
   */
  async connect(target: StagehandPage): Promise<void> {
    this.page = target;
    await super.connect(target);
  }

  /**
   * Captures the current browser state from Stagehand
   */
  async captureState(): Promise<BrowserSessionState> {
    if (!this.page) {
      throw new Error('Not connected to a Stagehand page');
    }

    // Get current URL and title
    const url = await this.page.url();
    const title = await this.page.title();
    const origin = new URL(url).origin;

    // Get cookies
    const cookies = await this.page.cookies();

    // Get storage states through evaluation
    const storageData = await this.page.evaluate(() => {
      // Get localStorage
      const localStorageData: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          localStorageData[key] = localStorage.getItem(key) || '';
        }
      }

      // Get sessionStorage
      const sessionStorageData: Record<string, string> = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          sessionStorageData[key] = sessionStorage.getItem(key) || '';
        }
      }

      return {
        localStorage: localStorageData,
        sessionStorage: sessionStorageData,
        scrollPosition: {
          x: window.scrollX,
          y: window.scrollY,
        },
      };
    });

    // Get page content
    const html = await this.page.content();

    // Build the state object
    const state: BrowserSessionState = {
      version: '1.0.0',
      timestamp: Date.now(),
      origin,
      storage: {
        cookies: cookies.map((cookie: any) => ({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path || '/',
          expires: cookie.expires ? new Date(cookie.expires * 1000).getTime() : null,
          httpOnly: cookie.httpOnly || false,
          secure: cookie.secure || false,
          sameSite: cookie.sameSite || 'Lax',
          partitioned: false,
        })),
        localStorage: new Map([[origin, new Map(Object.entries(storageData.localStorage))]]),
        sessionStorage: new Map([[origin, new Map(Object.entries(storageData.sessionStorage))]]),
      },
      dom: {
        html,
        scrollPosition: storageData.scrollPosition,
      },
      history: {
        currentUrl: url,
        entries: [
          {
            url,
            title,
            timestamp: Date.now(),
            scrollPosition: storageData.scrollPosition,
          },
        ],
        currentIndex: 0,
      },
    };

    // Add recording if available
    if (this.recording && this.events.length > 0) {
      state.recording = {
        events: [...this.events],
        startTime: this.recordingStartTime,
        duration: Date.now() - this.recordingStartTime,
      };
    }

    return state;
  }

  /**
   * Applies a browser state to the current Stagehand page
   */
  async applyState(state: BrowserSessionState): Promise<void> {
    if (!this.page) {
      throw new Error('Not connected to a Stagehand page');
    }

    // Clear existing cookies
    const existingCookies = await this.page.cookies();
    await this.page.deleteCookie(...existingCookies.map((c: any) => c.name));

    // Apply cookies
    const cookies = state.storage.cookies.map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expires ? Math.floor(cookie.expires / 1000) : undefined,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
    }));
    await this.page.setCookie(...cookies);

    // Navigate to the URL
    if (state.history?.currentUrl) {
      await this.page.goto(state.history.currentUrl, {
        waitUntil: 'domcontentloaded',
      });
    }

    // Apply localStorage and sessionStorage
    const storageData = {
      localStorage: Array.from(state.storage.localStorage.entries()).map(
        ([origin, storage]) => [origin, Array.from(storage.entries())]
      ),
      sessionStorage: Array.from(state.storage.sessionStorage.entries()).map(
        ([origin, storage]) => [origin, Array.from(storage.entries())]
      ),
    };
    
    await this.page.evaluate((storageState: {
      localStorage: Array<[string, Array<[string, string]>]>;
      sessionStorage: Array<[string, Array<[string, string]>]>;
    }) => {
      // Clear existing storage
      localStorage.clear();
      sessionStorage.clear();

      // Apply localStorage
      for (const [origin, storage] of storageState.localStorage) {
        if (origin === window.location.origin) {
          for (const [key, value] of storage) {
            localStorage.setItem(key, value);
          }
        }
      }

      // Apply sessionStorage
      for (const [origin, storage] of storageState.sessionStorage) {
        if (origin === window.location.origin) {
          for (const [key, value] of storage) {
            sessionStorage.setItem(key, value);
          }
        }
      }
    }, storageData);

    // Restore scroll position
    if (state.dom?.scrollPosition) {
      await this.page.evaluate((scrollPos: { x: number; y: number }) => {
        window.scrollTo(scrollPos.x, scrollPos.y);
      }, state.dom.scrollPosition);
    }
  }

  /**
   * Starts recording user interactions
   */
  async startRecording(options?: RecordingOptions): Promise<void> {
    if (!this.page) {
      throw new Error('Not connected to a Stagehand page');
    }

    this.recording = true;
    this.events = [];
    this.recordingStartTime = Date.now();

    // Set up event listeners on the page
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
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            shiftKey: e.shiftKey,
            metaKey: e.metaKey,
          },
        });
      });

      // Track input changes
      document.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const selector = target.tagName.toLowerCase() + 
          (target.id ? `#${target.id}` : '') +
          (target.name ? `[name="${target.name}"]` : '') +
          (target.className ? `.${target.className.split(' ').join('.')}` : '');

        events.push({
          type: 'input',
          timestamp: Date.now() - startTime,
          target: selector,
          data: {
            value: target.value,
          },
        });
      });

      // Track navigation
      let currentUrl = window.location.href;
      const checkNavigation = () => {
        if (window.location.href !== currentUrl) {
          events.push({
            type: 'navigation',
            timestamp: Date.now() - startTime,
            data: {
              url: window.location.href,
              navigationType: 'navigate',
            },
          });
          currentUrl = window.location.href;
        }
      };

      // Store events on window for retrieval
      (window as any)._pspEvents = events;
      (window as any)._pspCheckNavigation = setInterval(checkNavigation, 100);
    }, this.recordingStartTime);
  }

  /**
   * Stops recording and returns recorded events
   */
  async stopRecording(): Promise<Event[]> {
    if (!this.page) {
      throw new Error('Not connected to a Stagehand page');
    }

    this.recording = false;

    // Retrieve events from the page
    const events = await this.page.evaluate(() => {
      const events = (window as any)._pspEvents || [];
      clearInterval((window as any)._pspCheckNavigation);
      delete (window as any)._pspEvents;
      delete (window as any)._pspCheckNavigation;
      return events;
    });

    this.events = events;
    return [...this.events];
  }

  /**
   * Replays recorded events
   */
  async replay(events: Event[], options?: PlaybackOptions): Promise<void> {
    if (!this.page) {
      throw new Error('Not connected to a Stagehand page');
    }

    const speed = options?.speed || 1.0;
    const actionTimeout = options?.actionTimeout || 30000;

    for (const event of events) {
      // Wait for the appropriate timing
      const delay = event.timestamp / speed;
      await new Promise(resolve => setTimeout(resolve, delay));

      try {
        switch (event.type) {
          case 'click':
            if (event.target) {
              if (options?.validateTargets) {
                await this.page.waitForSelector(event.target, { timeout: actionTimeout });
              }
              await this.page.click(event.target);
            }
            break;
          case 'input':
            if (event.target && event.data.value) {
              if (options?.validateTargets) {
                await this.page.waitForSelector(event.target, { timeout: actionTimeout });
              }
              await this.page.fill(event.target, event.data.value);
            }
            break;
          case 'navigation':
            if (event.data.url) {
              await this.page.goto(event.data.url, { waitUntil: 'domcontentloaded' });
            }
            break;
          // Add more event types as needed
        }
      } catch (error) {
        console.warn(`Failed to replay event ${event.type}:`, error);
        if (!options?.validateTargets) {
          continue; // Skip failed events if validation is disabled
        }
        throw error;
      }
    }
  }

  /**
   * Takes a screenshot (Stagehand-specific feature)
   */
  async screenshot(options?: any): Promise<Buffer> {
    if (!this.page) {
      throw new Error('Not connected to a Stagehand page');
    }
    return await this.page.screenshot(options);
  }

  /**
   * Generates a PDF (Stagehand-specific feature)
   */
  async pdf(options?: any): Promise<Buffer> {
    if (!this.page) {
      throw new Error('Not connected to a Stagehand page');
    }
    return await this.page.pdf(options);
  }

  /**
   * Plays back a recording from events
   */
  async playRecording(events: Event[], options?: PlaybackOptions): Promise<void> {
    await this.replay(events, options);
  }
}

// Export for use in other modules
export default StagehandAdapter;