import { Adapter, BrowserSessionState, AdapterOptions, Event, RecordingOptions, PlaybackOptions } from '@psp/core';
import { Protocol } from 'puppeteer';

/**
 * Options for configuring the Puppeteer adapter
 */
export interface PuppeteerAdapterOptions extends AdapterOptions {
  /**
   * Whether to use Chrome DevTools Protocol for advanced features
   */
  useCDP?: boolean;
  
  /**
   * Existing CDP client to use
   */
  cdpClient?: any;
}

/**
 * Adapter implementation for Puppeteer framework
 */
export class PuppeteerAdapter extends Adapter {
  private page: any;
  private options: PuppeteerAdapterOptions;
  private cdpClient: any;
  
  /**
   * Creates a new PuppeteerAdapter instance
   * 
   * @param options Configuration options for the adapter
   */
  constructor(options: PuppeteerAdapterOptions = {}) {
    super({
      ...options,
      type: 'puppeteer'
    });
    
    this.options = options;
    
    // If a CDP client is provided, use it
    if (options.cdpClient) {
      this.cdpClient = options.cdpClient;
    }
  }
  
  /**
   * Connects the adapter to a Puppeteer page instance
   * 
   * @param page The Puppeteer page instance
   */
  async connect(page: any): Promise<void> {
    this.page = page;
    
    // If CDP is enabled but no client is provided, create one
    if (this.options.useCDP && !this.cdpClient) {
      try {
        this.cdpClient = await page.target().createCDPSession();
      } catch (error) {
        console.warn('Failed to create CDP session:', error);
      }
    }
    
    await super.connect(page);
  }
  
