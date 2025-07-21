/**
 * Hyperbrowser Adapter for PSP
 * Integrates PSP with Hyperbrowser AI cloud browser platform
 */

import { Adapter, SessionOptions, PlaybackOptions } from '@psp/core';
import { BrowserSessionState, Event, Session } from '@psp/core';
import { chromium, Browser, BrowserContext, Page } from 'playwright-core';

interface HyperbrowserConfig {
  apiKey: string;
  teamId?: string;
  profileId?: string;
  persistChanges?: boolean;
  useStealth?: boolean;
  useProxy?: boolean;
  proxyCountry?: string;
  proxyState?: string;
  proxyCity?: string;
  operatingSystems?: string[];
  device?: ('desktop' | 'mobile')[];
  platform?: string[];
  locales?: string[];
  screen?: {
    width: number;
    height: number;
  };
  solveCaptchas?: boolean;
  adblock?: boolean;
  trackers?: boolean;
  annoyances?: boolean;
  acceptCookies?: boolean;
  enableWebRecording?: boolean;
}

export { HyperbrowserConfig };

export class HyperbrowserAdapter extends Adapter {
  private config: HyperbrowserConfig;
  private browser?: Browser;
  private context?: BrowserContext;
  private page?: Page;
  private sessionId?: string;
  private recording = false;
  private events: Event[] = [];
  private recordingStartTime = 0;

