import { PSPAdapter, SessionData, SessionMetadata } from '@psp/core';
import { Browser, BrowserContext } from 'playwright';

export interface BrowserUseConfig {
  headless?: boolean;
  userDataDir?: string;
  viewport?: { width: number; height: number };
  locale?: string;
  timezone?: string;
  permissions?: string[];
}

export class BrowserUseAdapter implements PSPAdapter {
  private config: BrowserUseConfig;
  private browser?: Browser;
  private context?: BrowserContext;
  private userDataDir?: string;

  constructor(config: BrowserUseConfig = {}) {
    this.config = {
      headless: false,
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      timezone: 'America/New_York',
      permissions: ['clipboard-read', 'clipboard-write'],
      ...config
    };
  }

  async initialize(): Promise<void> {
    // Browser-use typically works with persistent contexts
    // This adapter provides PSP integration for browser-use workflows
    console.log('✅ Browser-use adapter initialized');
  }

  async createSession(metadata: SessionMetadata): Promise<string> {
    // Create session compatible with browser-use patterns
    const { chromium } = await import('playwright');
    
    if (this.config.userDataDir) {
      // Use persistent context (recommended for browser-use)
      this.context = await chromium.launchPersistentContext(this.config.userDataDir, {
        headless: this.config.headless,
        viewport: this.config.viewport,
        locale: this.config.locale,
        timezoneId: this.config.timezone,
        permissions: this.config.permissions,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security',
          '--allow-running-insecure-content'
        ]
      });
      
      this.browser = this.context.browser()!;
    } else {
      // Regular browser context
      this.browser = await chromium.launch({
        headless: this.config.headless,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security'
        ]
      });
      
