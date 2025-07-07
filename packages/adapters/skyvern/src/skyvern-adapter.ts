import { PSPAdapter, SessionData, SessionMetadata } from '@psp/core';
import { Browser, BrowserContext, Page } from 'playwright';
import axios from 'axios';

export interface SkyvermConfig {
  apiKey: string;
  apiUrl?: string;
  organizationId?: string;
  workflowId?: string;
  timeout?: number;
  headless?: boolean;
}

export interface SkyvernTask {
  id: string;
  status: 'created' | 'running' | 'completed' | 'failed';
  url: string;
  workflow: any;
  extractedData?: any;
  screenshots?: string[];
}

export class SkyvernAdapter implements PSPAdapter {
  private config: SkyvermConfig;
  private browser?: Browser;
  private context?: BrowserContext;
  private currentTask?: SkyvernTask;
  private sessionData?: SessionData;

  constructor(config: SkyvermConfig) {
    this.config = {
      apiUrl: 'https://api.skyvern.com/api/v1',
      timeout: 60000,
      headless: false,
      ...config
    };
  }

  async initialize(): Promise<void> {
    const { chromium } = await import('playwright');
    
    this.browser = await chromium.launch({
      headless: this.config.headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--allow-running-insecure-content'
      ]
    });

    console.log('✅ Skyvern adapter initialized');
  }

  async createSession(metadata: SessionMetadata): Promise<string> {
    if (!this.browser) {
      await this.initialize();
    }

    // Create browser context optimized for Skyvern workflows
    this.context = await this.browser!.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'en-US',
      timezoneId: 'America/New_York'
    });

    // Add Skyvern-specific initialization scripts
    await this.context.addInitScript(() => {
      // Remove automation detection
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Enhanced DOM manipulation for Skyvern workflows
      (window as any).__SKYVERN_ENHANCED__ = true;
      
      // Add workflow tracking
      (window as any).__PSP_SKYVERN_SESSION__ = {
        sessionId: metadata.id,
        startTime: Date.now(),
        actions: []
      };

      // Intercept and log actions for workflow replay
      const originalClick = HTMLElement.prototype.click;
      HTMLElement.prototype.click = function() {
        (window as any).__PSP_SKYVERN_SESSION__.actions.push({
          type: 'click',
          selector: this.tagName + (this.id ? '#' + this.id : '') + (this.className ? '.' + this.className.split(' ').join('.') : ''),
          timestamp: Date.now()
        });
        return originalClick.apply(this, arguments);
      };
    });

    return metadata.id;
  }

  async captureSession(sessionId: string): Promise<SessionData> {
    if (!this.context) {
      throw new Error('No active session context');
    }

    const pages = this.context.pages();
    const sessionData: any = {};
    const workflowData: any = {};

    // Capture Skyvern-specific workflow data
    for (const page of pages) {
      const url = page.url();
      if (url && url.startsWith('http')) {
        try {
          const skyvernData = await page.evaluate(() => {
            const session = (window as any).__PSP_SKYVERN_SESSION__;
            
            return {
              // Standard browser data
              url: window.location.href,
              title: document.title,
              localStorage: Object.fromEntries(Object.entries(localStorage)),
              sessionStorage: Object.fromEntries(Object.entries(sessionStorage)),
              
              // Skyvern workflow data
              workflowActions: session?.actions || [],
              extractableData: {
                forms: Array.from(document.forms).map((form, i) => ({
                  id: form.id || `form-${i}`,
                  action: form.action,
                  method: form.method,
                  fields: Array.from(form.elements).map((el: any) => ({
                    name: el.name,
                    type: el.type,
                    value: el.value,
                    placeholder: el.placeholder,
                    required: el.required
                  }))
                })),
                
                buttons: Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]')).map((btn: any, i) => ({
                  id: btn.id || `button-${i}`,
                  text: btn.textContent || btn.value,
                  type: btn.type,
                  className: btn.className
                })),
                
                links: Array.from(document.querySelectorAll('a[href]')).map((link: any, i) => ({
                  id: link.id || `link-${i}`,
                  href: link.href,
                  text: link.textContent,
                  target: link.target
                })),
                
                dataElements: Array.from(document.querySelectorAll('[data-testid], [data-cy], [data-test]')).map((el: any, i) => ({
                  id: el.id || `data-${i}`,
                  dataset: el.dataset,
                  tagName: el.tagName,
                  text: el.textContent?.substring(0, 100)
                }))
              },
              
              // Page structure for workflow recreation
              pageStructure: {
                headings: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
                  level: h.tagName,
                  text: h.textContent
                })),
                navigation: Array.from(document.querySelectorAll('nav, .nav, .navigation')).map(nav => ({
                  html: nav.innerHTML.substring(0, 500)
                }))
              }
            };
          });
          
          sessionData[url] = skyvernData;
          workflowData[url] = skyvernData.workflowActions;
        } catch (error) {
          console.warn(`Failed to capture Skyvern data for ${url}:`, error.message);
        }
      }
    }

    // Capture cookies
    const cookies = await this.context.cookies();

    return {
      sessionId,
      cookies,
      localStorage: sessionData,
      sessionStorage: sessionData,
      capturedAt: Date.now(),
      browserType: 'chromium-skyvern',
      metadata: {
        userAgent: await pages[0]?.evaluate(() => navigator.userAgent) || '',
        viewport: { width: 1920, height: 1080 },
        timezone: 'America/New_York',
        skyvernWorkflowData: {
          actions: workflowData,
          extractedData: Object.values(sessionData).map((data: any) => data.extractableData),
          pageStructures: Object.values(sessionData).map((data: any) => data.pageStructure)
        }
      }
    };
  }

  async restoreSession(sessionData: SessionData): Promise<void> {
    if (!this.browser) {
      await this.initialize();
    }

    this.context = await this.browser!.newContext({
      viewport: sessionData.metadata?.viewport || { width: 1920, height: 1080 },
      userAgent: sessionData.metadata?.userAgent,
      locale: 'en-US',
      timezoneId: sessionData.metadata?.timezone || 'America/New_York'
    });

    // Restore cookies
    if (sessionData.cookies && sessionData.cookies.length > 0) {
      await this.context.addCookies(sessionData.cookies);
    }

    // Restore Skyvern workflow context
    await this.context.addInitScript((workflowData: any) => {
      (window as any).__PSP_SKYVERN_SESSION__ = {
        sessionId: workflowData.sessionId,
        startTime: Date.now(),
        actions: workflowData.actions || [],
        restored: true
      };
      
      (window as any).__SKYVERN_ENHANCED__ = true;
    }, sessionData.metadata?.skyvernWorkflowData || {});

    // Restore session data for each page
    for (const [url, pageData] of Object.entries(sessionData.localStorage || {})) {
      try {
        const page = await this.context.newPage();
        await page.goto(url);
        
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

          // Restore workflow context
          if (data.workflowActions) {
            (window as any).__PSP_SKYVERN_SESSION__.actions = [
              ...(window as any).__PSP_SKYVERN_SESSION__.actions,
              ...data.workflowActions
            ];
          }
        }, pageData);

        console.log(`✅ Restored Skyvern session for ${url}`);
      } catch (error) {
        console.warn(`Failed to restore Skyvern session for ${url}:`, error.message);
      }
    }

    this.sessionData = sessionData;
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

  // Skyvern-specific methods
  async createSkyvernTask(taskConfig: any): Promise<SkyvernTask> {
    try {
      const response = await axios.post(
        `${this.config.apiUrl}/tasks`,
        {
          ...taskConfig,
          organization_id: this.config.organizationId
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: this.config.timeout
        }
      );

      this.currentTask = response.data;
      return this.currentTask;
    } catch (error) {
      throw new Error(`Failed to create Skyvern task: ${error.message}`);
    }
  }

  async getSkyvernTaskStatus(taskId: string): Promise<SkyvernTask> {
    try {
      const response = await axios.get(
        `${this.config.apiUrl}/tasks/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          timeout: this.config.timeout
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`Failed to get Skyvern task status: ${error.message}`);
    }
  }

  async executeWorkflow(workflow: any): Promise<any> {
    if (!this.context) {
      throw new Error('No active session context');
    }

    const page = await this.context.newPage();
    
    try {
      // Execute Skyvern workflow steps
      for (const step of workflow.steps || []) {
        await this.executeWorkflowStep(page, step);
      }

      // Extract results
      const results = await page.evaluate(() => {
        const session = (window as any).__PSP_SKYVERN_SESSION__;
        return {
          actions: session?.actions || [],
          extractedData: session?.extractedData || {},
          url: window.location.href,
          title: document.title
        };
      });

      return results;
    } catch (error) {
      console.error('Workflow execution failed:', error);
      throw error;
    } finally {
      await page.close();
    }
  }

  private async executeWorkflowStep(page: Page, step: any): Promise<void> {
    switch (step.type) {
      case 'navigate':
        await page.goto(step.url);
        break;
        
      case 'click':
        await page.click(step.selector);
        break;
        
      case 'fill':
        await page.fill(step.selector, step.value);
        break;
        
      case 'wait':
        await page.waitForTimeout(step.duration || 1000);
        break;
        
      case 'extract':
        const data = await page.evaluate((selector: string) => {
          const elements = document.querySelectorAll(selector);
          return Array.from(elements).map(el => ({
            text: el.textContent,
            html: el.innerHTML,
            attributes: Object.fromEntries(
              Array.from(el.attributes).map(attr => [attr.name, attr.value])
            )
          }));
        }, step.selector);
        
        // Store extracted data
        await page.evaluate((extractedData: any, stepKey: string) => {
          const session = (window as any).__PSP_SKYVERN_SESSION__;
          if (!session.extractedData) session.extractedData = {};
          session.extractedData[stepKey] = extractedData;
        }, data, step.key || 'default');
        break;
        
      default:
        console.warn(`Unknown workflow step type: ${step.type}`);
    }
  }

  async getWorkflowResults(): Promise<any> {
    if (!this.context) {
      throw new Error('No active session context');
    }

    const pages = this.context.pages();
    if (pages.length === 0) {
      return null;
    }

    return await pages[0].evaluate(() => {
      const session = (window as any).__PSP_SKYVERN_SESSION__;
      return {
        actions: session?.actions || [],
        extractedData: session?.extractedData || {},
        sessionId: session?.sessionId,
        duration: Date.now() - (session?.startTime || Date.now())
      };
    });
  }
}

// Export factory function
export function createSkyvernAdapter(config: SkyvermConfig): SkyvernAdapter {
  return new SkyvernAdapter(config);
}

// Export types
export type { SkyvermConfig, SkyvernTask };