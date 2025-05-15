import { Page, BrowserContext } from 'playwright';
import { 
  Adapter,
  BrowserSessionState, 
  Event, 
  RecordingOptions, 
  PlaybackOptions 
} from '@psp/core';

/**
 * Adapter for Playwright
 */
export class PlaywrightAdapter extends Adapter {
  /** The Playwright page */
  private page?: Page;
  
  /** The Playwright browser context */
  private context?: BrowserContext;
  
  /** Recording in progress */
  private recording: boolean = false;
  
  /** Events recorded */
  private events: Event[] = [];
  
  /** Recording start time */
  private recordingStartTime: number = 0;
  
  /**
   * Creates a new PlaywrightAdapter
   */
  constructor(options: any = {}) {
    super({
      ...options,
      type: 'playwright'
    });
  }
  
  /**
   * Connects to a Playwright page or context
   */
  async connect(target: Page | BrowserContext): Promise<void> {
    if ((target as Page).context) {
      // It's a Page
      this.page = target as Page;
      this.context = this.page.context();
    } else {
      // It's a BrowserContext
      this.context = target as BrowserContext;
      // Get the first page or create one if none exists
      const pages = this.context.pages();
      if (pages.length > 0) {
        this.page = pages[0];
      } else {
        this.page = await this.context.newPage();
      }
    }
    
    await super.connect(target);
  }
  
  /**
   * Captures the current browser state
   */
  async captureState(): Promise<BrowserSessionState> {
    if (!this.page || !this.context) {
      throw new Error('Not connected to a Playwright page or context');
    }
    
    // Get current URL and title
    const url = this.page.url();
    const title = await this.page.title();
    const origin = new URL(url).origin;
    
    // Get storage state (cookies and localStorage)
    const storageState = await this.context.storageState();
    
    // Get session storage
    const sessionStorage = await this.getSessionStorage();
    
    // Get scroll position
    const scrollPosition = await this.page.evaluate(() => ({
      x: window.scrollX,
      y: window.scrollY
    }));
    
    // Build the full state object
    const state: BrowserSessionState = {
      version: '1.0.0',
      timestamp: Date.now(),
      origin,
      storage: {
        cookies: storageState.cookies.map(cookie => ({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          expires: cookie.expires ? cookie.expires * 1000 : null, // Convert to milliseconds
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite as 'Strict' | 'Lax' | 'None',
          partitioned: false // Playwright doesn't support partitioned cookies yet
        })),
        localStorage: this.convertPlaywrightStorageToMap(storageState.origins),
        sessionStorage: sessionStorage
      },
      dom: {
        html: await this.page.content(),
        scrollPosition
      },
      history: {
        currentUrl: url,
        entries: [
          {
            url,
            title,
            timestamp: Date.now(),
            scrollPosition
          }
        ],
        currentIndex: 0
      }
    };
    
    // Add recording if available
    if (this.recording && this.events.length > 0) {
      state.recording = {
        events: [...this.events],
        startTime: this.recordingStartTime,
        duration: Date.now() - this.recordingStartTime
      };
    }
    
    return state;
  }
  
