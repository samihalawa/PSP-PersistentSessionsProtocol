import { 
  PSPAdapter, 
  SessionData, 
  LaunchOptions, 
  CaptureOptions, 
  SessionMetadata 
} from '@psp/core';
import { Browser, Page, BrowserContext } from 'playwright';
import { HyperBrowser, AIConfig, StealthConfig } from 'hyperbrowser';
import { OpenAI } from 'openai';
import WebSocket from 'ws';
import * as fs from 'fs';
import * as path from 'path';

export interface HyperBrowserOptions extends LaunchOptions {
  aiConfig?: AIConfig;
  stealthConfig?: StealthConfig;
  llmProvider?: 'openai' | 'anthropic' | 'local';
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  useUndetectedChrome?: boolean;
  enableJavaScript?: boolean;
  useProxy?: boolean;
  proxyConfig?: {
    server: string;
    username?: string;
    password?: string;
  };
}

export class HyperBrowserAdapter implements PSPAdapter {
  private hyperbrowser: HyperBrowser | null = null;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private websocket: WebSocket | null = null;
  private openai: OpenAI | null = null;
  private sessionDir: string;

  constructor(private options: HyperBrowserOptions = {}) {
    this.sessionDir = options.sessionDir || './sessions';
    this.initializeAI();
  }

  private initializeAI(): void {
    if (this.options.apiKey) {
      this.openai = new OpenAI({
        apiKey: this.options.apiKey,
      });
    }
  }

  async launch(sessionId: string, options: HyperBrowserOptions = {}): Promise<void> {
    const mergedOptions = { ...this.options, ...options };
    const sessionPath = path.join(this.sessionDir, sessionId);

    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }

