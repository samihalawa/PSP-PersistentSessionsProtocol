import { PSPAdapter, SessionData, SessionMetadata } from '@psp/core';
import { Stagehand } from '@browserbase/stagehand';
import { Browser, BrowserContext, Page } from 'playwright';

export interface StagehandConfig {
  apiKey?: string;
  projectId?: string;
  env?: 'LOCAL' | 'BROWSERBASE';
  headless?: boolean;
  debugDom?: boolean;
  enableCaching?: boolean;
  domSettleTimeoutMs?: number;
}

export class StagehandAdapter implements PSPAdapter {
  private config: StagehandConfig;
  private stagehand?: Stagehand;
  private browser?: Browser;
  private context?: BrowserContext;
  private page?: Page;

  constructor(config: StagehandConfig = {}) {
    this.config = {
      env: 'LOCAL',
      headless: false,
      debugDom: false,
      enableCaching: true,
      domSettleTimeoutMs: 30000,
      ...config
    };
  }

  async initialize(): Promise<void> {
    this.stagehand = new Stagehand({
      env: this.config.env,
      apiKey: this.config.apiKey,
      projectId: this.config.projectId,
      headless: this.config.headless,
      debugDom: this.config.debugDom,
      enableCaching: this.config.enableCaching,
      domSettleTimeoutMs: this.config.domSettleTimeoutMs
    });

    await this.stagehand.init();
    
    // Get browser and context from Stagehand
    this.page = this.stagehand.page;
    this.context = this.page.context();
    this.browser = this.context.browser()!;

    console.log('✅ Stagehand adapter initialized');
  }

  async createSession(metadata: SessionMetadata): Promise<string> {
    if (!this.stagehand) {
      await this.initialize();
    }

    // Initialize PSP tracking in Stagehand context
    await this.page!.addInitScript((sessionData: any) => {
      (window as any).__PSP_STAGEHAND_SESSION__ = {
        sessionId: sessionData.id,
        startTime: Date.now(),
        actions: [],
        observations: [],
        extractions: {},
        metadata: sessionData
      };

      // Track Stagehand actions
      (window as any).__PSP_TRACK_ACTION__ = (action: any) => {
        (window as any).__PSP_STAGEHAND_SESSION__.actions.push({
          ...action,
          timestamp: Date.now()
        });
      };

      // Track observations
      (window as any).__PSP_TRACK_OBSERVATION__ = (observation: any) => {
        (window as any).__PSP_STAGEHAND_SESSION__.observations.push({
          ...observation,
          timestamp: Date.now()
        });
      };

      // Track extractions
      (window as any).__PSP_TRACK_EXTRACTION__ = (key: string, data: any) => {
        (window as any).__PSP_STAGEHAND_SESSION__.extractions[key] = {
          data,
          timestamp: Date.now()
        };
      };
    }, metadata);

    return metadata.id;
  }

