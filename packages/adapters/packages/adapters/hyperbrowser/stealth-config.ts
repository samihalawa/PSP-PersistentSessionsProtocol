import { LaunchOptions } from 'playwright';

export interface StealthConfig {
  useUndetectedChrome: boolean;
  disableWebSecurity: boolean;
  disableFeatures: string[];
  args: string[];
  fingerprint?: FingerprintConfig;
  proxy?: ProxyConfig;
  userAgent?: string;
  viewport?: { width: number; height: number };
}

export interface FingerprintConfig {
  canvas: boolean;
  webgl: boolean;
  audioContext: boolean;
  fonts: boolean;
  timezone: string;
  language: string;
  platform: string;
  hardwareConcurrency: number;
}

export interface ProxyConfig {
  server: string;
  username?: string;
  password?: string;
  bypass?: string[];
}

export class StealthManager {
  private config: StealthConfig;
  private currentFingerprint: any = {};

  constructor(config: StealthConfig) {
    this.config = config;
  }

  generateLaunchOptions(): LaunchOptions {
    const args = [
      ...this.config.args,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-default-apps',
      '--disable-popup-blocking',
      '--disable-translate',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--disable-ipc-flooding-protection',
      '--disable-hang-monitor',
      '--disable-prompt-on-repost',
      '--disable-sync',
      '--disable-domain-reliability',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-plugins-discovery',
      '--disable-preconnect',
      '--disable-background-networking'
    ];

    if (this.config.disableWebSecurity) {
      args.push('--disable-web-security', '--disable-features=VizDisplayCompositor');
    }

    if (this.config.useUndetectedChrome) {
      args.push(
        '--disable-blink-features=AutomationControlled',
        '--exclude-switches=enable-automation',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      );
    }

    const launchOptions: LaunchOptions = {
      args,
      ignoreDefaultArgs: ['--enable-automation'],
      ignoreHTTPSErrors: true,
    };

    if (this.config.proxy) {
      launchOptions.proxy = {
        server: this.config.proxy.server,
        username: this.config.proxy.username,
        password: this.config.proxy.password,
        bypass: this.config.proxy.bypass?.join(',')
      };
    }

    return launchOptions;
  }

  async setupPageStealth(page: any): Promise<void> {
    await this.hideWebdriver(page);
    await this.mockFingerprint(page);
    await this.setupUserAgent(page);
    await this.setupViewport(page);
  }

  private async hideWebdriver(page: any): Promise<void> {
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      window.chrome = {
        runtime: {},
      };

      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });

      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
    });
  }

  private async mockFingerprint(page: any): Promise<void> {
    if (!this.config.fingerprint) return;

    await page.evaluateOnNewDocument((fingerprint) => {
      if (fingerprint.canvas) {
        const getContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(type, ...args) {
          if (type === '2d') {
            const context = getContext.apply(this, [type, ...args]);
            const originalFillText = context.fillText;
            context.fillText = function(text, x, y, maxWidth) {
              const noise = Math.random() * 0.1;
              return originalFillText.apply(this, [text, x + noise, y + noise, maxWidth]);
            };
            return context;
          }
          return getContext.apply(this, [type, ...args]);
        };
      }

      if (fingerprint.webgl) {
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
          if (parameter === this.UNMASKED_VENDOR_WEBGL) {
            return 'Intel Inc.';
          }
          if (parameter === this.UNMASKED_RENDERER_WEBGL) {
            return 'Intel Iris OpenGL Engine';
          }
          return getParameter.apply(this, [parameter]);
        };
      }

      if (fingerprint.audioContext) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          const originalCreateAnalyser = AudioContext.prototype.createAnalyser;
          AudioContext.prototype.createAnalyser = function() {
            const analyser = originalCreateAnalyser.apply(this);
            const originalGetFloatFrequencyData = analyser.getFloatFrequencyData;
            analyser.getFloatFrequencyData = function(array) {
              originalGetFloatFrequencyData.apply(this, [array]);
              for (let i = 0; i < array.length; i++) {
                array[i] += Math.random() * 0.1;
              }
            };
            return analyser;
          };
        }
      }

      if (fingerprint.timezone) {
        Object.defineProperty(Intl.DateTimeFormat.prototype, 'resolvedOptions', {
          value: function() {
            return { timeZone: fingerprint.timezone };
          }
        });
      }

      if (fingerprint.hardwareConcurrency) {
        Object.defineProperty(navigator, 'hardwareConcurrency', {
          get: () => fingerprint.hardwareConcurrency,
        });
      }
    }, this.config.fingerprint);
  }

  private async setupUserAgent(page: any): Promise<void> {
    if (this.config.userAgent) {
      await page.setUserAgent(this.config.userAgent);
    }
  }

  private async setupViewport(page: any): Promise<void> {
    if (this.config.viewport) {
      await page.setViewportSize(this.config.viewport);
    }
  }

  getFingerprint(): any {
    return this.currentFingerprint;
  }

  getBypassMethods(): string[] {
    const methods = [];
    
    if (this.config.useUndetectedChrome) {
      methods.push('undetected-chrome');
    }
    
    if (this.config.fingerprint?.canvas) {
      methods.push('canvas-noise');
    }
    
    if (this.config.fingerprint?.webgl) {
      methods.push('webgl-masking');
    }
    
    if (this.config.fingerprint?.audioContext) {
      methods.push('audio-fingerprint-noise');
    }
    
    if (this.config.proxy) {
      methods.push('proxy-rotation');
    }

    return methods;
  }

  getChromeVersion(): string {
    return process.env.CHROME_VERSION || '120.0.6099.109';
  }

  static getDefaultConfig(): StealthConfig {
    return {
      useUndetectedChrome: true,
      disableWebSecurity: true,
      disableFeatures: ['VizDisplayCompositor'],
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ],
      fingerprint: {
        canvas: true,
        webgl: true,
        audioContext: true,
        fonts: true,
        timezone: 'America/New_York',
        language: 'en-US',
        platform: 'MacIntel',
        hardwareConcurrency: 8
      }
    };
  }
}

export default StealthManager;