  constructor(config: HyperbrowserConfig) {
    super({
      type: 'hyperbrowser',
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
   * Connect to Hyperbrowser
   */
  async connect(): Promise<void> {
    try {
      // Create session
      await this.createHyperbrowserSession();

      // Connect to Hyperbrowser via CDP
      if (!this.sessionId) {
        throw new Error('Failed to create Hyperbrowser session');
      }

      // Get session details to get WebSocket endpoint
      const sessionDetails = await this.getSessionDetails(this.sessionId);
      
      if (!sessionDetails.wsEndpoint) {
        throw new Error('No WebSocket endpoint provided by Hyperbrowser');
      }

      this.browser = await chromium.connectOverCDP(sessionDetails.wsEndpoint);
      
      // Get or create context and page
      const contexts = this.browser.contexts();
      this.context = contexts.length > 0 ? contexts[0] : await this.browser.newContext();
      this.page = await this.context.newPage();

      console.log('✅ Connected to Hyperbrowser');
    } catch (error) {
      throw new Error(`Failed to connect to Hyperbrowser: ${error}`);
    }
  }

  /**
   * Create a new Hyperbrowser session
   */
  private async createHyperbrowserSession(): Promise<void> {
    const requestBody: any = {
      useStealth: this.config.useStealth,
      useProxy: this.config.useProxy,
      proxyCountry: this.config.proxyCountry,
      proxyState: this.config.proxyState,
      proxyCity: this.config.proxyCity,
      operatingSystems: this.config.operatingSystems,
      device: this.config.device,
      platform: this.config.platform,
      locales: this.config.locales,
      screen: this.config.screen,
      solveCaptchas: this.config.solveCaptchas,
      adblock: this.config.adblock,
      trackers: this.config.trackers,
      annoyances: this.config.annoyances,
      acceptCookies: this.config.acceptCookies,
      enableWebRecording: this.config.enableWebRecording,
    };

    // Add profile configuration if provided
    if (this.config.profileId) {
      requestBody.profile = {
        id: this.config.profileId,
        persistChanges: this.config.persistChanges || false,
      };
    }

    const response = await fetch('https://api.hyperbrowser.ai/api/session', {
      method: 'POST',
      headers: {
        'x-api-key': this.config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Failed to create Hyperbrowser session: ${response.statusText}`);
    }

    const session = await response.json();
    this.sessionId = session.id;
    console.log(`✅ Created Hyperbrowser session: ${session.id}`);
  }

  /**
   * Get session details from Hyperbrowser
   */
  private async getSessionDetails(sessionId: string): Promise<any> {
    const response = await fetch(`https://api.hyperbrowser.ai/api/session/${sessionId}`, {
      method: 'GET',
      headers: {
        'x-api-key': this.config.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get session details: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Create a new Hyperbrowser profile
   */
  async createProfile(name?: string): Promise<string> {
    const response = await fetch('https://api.hyperbrowser.ai/api/profile', {
      method: 'POST',
      headers: {
        'x-api-key': this.config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(name ? { name } : {}),
    });

    if (!response.ok) {
      throw new Error(`Failed to create profile: ${response.statusText}`);
    }

    const profile = await response.json();
    console.log(`✅ Created Hyperbrowser profile: ${profile.id}`);
    return profile.id;
  }

  /**
   * List available profiles
   */
  async listProfiles(): Promise<any[]> {
    const response = await fetch('https://api.hyperbrowser.ai/api/profiles', {
      method: 'GET',
      headers: {
        'x-api-key': this.config.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to list profiles: ${response.statusText}`);
    }

    const data = await response.json();
    return data.profiles || [];
  }

  /**
   * Navigate to a URL
   */
  async navigate(url: string): Promise<void> {
    if (!this.page) {
      throw new Error('Not connected to Hyperbrowser');
    }
    await this.page.goto(url);
  }

  /**
   * Capture current browser state
   */
  async captureState(): Promise<BrowserSessionState> {
    if (!this.page || !this.context) {
      throw new Error('Not connected to Hyperbrowser');
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
          partitioned: false, // Hyperbrowser doesn't expose this yet
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
        hyperbrowserSessionId: this.sessionId,
        hyperbrowserProfileId: this.config.profileId,
      },
    };
  }

  /**
   * Restore browser state
   */
  async applyState(state: BrowserSessionState): Promise<void> {
    if (!this.page || !this.context) {
      throw new Error('Not connected to Hyperbrowser');
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
      throw new Error('Not connected to Hyperbrowser');
    }

    this.recording = true;
    this.events = [];
    this.recordingStartTime = Date.now();

    // Set up event listeners
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

      // Track input changes
      document.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const selector = target.tagName.toLowerCase() + 
          (target.id ? `#${target.id}` : '') +
          (target.name ? `[name="${target.name}"]` : '');

        events.push({
          type: 'input',
          timestamp: Date.now() - startTime,
          target: selector,
          data: {
            value: target.value,
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
      throw new Error('Not connected to Hyperbrowser');
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
      throw new Error('Not connected to Hyperbrowser');
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
   * Get session live URL for monitoring
   */
  async getLiveUrl(): Promise<string | null> {
    if (!this.sessionId) {
      return null;
    }

    try {
      const sessionDetails = await this.getSessionDetails(this.sessionId);
      return sessionDetails.liveUrl || null;
    } catch (error) {
      console.warn('Could not get live URL:', error);
      return null;
    }
  }

  /**
   * Get session recording data
   */
  async getSessionRecording(): Promise<any[]> {
    if (!this.sessionId) {
      return [];
    }

    try {
      const response = await fetch(
        `https://api.hyperbrowser.ai/api/session/${this.sessionId}/recording`,
        {
          method: 'GET',
          headers: {
            'x-api-key': this.config.apiKey,
          },
        }
      );

      if (!response.ok) {
        return [];
      }

      return await response.json();
    } catch (error) {
      console.warn('Could not get session recording:', error);
      return [];
    }
  }

  /**
   * Stop the Hyperbrowser session
   */
  async stopSession(): Promise<void> {
    if (!this.sessionId) {
      return;
    }

    try {
      const response = await fetch(
        `https://api.hyperbrowser.ai/api/session/${this.sessionId}/stop`,
        {
          method: 'PUT',
          headers: {
            'x-api-key': this.config.apiKey,
          },
        }
      );

      if (response.ok) {
        console.log('✅ Hyperbrowser session stopped');
      }
    } catch (error) {
      console.warn('Could not stop session:', error);
    }
  }

  /**
   * Disconnect from Hyperbrowser
   */
  async disconnect(): Promise<void> {
    if (this.page) {
      await this.page.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
    await this.stopSession();
  }

  /**
   * Export session for use with other Hyperbrowser features
   */
  async exportForHyperbrowser(): Promise<{
    sessionId: string;
    profileId: string | undefined;
    liveUrl: string | null;
    recording: any[];
    storageState: any;
  }> {
    if (!this.sessionId || !this.context) {
      throw new Error('No active Hyperbrowser session');
    }

    const storageState = await this.context.storageState();
    const liveUrl = await this.getLiveUrl();
    const recording = await this.getSessionRecording();

    return {
      sessionId: this.sessionId,
      profileId: this.config.profileId,
      liveUrl,
      recording,
      storageState,
    };
  }
}

export default HyperbrowserAdapter;