  async captureSession(sessionId: string): Promise<SessionData> {
    if (!this.page || !this.context) {
      throw new Error('No active Stagehand session');
    }

    // Capture standard browser data
    const cookies = await this.context.cookies();
    
    // Capture Stagehand-specific session data
    const stagehandData = await this.page.evaluate(() => {
      const session = (window as any).__PSP_STAGEHAND_SESSION__;
      
      return {
        // Standard data
        url: window.location.href,
        title: document.title,
        localStorage: Object.fromEntries(Object.entries(localStorage)),
        sessionStorage: Object.fromEntries(Object.entries(sessionStorage)),
        
        // Stagehand-specific data
        stagehandSession: session || {},
        
        // DOM state for Stagehand observations
        domState: {
          forms: Array.from(document.forms).map((form, i) => ({
            id: form.id || `form-${i}`,
            action: form.action,
            method: form.method,
            elements: Array.from(form.elements).map((el: any) => ({
              name: el.name,
              type: el.type,
              value: el.value,
              tagName: el.tagName,
              id: el.id,
              className: el.className
            }))
          })),
          
          interactiveElements: Array.from(
            document.querySelectorAll('button, a, input, select, textarea, [onclick], [role="button"]')
          ).map((el: any, i) => ({
            id: el.id || `interactive-${i}`,
            tagName: el.tagName,
            type: el.type,
            text: el.textContent?.trim() || el.value || el.alt,
            className: el.className,
            role: el.getAttribute('role'),
            ariaLabel: el.getAttribute('aria-label'),
            href: el.href,
            disabled: el.disabled
          })),
          
          dataAttributes: Array.from(
            document.querySelectorAll('[data-testid], [data-cy], [data-test], [data-automation]')
          ).map((el: any, i) => ({
            id: el.id || `data-${i}`,
            tagName: el.tagName,
            dataset: Object.fromEntries(Object.entries(el.dataset)),
            text: el.textContent?.substring(0, 100),
            className: el.className
          }))
        }
      };
    });

    return {
      sessionId,
      cookies,
      localStorage: { [this.page.url()]: stagehandData },
      sessionStorage: { [this.page.url()]: stagehandData },
      capturedAt: Date.now(),
      browserType: 'chromium-stagehand',
      metadata: {
        userAgent: await this.page.evaluate(() => navigator.userAgent),
        viewport: await this.page.viewportSize() || { width: 1280, height: 720 },
        stagehandConfig: this.config,
        stagehandData: {
          actions: stagehandData.stagehandSession.actions || [],
          observations: stagehandData.stagehandSession.observations || [],
          extractions: stagehandData.stagehandSession.extractions || {},
          domState: stagehandData.domState
        }
      }
    };
  }

  async restoreSession(sessionData: SessionData): Promise<void> {
    if (!this.stagehand) {
      await this.initialize();
    }

    // Restore cookies
    if (sessionData.cookies && sessionData.cookies.length > 0) {
      await this.context!.addCookies(sessionData.cookies);
    }

    // Get the main page data
    const pageData = Object.values(sessionData.localStorage || {})[0] as any;
    
    if (pageData?.url) {
      await this.page!.goto(pageData.url);
    }

    // Restore browser state and Stagehand context
    await this.page!.evaluate((data: any) => {
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

      // Restore Stagehand session
      (window as any).__PSP_STAGEHAND_SESSION__ = {
        sessionId: data.stagehandSession?.sessionId || data.sessionId,
        startTime: Date.now(),
        actions: data.stagehandSession?.actions || [],
        observations: data.stagehandSession?.observations || [],
        extractions: data.stagehandSession?.extractions || {},
        restored: true
      };

      // Re-initialize tracking functions
      (window as any).__PSP_TRACK_ACTION__ = (action: any) => {
        (window as any).__PSP_STAGEHAND_SESSION__.actions.push({
          ...action,
          timestamp: Date.now()
        });
      };

      (window as any).__PSP_TRACK_OBSERVATION__ = (observation: any) => {
        (window as any).__PSP_STAGEHAND_SESSION__.observations.push({
          ...observation,
          timestamp: Date.now()
        });
      };

      (window as any).__PSP_TRACK_EXTRACTION__ = (key: string, data: any) => {
        (window as any).__PSP_STAGEHAND_SESSION__.extractions[key] = {
          data,
          timestamp: Date.now()
        };
      };
    }, pageData);

    console.log('✅ Stagehand session restored');
  }

  async getContext(): Promise<BrowserContext> {
    if (!this.context) {
      throw new Error('No active Stagehand context. Call createSession first.');
    }
    return this.context;
  }

