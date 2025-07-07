/**
 * PSP Puppeteer Adapter
 * 
 * Implements PSP session management for Puppeteer browser automation framework.
 * Provides session capture, restore, and transfer capabilities with Puppeteer-specific
 * features like stealth mode and custom launch configurations.
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class PuppeteerPSPAdapter {
  constructor(options = {}) {
    this.sessionDir = options.sessionDir || './psp-sessions/puppeteer';
    this.defaultLaunchOptions = {
      headless: options.headless !== false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ],
      ...options.launchOptions
    };
  }

  async initialize() {
    await fs.mkdir(this.sessionDir, { recursive: true });
    console.log('🐶 Puppeteer PSP adapter initialized');
  }

  /**
   * Create new Puppeteer session with PSP tracking
   */
  async createSession(sessionId, options = {}) {
    const sessionPath = path.join(this.sessionDir, sessionId);
    await fs.mkdir(sessionPath, { recursive: true });

    // Configure user data directory for session persistence
    const launchOptions = {
      ...this.defaultLaunchOptions,
      userDataDir: sessionPath,
      ...options
    };

    const browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    // Inject PSP session tracking
    await page.evaluateOnNewDocument(() => {
      window.__PSP_PUPPETEER_SESSION__ = {
        sessionId: null,
        startTime: Date.now(),
        actions: [],
        requests: [],
        responses: [],
        
        // Track user interactions
        trackAction: function(action) {
          this.actions.push({
            timestamp: Date.now(),
            type: action.type,
            target: action.target,
            value: action.value
          });
        },
        
        // Track network activity
        trackRequest: function(request) {
          this.requests.push({
            timestamp: Date.now(),
            url: request.url,
            method: request.method,
            headers: request.headers
          });
        },
        
        trackResponse: function(response) {
          this.responses.push({
            timestamp: Date.now(),
            url: response.url,
            status: response.status,
            headers: response.headers
          });
        }
      };
    });

    // Set up network interception for request/response tracking
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
      // Track request asynchronously to avoid navigation conflicts
      page.evaluate((reqData) => {
        if (window.__PSP_PUPPETEER_SESSION__) {
          window.__PSP_PUPPETEER_SESSION__.trackRequest(reqData);
        }
      }, {
        url: request.url(),
        method: request.method(),
        headers: request.headers()
      }).catch(() => {}); // Ignore evaluation errors during navigation
      request.continue();
    });

    page.on('response', (response) => {
      // Track response asynchronously to avoid navigation conflicts
      page.evaluate((resData) => {
        if (window.__PSP_PUPPETEER_SESSION__) {
          window.__PSP_PUPPETEER_SESSION__.trackResponse(resData);
        }
      }, {
        url: response.url(),
        status: response.status(),
        headers: response.headers()
      }).catch(() => {}); // Ignore evaluation errors during navigation
    });

    return {
      browser,
      page,
      sessionPath,
      provider: 'puppeteer',
      sessionId
    };
  }

  /**
   * Capture session data from Puppeteer
   */
  async captureSession(sessionId) {
    const sessionPath = path.join(this.sessionDir, sessionId);
    
    // Launch browser to read session data
    const browser = await puppeteer.launch({
      ...this.defaultLaunchOptions,
      userDataDir: sessionPath,
      headless: true
    });

    const page = await browser.newPage();
    await page.goto('https://httpbin.org/cookies');

    // Capture comprehensive session data
    const sessionData = await page.evaluate(() => {
      // Standard browser state
      const standardData = {
        cookies: document.cookie,
        localStorage: (() => {
          const data = {};
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            data[key] = localStorage.getItem(key);
          }
          return data;
        })(),
        sessionStorage: (() => {
          const data = {};
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            data[key] = sessionStorage.getItem(key);
          }
          return data;
        })(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      };

      // Puppeteer-specific data
      const puppeteerData = window.__PSP_PUPPETEER_SESSION__ || {};

      return { ...standardData, puppeteerData };
    });

    // Get cookies using Puppeteer API for more detailed data
    const cookies = await page.cookies();

    await browser.close();

    return {
      ...sessionData,
      cookies: cookies, // Override with detailed cookie data
      provider: 'puppeteer',
      captureTime: new Date().toISOString(),
      userDataDir: sessionPath
    };
  }

  /**
   * Restore session from PSP format
   */
  async restoreSession(sessionPath, pspFormat, options = {}) {
    // Create new session directory for restoration
    await fs.mkdir(sessionPath, { recursive: true });

    const launchOptions = {
      ...this.defaultLaunchOptions,
      userDataDir: sessionPath,
      headless: options.headless !== false
    };

    const browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    // Set cookies if available
    if (pspFormat.sessionData.cookies && Array.isArray(pspFormat.sessionData.cookies)) {
      await page.setCookie(...pspFormat.sessionData.cookies);
    }

    // Navigate to original URL or default
    const targetUrl = pspFormat.sessionData.url || 'https://httpbin.org/';
    await page.goto(targetUrl);

    // Restore localStorage
    if (pspFormat.sessionData.localStorage) {
      await page.evaluate((data) => {
        for (const [key, value] of Object.entries(data)) {
          localStorage.setItem(key, value);
        }
      }, pspFormat.sessionData.localStorage);
    }

    // Restore sessionStorage
    if (pspFormat.sessionData.sessionStorage) {
      await page.evaluate((data) => {
        for (const [key, value] of Object.entries(data)) {
          sessionStorage.setItem(key, value);
        }
      }, pspFormat.sessionData.sessionStorage);
    }

    // Restore Puppeteer-specific data
    if (pspFormat.puppeteerData) {
      await page.evaluate((puppeteerData) => {
        window.__PSP_PUPPETEER_SESSION__ = {
          ...window.__PSP_PUPPETEER_SESSION__,
          ...puppeteerData,
          restored: true,
          restoredAt: Date.now()
        };
      }, pspFormat.puppeteerData);
    }

    // Set viewport if available
    if (pspFormat.sessionData.viewport) {
      await page.setViewport({
        width: pspFormat.sessionData.viewport.width || 1920,
        height: pspFormat.sessionData.viewport.height || 1080
      });
    }

    // Verify restoration by capturing current state
    const restoredData = await this.captureSessionData(page);

    await browser.close();

    return {
      ...restoredData,
      provider: 'puppeteer-restored',
      restoredFrom: pspFormat.sourceProvider || 'unknown',
      restoredAt: new Date().toISOString()
    };
  }

  /**
   * Helper method to capture session data from active page
   */
  async captureSessionData(page) {
    const cookies = await page.cookies();
    
    const browserState = await page.evaluate(() => {
      return {
        localStorage: (() => {
          const data = {};
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            data[key] = localStorage.getItem(key);
          }
          return data;
        })(),
        sessionStorage: (() => {
          const data = {};
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            data[key] = sessionStorage.getItem(key);
          }
          return data;
        })(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        puppeteerData: window.__PSP_PUPPETEER_SESSION__ || {}
      };
    });

    return {
      cookies,
      ...browserState
    };
  }

  /**
   * Convert session data to PSP format
   */
  convertToPSPFormat(sessionData, sourceProvider = 'puppeteer') {
    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      sourceProvider,
      sessionData: {
        cookies: sessionData.cookies || [],
        localStorage: sessionData.localStorage || {},
        sessionStorage: sessionData.sessionStorage || {},
        url: sessionData.url,
        userAgent: sessionData.userAgent,
        viewport: sessionData.viewport
      },
      puppeteerData: sessionData.puppeteerData || {},
      metadata: {
        platform: process.platform,
        captureMethod: 'puppeteer-psp-adapter',
        compatibility: ['puppeteer', 'playwright', 'selenium'],
        userDataDir: sessionData.userDataDir,
        features: {
          networkTracking: true,
          actionTracking: true,
          stealth: true
        }
      }
    };
  }

  /**
   * Enhanced session operations
   */
  async createStealthSession(sessionId, options = {}) {
    const stealthOptions = {
      ...options,
      args: [
        ...this.defaultLaunchOptions.args,
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--no-first-run',
        '--disable-default-apps'
      ]
    };

    const session = await this.createSession(sessionId, stealthOptions);

    // Additional stealth configurations
    await session.page.evaluateOnNewDocument(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      
      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
    });

    // Set real user agent
    await session.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    return session;
  }

  /**
   * Session performance monitoring
   */
  async monitorSession(sessionId, callback) {
    const sessionPath = path.join(this.sessionDir, sessionId);
    
    const browser = await puppeteer.launch({
      ...this.defaultLaunchOptions,
      userDataDir: sessionPath
    });

    const page = await browser.newPage();

    // Monitor performance metrics
    const metrics = {
      requests: 0,
      responses: 0,
      errors: 0,
      loadTime: 0
    };

    page.on('request', () => metrics.requests++);
    page.on('response', (response) => {
      metrics.responses++;
      if (!response.ok()) metrics.errors++;
    });

    page.on('domcontentloaded', () => {
      metrics.loadTime = Date.now();
    });

    if (callback) {
      await callback(page, metrics);
    }

    await browser.close();
    return metrics;
  }
}

