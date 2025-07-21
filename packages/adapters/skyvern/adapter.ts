/**
 * PSP Adapter for Skyvern AI
 * Integrates PSP with Skyvern's browser automation platform
 */

import {
  Adapter,
  BrowserSessionState,
  Event,
  RecordingOptions,
  PlaybackOptions,
} from '@psp/core';

interface SkyvernClient {
  // Skyvern client interface
  navigate(url: string): Promise<void>;
  click(selector: string): Promise<void>;
  type(selector: string, text: string): Promise<void>;
  getCookies(): Promise<any[]>;
  setCookies(cookies: any[]): Promise<void>;
  getLocalStorage(): Promise<Record<string, string>>;
  setLocalStorage(data: Record<string, string>): Promise<void>;
  getCurrentUrl(): Promise<string>;
  getPageContent(): Promise<string>;
  waitForSelector(selector: string): Promise<void>;
  screenshot(): Promise<Buffer>;
}

/**
 * Adapter for Skyvern AI browser automation
 */
export class SkyvernAdapter extends Adapter {
  /** The Skyvern client instance */
  private client?: SkyvernClient;

  /** Recording in progress */
  private recording = false;

  /** Events recorded */
  private events: Event[] = [];

  /** Recording start time */
  private recordingStartTime = 0;

  /**
   * Creates a new SkyvernAdapter
   */
  constructor(options: any = {}) {
    super({
      ...options,
      type: 'skyvern',
    });
  }

  /**
   * Connects to a Skyvern client
   */
  async connect(target: SkyvernClient): Promise<void> {
    this.client = target;
    await super.connect(target);
  }

  /**
   * Captures the current browser state from Skyvern
   */
  async captureState(): Promise<BrowserSessionState> {
    if (!this.client) {
      throw new Error('Not connected to a Skyvern client');
    }

    // Get current URL
    const url = await this.client.getCurrentUrl();
    const origin = new URL(url).origin;

    // Get cookies
    const cookies = await this.client.getCookies();

    // Get localStorage
    const localStorage = await this.client.getLocalStorage();

    // Get page content
    const html = await this.client.getPageContent();

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
          expires: cookie.expires ? new Date(cookie.expires).getTime() : null,
          httpOnly: cookie.httpOnly || false,
          secure: cookie.secure || false,
          sameSite: cookie.sameSite || 'Lax',
          partitioned: false,
        })),
        localStorage: new Map([[origin, new Map(Object.entries(localStorage))]]),
        sessionStorage: new Map(), // Skyvern doesn't expose sessionStorage directly
      },
      dom: {
        html,
        scrollPosition: { x: 0, y: 0 }, // Skyvern doesn't expose scroll position
      },
      history: {
        currentUrl: url,
        entries: [
          {
            url,
            title: '', // Skyvern doesn't expose page title directly
            timestamp: Date.now(),
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
   * Applies a browser state to the current Skyvern session
   */
  async applyState(state: BrowserSessionState): Promise<void> {
    if (!this.client) {
      throw new Error('Not connected to a Skyvern client');
    }

    // Apply cookies
    const cookies = state.storage.cookies.map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expires ? new Date(cookie.expires).toISOString() : undefined,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
    }));
    await this.client.setCookies(cookies);

    // Navigate to the URL
    if (state.history?.currentUrl) {
      await this.client.navigate(state.history.currentUrl);
    }

    // Apply localStorage
    for (const [origin, storage] of state.storage.localStorage.entries()) {
      if (origin === new URL(state.history?.currentUrl || '').origin) {
        await this.client.setLocalStorage(Object.fromEntries(storage));
      }
    }

    // Note: Skyvern doesn't support sessionStorage restoration directly
    // This would need to be implemented through custom page scripts
  }

  /**
   * Starts recording user interactions
   */
  async startRecording(options?: RecordingOptions): Promise<void> {
    this.recording = true;
    this.events = [];
    this.recordingStartTime = Date.now();

    // Note: Skyvern doesn't provide direct event recording
    // This would need to be implemented through custom instrumentation
    console.warn('Skyvern adapter: Recording is not fully supported - implement custom instrumentation');
  }

  /**
   * Stops recording and returns recorded events
   */
  async stopRecording(): Promise<Event[]> {
    this.recording = false;
    return [...this.events];
  }

  /**
   * Replays recorded events
   */
  async replay(events: Event[], options?: PlaybackOptions): Promise<void> {
    if (!this.client) {
      throw new Error('Not connected to a Skyvern client');
    }

    const speed = options?.speed || 1.0;

    for (const event of events) {
      // Wait for the appropriate timing
      const delay = event.timestamp / speed;
      await new Promise(resolve => setTimeout(resolve, delay));

      try {
        switch (event.type) {
          case 'click':
            if (event.target) {
              await this.client.click(event.target);
            }
            break;
          case 'input':
            if (event.target && event.data.value) {
              await this.client.type(event.target, event.data.value);
            }
            break;
          case 'navigation':
            if (event.data.url) {
              await this.client.navigate(event.data.url);
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
   * Plays back a recording from events
   */
  async playRecording(events: Event[], options?: PlaybackOptions): Promise<void> {
    await this.replay(events, options);
  }

  /**
   * Takes a screenshot (Skyvern-specific feature)
   */
  async screenshot(): Promise<Buffer> {
    if (!this.client) {
      throw new Error('Not connected to a Skyvern client');
    }
    return await this.client.screenshot();
  }

  /**
   * Waits for an element to appear (Skyvern-specific feature)
   */
  async waitForSelector(selector: string, timeout = 30000): Promise<void> {
    if (!this.client) {
      throw new Error('Not connected to a Skyvern client');
    }
    await this.client.waitForSelector(selector);
  }
}

// Export for use in other modules
export default SkyvernAdapter;