  /**
   * Applies a browser state to the current page
   */
  async applyState(state: BrowserSessionState): Promise<void> {
    if (!this.page || !this.context) {
      throw new Error('Not connected to a Playwright page or context');
    }
    
    // Apply cookies
    await this.context.clearCookies();
    await this.context.addCookies(state.storage.cookies.map(cookie => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expires ? cookie.expires / 1000 : undefined, // Convert to seconds
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite
    })));
    
    // Navigate to the URL
    if (state.history?.currentUrl) {
      await this.page.goto(state.history.currentUrl, { waitUntil: 'domcontentloaded' });
    }
    
    // Apply localStorage
    for (const [origin, storage] of state.storage.localStorage.entries()) {
      await this.page.context().addInitScript(script => {
        if (window.location.origin === script.origin) {
          localStorage.clear();
          for (const [key, value] of Object.entries(script.storage)) {
            localStorage.setItem(key, value);
          }
        }
      }, { origin, storage: Object.fromEntries(storage) });
    }
    
    // Apply sessionStorage
    for (const [origin, storage] of state.storage.sessionStorage.entries()) {
      if (origin === new URL(this.page.url()).origin) {
        await this.page.evaluate(storage => {
          sessionStorage.clear();
          for (const [key, value] of Object.entries(storage)) {
            sessionStorage.setItem(key, value);
          }
        }, Object.fromEntries(storage));
      }
    }
    
    // Apply scroll position if available
    if (state.dom?.scrollPosition) {
      await this.page.evaluate(({ x, y }) => {
        window.scrollTo(x, y);
      }, state.dom.scrollPosition);
    }
    
    // Reload the page to ensure everything is applied
    await this.page.reload();
  }
  
  /**
   * Starts recording user interactions
   */
  async startRecording(options?: RecordingOptions): Promise<void> {
    if (!this.page) {
      throw new Error('Not connected to a Playwright page');
    }
    
    // Reset recording state
    this.events = [];
    this.recordingStartTime = Date.now();
    this.recording = true;
    
    // Determine which events to record
    const recordOptions = {
      click: true,
      input: true,
      keypress: true,
      navigation: true,
      scroll: false,
      network: false,
      ...options?.events
    };
    
    // Install event listeners via page.evaluate
    await this.page.evaluate(opts => {
      // Create global storage for events
      window._pspEvents = [];
      window._pspStartTime = Date.now();
      
      // Helper function to generate a CSS selector for an element
      function cssPath(el) {
        if (!el || !el.tagName) return '';
        
        const path = [];
        while (el.nodeType === Node.ELEMENT_NODE) {
          let selector = el.nodeName.toLowerCase();
          if (el.id) {
            selector += `#${el.id}`;
            path.unshift(selector);
            break;
          } else {
            let siblings = Array.from(el.parentNode.children);
            if (siblings.length > 1) {
              const index = siblings.indexOf(el);
              selector += `:nth-child(${index + 1})`;
            }
            path.unshift(selector);
            el = el.parentNode;
          }
        }
        return path.join(' > ');
      }
      
      // Record click events
      if (opts.click) {
        document.addEventListener('click', e => {
          window._pspEvents.push({
            type: 'click',
            timestamp: Date.now() - window._pspStartTime,
            target: cssPath(e.target),
            data: {
              button: e.button,
              clientX: e.clientX,
              clientY: e.clientY,
              altKey: e.altKey,
              ctrlKey: e.ctrlKey,
              shiftKey: e.shiftKey,
              metaKey: e.metaKey
            }
          });
        }, true);
      }
      
      // Record input events
      if (opts.input) {
        document.addEventListener('input', e => {
          if (e.target instanceof HTMLInputElement || 
              e.target instanceof HTMLTextAreaElement || 
              e.target instanceof HTMLSelectElement) {
            window._pspEvents.push({
              type: 'input',
              timestamp: Date.now() - window._pspStartTime,
              target: cssPath(e.target),
              data: {
                value: e.target.value
              }
            });
          }
        }, true);
      }
      
      // Record keypress events
      if (opts.keypress) {
        document.addEventListener('keydown', e => {
          window._pspEvents.push({
            type: 'keydown',
            timestamp: Date.now() - window._pspStartTime,
            target: cssPath(e.target),
            data: {
              key: e.key,
              code: e.code,
              altKey: e.altKey,
              ctrlKey: e.ctrlKey,
              shiftKey: e.shiftKey,
              metaKey: e.metaKey
            }
          });
        }, true);
      }
      
      // Record navigation events
      if (opts.navigation) {
        // This requires a different approach since we need to hook into browser navigation
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        
        history.pushState = function() {
          window._pspEvents.push({
            type: 'navigation',
            timestamp: Date.now() - window._pspStartTime,
            data: {
              url: arguments[2],
              navigationType: 'navigate'
            }
          });
          return originalPushState.apply(this, arguments);
        };
        
        history.replaceState = function() {
          window._pspEvents.push({
            type: 'navigation',
            timestamp: Date.now() - window._pspStartTime,
            data: {
              url: arguments[2],
              navigationType: 'navigate'
            }
          });
          return originalReplaceState.apply(this, arguments);
        };
        
        window.addEventListener('popstate', () => {
          window._pspEvents.push({
            type: 'navigation',
            timestamp: Date.now() - window._pspStartTime,
            data: {
              url: window.location.href,
              navigationType: 'back_forward'
            }
          });
        });
      }
      
      // Record scroll events
      if (opts.scroll) {
        let scrollTimeout: any = null;
        window.addEventListener('scroll', () => {
          if (scrollTimeout) {
            clearTimeout(scrollTimeout);
          }
          scrollTimeout = setTimeout(() => {
            window._pspEvents.push({
              type: 'scroll',
              timestamp: Date.now() - window._pspStartTime,
              data: {
                x: window.scrollX,
                y: window.scrollY
              }
            });
          }, 100); // Debounce scroll events
        }, true);
      }
    }, recordOptions);
    
    // Set up a polling interval to collect events
    this.startEventPolling();
  }
  
  /**
   * Stops recording and returns the recorded events
   */
  async stopRecording(): Promise<Event[]> {
    if (!this.page || !this.recording) {
      throw new Error('Recording is not in progress');
    }
    
    // Get final events
    await this.pollEvents();
    
    // Stop recording
    this.recording = false;
    
    // Return collected events
    return [...this.events];
  }
  
  /**
   * Plays back recorded events
   */
  async playRecording(events: Event[], options?: PlaybackOptions): Promise<void> {
    if (!this.page) {
      throw new Error('Not connected to a Playwright page');
    }
    
    const playbackOptions = {
      speed: 1.0,
      validateTargets: true,
      actionTimeout: 30000,
      ...options
    };
    
    // Play each event sequentially
    for (const event of events) {
      try {
        switch (event.type) {
          case 'click':
            await this.playClickEvent(event as any, playbackOptions);
            break;
          case 'input':
            await this.playInputEvent(event as any, playbackOptions);
            break;
          case 'keydown':
            await this.playKeyEvent(event as any, playbackOptions);
            break;
          case 'navigation':
            await this.playNavigationEvent(event as any, playbackOptions);
            break;
          case 'scroll':
            await this.playScrollEvent(event as any, playbackOptions);
            break;
          default:
            console.warn(`Unsupported event type: ${event.type}`);
        }
        
        // Add delay based on playback speed
        if (events.indexOf(event) < events.length - 1) {
          const nextEvent = events[events.indexOf(event) + 1];
          const delay = (nextEvent.timestamp - event.timestamp) / playbackOptions.speed;
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      } catch (error) {
        console.error(`Error playing event: ${event.type}`, error);
        if (playbackOptions.validateTargets) {
          throw error;
        }
      }
    }
  }
  
  /**
   * Plays a click event
   */
  private async playClickEvent(event: Event & { data: { button: number, clientX: number, clientY: number } }, options: any): Promise<void> {
    if (!this.page || !event.target) return;
    
    await this.page.click(event.target, {
      button: event.data.button as 'left' | 'right' | 'middle',
      timeout: options.actionTimeout,
      position: {
        x: event.data.clientX,
        y: event.data.clientY
      }
    });
  }
  
  /**
   * Plays an input event
   */
  private async playInputEvent(event: Event & { data: { value: string } }, options: any): Promise<void> {
    if (!this.page || !event.target) return;
    
    await this.page.fill(event.target, event.data.value, {
      timeout: options.actionTimeout
    });
  }
  
  /**
   * Plays a key event
   */
  private async playKeyEvent(event: Event & { data: { key: string } }, options: any): Promise<void> {
    if (!this.page) return;
    
    if (event.target) {
      await this.page.focus(event.target, { timeout: options.actionTimeout });
    }
    
    await this.page.keyboard.press(event.data.key);
  }
  
  /**
   * Plays a navigation event
   */
  private async playNavigationEvent(event: Event & { data: { url: string } }, options: any): Promise<void> {
    if (!this.page) return;
    
    await this.page.goto(event.data.url, {
      timeout: options.actionTimeout,
      waitUntil: 'domcontentloaded'
    });
  }
  
  /**
   * Plays a scroll event
   */
  private async playScrollEvent(event: Event & { data: { x: number, y: number } }, options: any): Promise<void> {
    if (!this.page) return;
    
    await this.page.evaluate(({ x, y }) => {
      window.scrollTo(x, y);
    }, event.data);
  }
  
  /**
   * Starts polling for events during recording
   */
  private async startEventPolling(): Promise<void> {
    if (!this.recording) return;
    
    // Poll for events every 500ms
    setTimeout(async () => {
      await this.pollEvents();
      if (this.recording) {
        await this.startEventPolling();
      }
    }, 500);
  }
  
  /**
   * Polls for new events from the page
   */
  private async pollEvents(): Promise<void> {
    if (!this.page || !this.recording) return;
    
    try {
      const newEvents = await this.page.evaluate(() => {
        const events = window._pspEvents || [];
        window._pspEvents = [];
        return events;
      });
      
      this.events.push(...newEvents);
    } catch (error) {
      console.error('Error polling events:', error);
    }
  }
  
  /**
   * Gets the session storage from the page
   */
  private async getSessionStorage(): Promise<Map<string, Map<string, string>>> {
    if (!this.page) {
      return new Map();
    }
    
    try {
      const origin = new URL(this.page.url()).origin;
      const sessionStorageData = await this.page.evaluate(() => {
        const data: Record<string, string> = {};
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key) {
            data[key] = sessionStorage.getItem(key) || '';
          }
        }
        return data;
      });
      
      const result = new Map<string, Map<string, string>>();
      result.set(origin, new Map(Object.entries(sessionStorageData)));
      return result;
    } catch (error) {
      console.error('Error getting sessionStorage:', error);
      return new Map();
    }
  }
  
  /**
   * Converts Playwright storage format to PSP format
   */
  private convertPlaywrightStorageToMap(origins: Array<{ origin: string, localStorage: Record<string, string> }>): Map<string, Map<string, string>> {
    const result = new Map<string, Map<string, string>>();
    
    for (const origin of origins) {
      const storageMap = new Map<string, string>();
      for (const [key, value] of Object.entries(origin.localStorage)) {
        storageMap.set(key, value);
      }
      result.set(origin.origin, storageMap);
    }
    
    return result;
  }
}