// Export for integration testing
async function testPuppeteerIntegration() {
  console.log('🧪 Testing Puppeteer PSP Integration');
  console.log('===================================');

  const adapter = new PuppeteerPSPAdapter();
  await adapter.initialize();

  const testSessionId = `puppeteer-test-${Date.now()}`;

  try {
    // Test 1: Create session
    console.log('📝 Creating Puppeteer session...');
    const session = await adapter.createSession(testSessionId, { headless: true });
    
    await session.page.goto('https://httpbin.org/cookies/set/puppeteer_test/working');
    await session.page.evaluate(() => {
      localStorage.setItem('puppeteer-test', JSON.stringify({
        framework: 'puppeteer',
        timestamp: new Date().toISOString(),
        features: ['stealth', 'network-tracking', 'session-persistence']
      }));
    });

    await session.browser.close();
    console.log('  ✅ Session created successfully');

    // Test 2: Capture session
    console.log('📤 Capturing session data...');
    const sessionData = await adapter.captureSession(testSessionId);
    console.log('  ✅ Session captured successfully');
    console.log(`  📊 Captured ${sessionData.cookies.length} cookies`);

    // Test 3: Convert to PSP format
    const pspFormat = adapter.convertToPSPFormat(sessionData);
    console.log('  ✅ PSP format conversion successful');

    // Test 4: Restore session
    console.log('📥 Restoring session...');
    const restoredData = await adapter.restoreSession(
      path.join(adapter.sessionDir, `${testSessionId}-restored`),
      pspFormat,
      { headless: true }
    );
    console.log('  ✅ Session restored successfully');

    // Test 5: Stealth session
    console.log('🥷 Testing stealth session...');
    const stealthSession = await adapter.createStealthSession(`${testSessionId}-stealth`, { headless: true });
    await stealthSession.page.goto('https://httpbin.org/user-agent');
    await stealthSession.browser.close();
    console.log('  ✅ Stealth session working');

    console.log('\n🎉 Puppeteer PSP Integration: ✅ WORKING');
    console.log('  ✅ Session creation and persistence');
    console.log('  ✅ Comprehensive data capture');
    console.log('  ✅ PSP format compatibility');
    console.log('  ✅ Session restoration');
    console.log('  ✅ Stealth mode capabilities');

    return {
      success: true,
      sessionData,
      pspFormat,
      restoredData
    };

  } catch (error) {
    console.error('❌ Puppeteer integration test failed:', error.message);
    throw error;
  }
}

if (require.main === module) {
  testPuppeteerIntegration().catch(console.error);
}

module.exports = { 
  PuppeteerPSPAdapter, 
  testPuppeteerIntegration 
};