  /**
   * Captures the current browser state
   * 
   * @returns The captured browser session state
   */
  async captureState(): Promise<BrowserSessionState> {
    if (!this.page) {
      throw new Error('Not connected to a page');
    }
    
    // Get current URL and extract origin
    const url = await this.page.url();
    const origin = new URL(url).origin;
    
    // Get page title
    const title = await this.page.title();
    
    // Capture cookies
    const cookies = await this.page.cookies();
    
    // Capture localStorage and sessionStorage
    const storage = await this.page.evaluate(() => {
      const localStorage: Record<string, string> = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          localStorage[key] = window.localStorage.getItem(key) || '';
        }
      }
      
      const sessionStorage: Record<string, string> = {};
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key) {
          sessionStorage[key] = window.sessionStorage.getItem(key) || '';
        }
      }
      
      return { localStorage, sessionStorage };
    });
    
    // Build extensions object
    const extensions: Record<string, unknown> = {};
    
    // If using CDP, capture network state
    if (this.cdpClient && this.options.useCDP) {
      try {
        // Enable network interception if not already enabled
        try {
          await this.cdpClient.send('Network.enable');
        } catch (error) {
          // Network might already be enabled
        }
        
        // Get HTTP authentication state if present
        try {
          const authState = await this.cdpClient.send('Network.getResponseBody', {
            // This will fail if no auth is present, which is fine
          }).catch(() => null);
          
          if (authState) {
            extensions.httpAuth = authState;
          }
        } catch (error) {
          // No HTTP auth state available
        }
      } catch (error) {
        console.warn('Failed to capture CDP network state:', error);
      }
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
   * Applies a previously captured browser state to the current page
   * 
   * @param state The browser session state to apply
   */
  async applyState(state: BrowserSessionState): Promise<void> {
    if (!this.page) {
      throw new Error('Not connected to a page');
    }
    
    // Navigate to the URL if history is available
    if (state.history?.currentUrl) {
      await this.page.goto(state.history.currentUrl, { waitUntil: 'domcontentloaded' });
    }
    
    // Apply cookies
    const cookies = state.storage.cookies.map(cookie => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain || undefined,
      path: cookie.path || '/',
      expires: cookie.expires ? new Date(cookie.expires).getTime() / 1000 : undefined,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite as Protocol.Network.CookieSameSite
    }));
    
    await this.page.setCookie(...cookies);
    
    // Get current URL and origin
    const url = await this.page.url();
    const origin = new URL(url).origin;
    
    // Apply localStorage and sessionStorage
    const localStorage = state.storage.localStorage.get(origin);
    const sessionStorage = state.storage.sessionStorage.get(origin);
    
    await this.page.evaluate(
      ({ localStorage, sessionStorage }) => {
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
      },
      {
        localStorage: localStorage ? Object.fromEntries(localStorage) : {},
        sessionStorage: sessionStorage ? Object.fromEntries(sessionStorage) : {}
      }
    );
    
    // Apply HTTP authentication if available and using CDP
    if (this.cdpClient && this.options.useCDP && state.extensions?.httpAuth) {
      try {
        // This will depend on the exact state structure stored
        // and would need to be adapted to the specific auth mechanism
        console.log('HTTP auth state is available but requires specific implementation');
      } catch (error) {
        console.warn('Failed to restore HTTP auth state:', error);
      }
    }
    
    // Refresh the page to apply all state
    await this.page.reload({ waitUntil: 'domcontentloaded' });
  }
  
  /**
   * Starts recording user interactions
   * 
   * @param options Optional recording options
   */
  async startRecording(options?: RecordingOptions): Promise<void> {
    if (!this.page) {
      throw new Error('Not connected to a page');
    }
    
    // Initialize recording in the browser
    await this.page.evaluate(() => {
      window._pspEvents = [];
      window._pspStartTime = Date.now();
      
      // Helper function to record events
      window._pspRecordEvent = (type: string, target: any, data: any) => {
        window._pspEvents.push({
          type,
          timestamp: Date.now() - window._pspStartTime,
          target,
          data
        });
      };
      
      // Record clicks
      document.addEventListener('click', (e) => {
        window._pspRecordEvent('click', {
          tag: e.target.tagName,
          id: e.target.id,
          className: e.target.className,
          text: e.target.innerText?.trim().substring(0, 100)
        }, {
          x: e.clientX,
          y: e.clientY
        });
      });
      
      // Record form interactions
      document.addEventListener('input', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
          window._pspRecordEvent('input', {
            tag: e.target.tagName,
            id: e.target.id,
            name: e.target.name,
            type: e.target.type
          }, {
            value: e.target.type === 'password' ? '********' : e.target.value
          });
        }
      });
      
      // Record form submissions
      document.addEventListener('submit', (e) => {
        window._pspRecordEvent('submit', {
          tag: 'FORM',
          id: e.target.id,
          action: e.target.action
        }, {});
      });
      
      // Record navigation
      const originalPushState = history.pushState;
      history.pushState = function() {
        window._pspRecordEvent('navigation', 'history', {
          url: arguments[2]
        });
        return originalPushState.apply(this, arguments);
      };
      
      window.addEventListener('popstate', () => {
        window._pspRecordEvent('navigation', 'popstate', {
          url: window.location.href
        });
      });
      
      return 'Recording started';
    });
    
    // If using CDP, also record network events
    if (this.cdpClient && this.options.useCDP) {
      try {
        // Enable network monitoring
        await this.cdpClient.send('Network.enable');
        
        // Listen for network events
        this.cdpClient.on('Network.requestWillBeSent', (event: any) => {
          if (event.request.method !== 'GET') {
            this.page.evaluate((event: any) => {
              window._pspRecordEvent('network', 'request', {
                url: event.request.url,
                method: event.request.method,
                headers: event.request.headers,
                postData: event.request.postData
              });
            }, event);
          }
        });
      } catch (error) {
        console.warn('Failed to set up CDP network recording:', error);
      }
    }
  }
  
  /**
   * Stops recording and returns the recorded events
   * 
   * @returns The recorded events
   */
  async stopRecording(): Promise<Event[]> {
    if (!this.page) {
      throw new Error('Not connected to a page');
    }
    
    // Get events recorded in the browser
    const events = await this.page.evaluate(() => {
      const events = window._pspEvents || [];
      window._pspEvents = [];
      return events;
    });
    
    // If using CDP, clean up network listeners
    if (this.cdpClient && this.options.useCDP) {
      try {
        // Remove all network listeners
        this.cdpClient.removeAllListeners('Network.requestWillBeSent');
      } catch (error) {
        console.warn('Failed to clean up CDP network listeners:', error);
      }
    }
    
    return events;
  }
  
  /**
   * Plays back recorded events
   * 
   * @param events The events to play back
   * @param options Optional playback options
   */
  async playRecording(events: Event[], options?: PlaybackOptions): Promise<void> {
    if (!this.page) {
      throw new Error('Not connected to a page');
    }
    
    const speed = options?.speed || 1;
    
    for (const event of events) {
      try {
        switch (event.type) {
          case 'click': {
            const targetInfo = this.extractTargetInfo(event.target);
            
            // Try different selector strategies based on available information
            if (targetInfo.id) {
              await this.page.click(`#${targetInfo.id}`);
            } else if (targetInfo.className) {
              const className = targetInfo.className.split(' ')[0];
              await this.page.click(`.${className}`);
            } else if (targetInfo.text) {
              // Use XPath for text-based selection
              const elements = await this.page.$x(`//*[contains(text(), '${targetInfo.text}')]`);
              if (elements.length > 0) {
                await elements[0].click();
              }
            } else if (targetInfo.tag) {
              await this.page.click(targetInfo.tag);
            }
            
            // Wait briefly for any resulting actions to take effect
            await this.page.waitForTimeout(50 / (speed || 1));
            break;
          }
          
          case 'input': {
            const targetInfo = this.extractTargetInfo(event.target);
            const value = event.data?.value;
            
            if (value !== undefined) {
              let selector;
              
              if (targetInfo.id) {
                selector = `#${targetInfo.id}`;
              } else if (targetInfo.name) {
                selector = `[name="${targetInfo.name}"]`;
              } else if (targetInfo.tag && targetInfo.type) {
                selector = `${targetInfo.tag}[type="${targetInfo.type}"]`;
              }
              
              if (selector) {
                await this.page.type(selector, value);
              }
            }
            break;
          }
          
          case 'submit': {
            const targetInfo = this.extractTargetInfo(event.target);
            
            if (targetInfo.id) {
              await this.page.evaluate((id) => {
                const form = document.getElementById(id);
                if (form) {
                  form.submit();
                }
              }, targetInfo.id);
            } else {
              await this.page.evaluate(() => {
                document.querySelector('form')?.submit();
              });
            }
            
            // Wait for navigation to complete
            await this.page.waitForNavigation({ waitUntil: 'domcontentloaded' });
            break;
          }
          
          case 'navigation': {
            const url = event.data?.url;
            if (url) {
              await this.page.goto(url, { waitUntil: 'domcontentloaded' });
            }
            break;
          }
          
          case 'network': {
            // Network events are informational only and don't need to be replayed
            break;
          }
        }
        
        // Add delay between events based on speed
        if (speed > 0) {
          await this.page.waitForTimeout(100 / speed);
        }
      } catch (error) {
        console.warn(`Error during playback of ${event.type} event:`, error);
      }
    }
  }
  
  /**
   * Extracts target information from a target object or string
   * 
   * @param target The target object or string
   * @returns Extracted target information
   */
  private extractTargetInfo(target: any): {
    id?: string;
    className?: string;
    tag?: string;
    text?: string;
    name?: string;
    type?: string;
  } {
    if (typeof target === 'string') {
      return { tag: target };
    }
    
    return {
      id: target.id,
      className: target.className,
      tag: target.tag,
      text: target.text,
      name: target.name,
      type: target.type
    };
  }
  
  /**
   * Normalizes cookies to a common format
   * 
   * @param cookies The cookies array from Puppeteer
   * @returns Normalized cookies array
   */
  private normalizeCookies(cookies: Protocol.Network.Cookie[]): Array<{
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
      path: cookie.path,
      expires: cookie.expires ? cookie.expires * 1000 : undefined, // Convert seconds to milliseconds
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite as 'Strict' | 'Lax' | 'None' | undefined
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