      this.context = await this.browser.newContext({
        viewport: this.config.viewport,
        locale: this.config.locale,
        timezoneId: this.config.timezone,
        permissions: this.config.permissions
      });
    }

    return metadata.id;
  }

  async captureSession(sessionId: string): Promise<SessionData> {
    if (!this.context) {
      throw new Error('No active session context');
    }

    // Capture comprehensive session data for browser-use workflows
    const cookies = await this.context.cookies();
    const pages = this.context.pages();
    
    const sessionData: any = {};
    const storageData: Record<string, any> = {};
    
    // Capture data from all pages
    for (const page of pages) {
      const url = page.url();
      if (url && url.startsWith('http')) {
        try {
          // Capture browser-use specific data
          const pageData = await page.evaluate(() => {
            const data: any = {
              url: window.location.href,
              title: document.title,
              localStorage: Object.fromEntries(Object.entries(localStorage)),
              sessionStorage: Object.fromEntries(Object.entries(sessionStorage)),
              userAgent: navigator.userAgent,
              language: navigator.language,
              platform: navigator.platform,
              cookieEnabled: navigator.cookieEnabled,
              onLine: navigator.onLine
            };

            // Capture form data and input states (common in browser-use)
            const forms = Array.from(document.forms);
            data.forms = forms.map((form, index) => ({
              id: form.id || `form-${index}`,
              action: form.action,
              method: form.method,
              inputs: Array.from(form.elements).map((element: any) => ({
                name: element.name,
                type: element.type,
                value: element.value,
                checked: element.checked,
                selected: element.selected
              }))
            }));

            // Capture scroll position
            data.scroll = {
              x: window.scrollX,
              y: window.scrollY
            };

            // Capture selected text
            const selection = window.getSelection();
            if (selection && selection.toString()) {
              data.selection = {
                text: selection.toString(),
                anchorOffset: selection.anchorOffset,
                focusOffset: selection.focusOffset
              };
            }

            return data;
          });
          
          storageData[url] = pageData;
        } catch (error) {
          console.warn(`Failed to capture page data for ${url}:`, error.message);
        }
      }
    }

    return {
      sessionId,
      cookies,
      localStorage: storageData,
      sessionStorage: storageData,
      capturedAt: Date.now(),
      browserType: 'chromium-browser-use',
      metadata: {
        userAgent: storageData[Object.keys(storageData)[0]]?.userAgent || '',
        viewport: this.config.viewport!,
        timezone: this.config.timezone!,
        locale: this.config.locale!,
        browserUseData: {
          forms: Object.values(storageData).flatMap((data: any) => data.forms || []),
          scrollPositions: Object.fromEntries(
            Object.entries(storageData).map(([url, data]: [string, any]) => [
              url, 
              data.scroll || { x: 0, y: 0 }
            ])
          )
        }
      }
    };
  }

  async restoreSession(sessionData: SessionData): Promise<void> {
    if (!this.context) {
      throw new Error('No browser context available');
    }

    // Restore cookies
    if (sessionData.cookies && sessionData.cookies.length > 0) {
      await this.context.addCookies(sessionData.cookies);
    }

    // Restore session data for each page/origin
    for (const [url, pageData] of Object.entries(sessionData.localStorage || {})) {
      try {
        const page = await this.context.newPage();
        await page.goto(url);
        
        // Restore page state
        await page.evaluate((data: any) => {
          // Restore localStorage
          if (data.localStorage) {
            for (const [key, value] of Object.entries(data.localStorage)) {
              localStorage.setItem(key, value as string);
            }
          }
          
          // Restore sessionStorage
          if (data.sessionStorage) {
            for (const [key, value] of Object.entries(data.sessionStorage)) {
              sessionStorage.setItem(key, value as string);
            }
          }

          // Restore scroll position
          if (data.scroll) {
            window.scrollTo(data.scroll.x, data.scroll.y);
          }

          // Restore form data (browser-use specific)
          if (data.forms) {
            data.forms.forEach((formData: any) => {
              const form = document.getElementById(formData.id) || 
                          document.querySelector(`form[action="${formData.action}"]`);
              
              if (form && formData.inputs) {
                formData.inputs.forEach((inputData: any) => {
                  const input = form.querySelector(`[name="${inputData.name}"]`) as HTMLInputElement;
                  if (input) {
                    if (inputData.type === 'checkbox' || inputData.type === 'radio') {
                      input.checked = inputData.checked;
                    } else if (inputData.type === 'select') {
                      input.selected = inputData.selected;
                    } else {
                      input.value = inputData.value;
                    }
                  }
                });
              }
            });
          }

          // Restore text selection
          if (data.selection) {
            const range = document.createRange();
            const selection = window.getSelection();
            if (selection) {
              selection.removeAllRanges();
              // Note: Full text selection restoration would need more complex logic
              // This is a basic implementation
            }
          }
        }, pageData);

        console.log(`✅ Restored browser-use session state for ${url}`);
      } catch (error) {
        console.warn(`Failed to restore page state for ${url}:`, error.message);
      }
    }
  }

  async getContext(): Promise<BrowserContext> {
    if (!this.context) {
      throw new Error('No active session context. Call createSession first.');
    }
    return this.context;
  }

  async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      throw new Error('No active browser. Call createSession first.');
    }
    return this.browser;
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

  // Browser-use specific methods
  async captureInteractionState(page: any): Promise<any> {
    return await page.evaluate(() => {
      // Capture current focus, hover states, etc.
      const activeElement = document.activeElement;
      const hoveredElements = document.querySelectorAll(':hover');
      
      return {
        activeElement: activeElement ? {
          tagName: activeElement.tagName,
          id: activeElement.id,
          className: activeElement.className,
          value: (activeElement as HTMLInputElement).value
        } : null,
        hoveredElements: Array.from(hoveredElements).map(el => ({
          tagName: el.tagName,
          id: el.id,
          className: el.className
        })),
        timestamp: Date.now()
      };
    });
  }

  async restoreInteractionState(page: any, state: any): Promise<void> {
    if (!state) return;

    await page.evaluate((interactionState: any) => {
      // Restore focus
      if (interactionState.activeElement) {
        const element = document.getElementById(interactionState.activeElement.id) ||
                       document.querySelector(`.${interactionState.activeElement.className}`);
        if (element && element instanceof HTMLElement) {
          element.focus();
        }
      }
      
      // Note: Hover states are typically not restorable programmatically
      // They would need user interaction to be truly restored
    }, state);
  }

  async enableBrowserUseFeatures(): Promise<void> {
    if (!this.context) {
      throw new Error('No active context');
    }

    // Enable browser-use specific features
    await this.context.addInitScript(() => {
      // Remove automation detection
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Enhanced clipboard access for browser-use
      if (!navigator.clipboard) {
        (navigator as any).clipboard = {
          writeText: (text: string) => Promise.resolve(),
          readText: () => Promise.resolve('')
        };
      }

      // Add browser-use detection
      (window as any).__BROWSER_USE_ENABLED__ = true;
      (window as any).__PSP_ADAPTER__ = 'browser-use';
    });
  }
}

// Export factory function
export function createBrowserUseAdapter(config?: BrowserUseConfig): BrowserUseAdapter {
  return new BrowserUseAdapter(config);
}

// Export types
export type { BrowserUseConfig };