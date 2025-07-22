import { Adapter } from '../../core/src/adapter';
import { BrowserSessionState, RecordingOptions, PlaybackOptions } from '../../core/src/types';

export interface BrowserlessConfig {
  /** Browserless.io API endpoint */
  endpoint: string;
  /** API token for authentication */
  token?: string;
  /** Browser type (chrome, firefox) */
  browser?: 'chrome' | 'firefox';
  /** Additional launch options */
  launchOptions?: Record<string, any>;
  /** Request timeout (ms) */
  timeout?: number;
}

/**
 * Browserless.io adapter for PSP
 * Provides session capture and restore functionality for Browserless.io cloud browsers
 */
export class BrowserlessAdapter implements Adapter {
  public readonly type = 'browserless';
  private config: BrowserlessConfig;
  private sessionId?: string;
  private wsEndpoint?: string;

  constructor(config: BrowserlessConfig) {
    this.config = {
      browser: 'chrome',
      timeout: 30000,
      ...config
    };
  }

  /**
   * Connect to a Browserless.io instance
   */
  async connect(target?: any): Promise<void> {
    try {
      // Create a new browser session via Browserless.io API
      const response = await fetch(`${this.config.endpoint}/json/version`, {
        headers: {
          ...(this.config.token && { 'Authorization': `Bearer ${this.config.token}` })
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to connect to Browserless.io: ${response.statusText}`);
      }

      // Get WebSocket endpoint for this session
      const sessionResponse = await fetch(`${this.config.endpoint}/json/new`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.token && { 'Authorization': `Bearer ${this.config.token}` })
        },
        body: JSON.stringify({
          browser: this.config.browser,
          ...this.config.launchOptions
        })
      });

      if (!sessionResponse.ok) {
        throw new Error(`Failed to create Browserless session: ${sessionResponse.statusText}`);
      }

      const sessionData = await sessionResponse.json();
      this.sessionId = sessionData.sessionId;
      this.wsEndpoint = sessionData.webSocketDebuggerUrl;

    } catch (error) {
      throw new Error(`Failed to connect to Browserless.io: ${error.message}`);
    }
  }

  /**
   * Capture current browser session state via Browserless.io
   */
  async captureState(): Promise<BrowserSessionState> {
    if (!this.sessionId) {
      throw new Error('No active Browserless session');
    }

    try {
      // Use Browserless.io API to capture session state
      const response = await fetch(`${this.config.endpoint}/session/${this.sessionId}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.token && { 'Authorization': `Bearer ${this.config.token}` })
        },
        body: JSON.stringify({
          includeCookies: true,
          includeLocalStorage: true,
          includeSessionStorage: true
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to capture Browserless session: ${response.statusText}`);
      }

      const capturedData = await response.json();
      
      // Transform Browserless data to PSP format
      const state: BrowserSessionState = {
        version: '1.0.0',
        timestamp: Date.now(),
        origin: capturedData.origin || '',
        storage: {
          cookies: capturedData.cookies || [],
          localStorage: new Map(Object.entries(capturedData.localStorage || {})),
          sessionStorage: new Map(Object.entries(capturedData.sessionStorage || {}))
        }
      };

      if (capturedData.url) {
        state.navigation = {
          currentUrl: capturedData.url,
          history: capturedData.history || []
        };
      }

      if (capturedData.viewport) {
        state.viewport = capturedData.viewport;
      }

      return state;
    } catch (error) {
      throw new Error(`Failed to capture Browserless state: ${error.message}`);
    }
  }

  /**
   * Apply session state via Browserless.io
   */
  async applyState(state: BrowserSessionState): Promise<void> {
    if (!this.sessionId) {
      throw new Error('No active Browserless session');
    }

    try {
      // Use Browserless.io API to restore session state
      const response = await fetch(`${this.config.endpoint}/session/${this.sessionId}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.token && { 'Authorization': `Bearer ${this.config.token}` })
        },
        body: JSON.stringify({
          cookies: state.storage.cookies,
          localStorage: Object.fromEntries(state.storage.localStorage || []),
          sessionStorage: Object.fromEntries(state.storage.sessionStorage || []),
          url: state.navigation?.currentUrl,
          viewport: state.viewport
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to restore Browserless session: ${response.statusText}`);
      }

    } catch (error) {
      throw new Error(`Failed to apply Browserless state: ${error.message}`);
    }
  }

  /**
   * Start recording via Browserless.io
   */
  async startRecording(options?: RecordingOptions): Promise<void> {
    if (!this.sessionId) {
      throw new Error('No active Browserless session');
    }

    try {
      const response = await fetch(`${this.config.endpoint}/session/${this.sessionId}/record/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.token && { 'Authorization': `Bearer ${this.config.token}` })
        },
        body: JSON.stringify(options || {})
      });

      if (!response.ok) {
        throw new Error(`Failed to start Browserless recording: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`Failed to start recording: ${error.message}`);
    }
  }

  /**
   * Stop recording and return events
   */
  async stopRecording(): Promise<any[]> {
    if (!this.sessionId) {
      throw new Error('No active Browserless session');
    }

    try {
      const response = await fetch(`${this.config.endpoint}/session/${this.sessionId}/record/stop`, {
        method: 'POST',
        headers: {
          ...(this.config.token && { 'Authorization': `Bearer ${this.config.token}` })
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to stop Browserless recording: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to stop recording: ${error.message}`);
    }
  }

  /**
   * Play back recorded events via Browserless.io
   */
  async playRecording(events: any[], options?: PlaybackOptions): Promise<void> {
    if (!this.sessionId) {
      throw new Error('No active Browserless session');
    }

    try {
      const response = await fetch(`${this.config.endpoint}/session/${this.sessionId}/playback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.token && { 'Authorization': `Bearer ${this.config.token}` })
        },
        body: JSON.stringify({
          events,
          options: options || {}
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to play Browserless recording: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`Failed to play recording: ${error.message}`);
    }
  }

  /**
   * Close the Browserless session
   */
  async close(): Promise<void> {
    if (this.sessionId) {
      try {
        await fetch(`${this.config.endpoint}/session/${this.sessionId}/close`, {
          method: 'DELETE',
          headers: {
            ...(this.config.token && { 'Authorization': `Bearer ${this.config.token}` })
          }
        });
      } catch (error) {
        console.warn(`Failed to close Browserless session: ${error.message}`);
      } finally {
        this.sessionId = undefined;
        this.wsEndpoint = undefined;
      }
    }
  }

  /**
   * Get the current session ID
   */
  getSessionId(): string | undefined {
    return this.sessionId;
  }

  /**
   * Get the WebSocket endpoint
   */
  getWebSocketEndpoint(): string | undefined {
    return this.wsEndpoint;
  }
}