  async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      throw new Error('No active browser. Call createSession first.');
    }
    return this.browser;
  }

  async getStagehand(): Promise<Stagehand> {
    if (!this.stagehand) {
      throw new Error('Stagehand not initialized. Call createSession first.');
    }
    return this.stagehand;
  }

  async getPage(): Promise<Page> {
    if (!this.page) {
      throw new Error('No active page. Call createSession first.');
    }
    return this.page;
  }

  async cleanup(): Promise<void> {
    if (this.stagehand) {
      await this.stagehand.close();
      this.stagehand = undefined;
    }
    
    this.page = undefined;
    this.context = undefined;
    this.browser = undefined;
  }

  // Stagehand-specific PSP methods
  async act(action: string, options?: any): Promise<any> {
    if (!this.stagehand) {
      throw new Error('Stagehand not initialized');
    }

    // Track the action
    await this.page!.evaluate((actionData: any) => {
      if ((window as any).__PSP_TRACK_ACTION__) {
        (window as any).__PSP_TRACK_ACTION__(actionData);
      }
    }, { action, options, type: 'act' });

    return await this.stagehand.act(action, options);
  }

  async extract(instruction: string, options?: any): Promise<any> {
    if (!this.stagehand) {
      throw new Error('Stagehand not initialized');
    }

    const result = await this.stagehand.extract(instruction, options);

    // Track the extraction
    await this.page!.evaluate((extractionData: any) => {
      if ((window as any).__PSP_TRACK_EXTRACTION__) {
        (window as any).__PSP_TRACK_EXTRACTION__(extractionData.key, extractionData.result);
      }
    }, { key: instruction, result });

    return result;
  }

  async observe(options?: any): Promise<any> {
    if (!this.stagehand) {
      throw new Error('Stagehand not initialized');
    }

    const observation = await this.stagehand.observe(options);

    // Track the observation
    await this.page!.evaluate((observationData: any) => {
      if ((window as any).__PSP_TRACK_OBSERVATION__) {
        (window as any).__PSP_TRACK_OBSERVATION__(observationData);
      }
    }, { observation, type: 'observe' });

    return observation;
  }

  async getSessionHistory(): Promise<any> {
    if (!this.page) {
      throw new Error('No active page');
    }

    return await this.page.evaluate(() => {
      const session = (window as any).__PSP_STAGEHAND_SESSION__;
      return {
        sessionId: session?.sessionId,
        duration: Date.now() - (session?.startTime || Date.now()),
        actionsCount: session?.actions?.length || 0,
        observationsCount: session?.observations?.length || 0,
        extractionsCount: Object.keys(session?.extractions || {}).length,
        actions: session?.actions || [],
        observations: session?.observations || [],
        extractions: session?.extractions || {}
      };
    });
  }

  // Enhanced Stagehand workflow methods
  async executeWorkflow(workflow: any[]): Promise<any> {
    const results = [];
    
    for (const step of workflow) {
      try {
        let result;
        
        switch (step.type) {
          case 'act':
            result = await this.act(step.instruction, step.options);
            break;
            
          case 'extract':
            result = await this.extract(step.instruction, step.options);
            break;
            
          case 'observe':
            result = await this.observe(step.options);
            break;
            
          case 'wait':
            await this.page!.waitForTimeout(step.duration || 1000);
            result = { type: 'wait', duration: step.duration };
            break;
            
          case 'navigate':
            await this.page!.goto(step.url);
            result = { type: 'navigate', url: step.url };
            break;
            
          default:
            throw new Error(`Unknown workflow step type: ${step.type}`);
        }
        
        results.push({
          step: step.type,
          instruction: step.instruction,
          result,
          timestamp: Date.now()
        });
        
      } catch (error) {
        results.push({
          step: step.type,
          instruction: step.instruction,
          error: error.message,
          timestamp: Date.now()
        });
        
        if (step.required !== false) {
          throw error;
        }
      }
    }
    
    return results;
  }
}

// Export factory function
export function createStagehandAdapter(config?: StagehandConfig): StagehandAdapter {
  return new StagehandAdapter(config);
}

// Export types
export type { StagehandConfig };