    const hyperBrowserConfig = {
      headless: mergedOptions.headless ?? false,
      userDataDir: sessionPath,
      aiConfig: mergedOptions.aiConfig || {
        provider: mergedOptions.llmProvider || 'openai',
        model: mergedOptions.model || 'gpt-4o',
        temperature: mergedOptions.temperature || 0.7,
        maxTokens: mergedOptions.maxTokens || 4000,
      },
      stealthConfig: mergedOptions.stealthConfig || {
        useUndetectedChrome: mergedOptions.useUndetectedChrome ?? true,
        disableWebSecurity: true,
        disableFeatures: ['VizDisplayCompositor'],
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920,1080'
        ]
      },
      enableJavaScript: mergedOptions.enableJavaScript ?? true,
      proxy: mergedOptions.proxyConfig,
    };

    this.hyperbrowser = new HyperBrowser(hyperBrowserConfig);
    await this.hyperbrowser.launch();
    
    this.browser = this.hyperbrowser.getBrowser();
    this.context = this.hyperbrowser.getContext();
    this.page = this.hyperbrowser.getPage();

    if (mergedOptions.enableWebSocket) {
      await this.setupWebSocket(sessionId);
    }
  }

  private async setupWebSocket(sessionId: string): Promise<void> {
    this.websocket = new WebSocket(`ws://localhost:8080/sessions/${sessionId}`);
    
    this.websocket.on('open', () => {
      console.log(`WebSocket connected for session ${sessionId}`);
    });

    this.websocket.on('message', async (data) => {
      const message = JSON.parse(data.toString());
      await this.handleWebSocketMessage(message);
    });
  }

  private async handleWebSocketMessage(message: any): Promise<void> {
    switch (message.type) {
      case 'ai_action':
        await this.executeAIAction(message.instruction);
        break;
      case 'capture_session':
        const sessionData = await this.captureSession();
        this.websocket?.send(JSON.stringify({
          type: 'session_captured',
          data: sessionData
        }));
        break;
      case 'restore_session':
        await this.restoreSession(message.sessionData);
        break;
    }
  }

  async executeAIAction(instruction: string): Promise<any> {
    if (!this.hyperbrowser || !this.page) {
      throw new Error('HyperBrowser not initialized');
    }

    try {
      const result = await this.hyperbrowser.ai.act(instruction, {
        page: this.page,
        screenshot: true,
        waitForNavigation: true,
        timeout: 30000
      });

      await this.captureInteractionState();
      return result;
    } catch (error) {
      console.error('AI action failed:', error);
      throw error;
    }
  }

  async extractWithAI(instruction: string): Promise<any> {
    if (!this.hyperbrowser || !this.page) {
      throw new Error('HyperBrowser not initialized');
    }

    return await this.hyperbrowser.ai.extract(instruction, {
      page: this.page,
      format: 'json',
      includeContext: true
    });
  }

  async captureSession(options: CaptureOptions = {}): Promise<SessionData> {
    if (!this.context || !this.page) {
      throw new Error('Browser context not available');
    }

    const baseData = await this.captureBaseSessionData();
    const aiState = await this.captureAIState();
    const interactionHistory = await this.captureInteractionHistory();
    const domSnapshot = options.includeDOMSnapshot ? await this.captureDOMSnapshot() : undefined;

    return {
      ...baseData,
      hyperbrowser: {
        aiState,
        interactionHistory,
        domSnapshot,
        stealthFingerprint: await this.captureStealthFingerprint(),
        llmContext: await this.captureLLMContext()
      }
    };
  }

  private async captureBaseSessionData(): Promise<SessionData> {
    const cookies = await this.context!.cookies();
    const localStorage = await this.page!.evaluate(() => {
      return JSON.stringify(window.localStorage);
    });
    const sessionStorage = await this.page!.evaluate(() => {
      return JSON.stringify(window.sessionStorage);
    });

    return {
      cookies,
      localStorage: JSON.parse(localStorage),
      sessionStorage: JSON.parse(sessionStorage),
      url: this.page!.url(),
      userAgent: await this.page!.evaluate(() => navigator.userAgent),
      viewport: this.page!.viewportSize(),
      timestamp: new Date().toISOString()
    };
  }

  private async captureAIState(): Promise<any> {
    if (!this.hyperbrowser) return {};

    return {
      currentObjective: this.hyperbrowser.ai.getCurrentObjective(),
      actionHistory: this.hyperbrowser.ai.getActionHistory(),
      contextMemory: this.hyperbrowser.ai.getContextMemory(),
      learningData: this.hyperbrowser.ai.getLearningData()
    };
  }

  private async captureInteractionHistory(): Promise<any[]> {
    if (!this.hyperbrowser) return [];

    return this.hyperbrowser.interactions.getHistory();
  }

  private async captureDOMSnapshot(): Promise<string> {
    return await this.page!.content();
  }

  private async captureStealthFingerprint(): Promise<any> {
    if (!this.hyperbrowser) return {};

    return {
      fingerprint: this.hyperbrowser.stealth.getFingerprint(),
      detectionBypass: this.hyperbrowser.stealth.getBypassMethods(),
      chromeVersion: this.hyperbrowser.stealth.getChromeVersion()
    };
  }

  private async captureLLMContext(): Promise<any> {
    if (!this.hyperbrowser) return {};

    return {
      conversationHistory: this.hyperbrowser.ai.getConversationHistory(),
      systemPrompts: this.hyperbrowser.ai.getSystemPrompts(),
      tokenUsage: this.hyperbrowser.ai.getTokenUsage()
    };
  }

  private async captureInteractionState(): Promise<void> {
    if (!this.hyperbrowser) return;

    const state = {
      timestamp: new Date().toISOString(),
      url: this.page!.url(),
      screenshot: await this.page!.screenshot({ type: 'png' }),
      domState: await this.page!.content()
    };

    this.hyperbrowser.interactions.recordState(state);
  }

  async restoreSession(sessionData: SessionData): Promise<void> {
    if (!this.context || !this.page) {
      throw new Error('Browser context not available');
    }

    await this.context.addCookies(sessionData.cookies);

    await this.page.evaluate((data) => {
      if (data.localStorage) {
        for (const [key, value] of Object.entries(data.localStorage)) {
          window.localStorage.setItem(key, value as string);
        }
      }
      if (data.sessionStorage) {
        for (const [key, value] of Object.entries(data.sessionStorage)) {
          window.sessionStorage.setItem(key, value as string);
        }
      }
    }, sessionData);

    if (sessionData.url) {
      await this.page.goto(sessionData.url);
    }

    if (sessionData.hyperbrowser) {
      await this.restoreHyperBrowserState(sessionData.hyperbrowser);
    }
  }

  private async restoreHyperBrowserState(hyperData: any): Promise<void> {
    if (!this.hyperbrowser) return;

    if (hyperData.aiState) {
      this.hyperbrowser.ai.restoreState(hyperData.aiState);
    }

    if (hyperData.interactionHistory) {
      this.hyperbrowser.interactions.restoreHistory(hyperData.interactionHistory);
    }

    if (hyperData.llmContext) {
      this.hyperbrowser.ai.restoreContext(hyperData.llmContext);
    }
  }

  async navigate(url: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser page not available');
    }
    await this.page.goto(url);
    await this.captureInteractionState();
  }

  async close(): Promise<void> {
    if (this.websocket) {
      this.websocket.close();
    }
    
    if (this.hyperbrowser) {
      await this.hyperbrowser.close();
    }
    
    this.hyperbrowser = null;
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  async getMetadata(sessionId: string): Promise<SessionMetadata> {
    const sessionPath = path.join(this.sessionDir, sessionId);
    const metadataPath = path.join(sessionPath, 'metadata.json');

    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      return metadata;
    }

    return {
      id: sessionId,
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      size: 0,
      type: 'hyperbrowser'
    };
  }

  async listSessions(): Promise<SessionMetadata[]> {
    if (!fs.existsSync(this.sessionDir)) {
      return [];
    }

    const sessions = fs.readdirSync(this.sessionDir);
    const metadata = await Promise.all(
      sessions.map(sessionId => this.getMetadata(sessionId))
    );

    return metadata;
  }

  async deleteSession(sessionId: string): Promise<void> {
    const sessionPath = path.join(this.sessionDir, sessionId);
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }
  }

  getAdapterInfo() {
    return {
      name: 'hyperbrowser',
      version: '0.1.0',
      description: 'PSP adapter for Context7 Hyperbrowser AI platform',
      capabilities: [
        'ai_actions',
        'stealth_browsing',
        'context_memory',
        'interaction_recording',
        'llm_integration',
        'websocket_api',
        'fingerprint_masking',
        'undetected_chrome'
      ]
    };
  }
}

export default HyperBrowserAdapter;