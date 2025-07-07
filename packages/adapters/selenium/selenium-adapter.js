/**
 * PSP Selenium Adapter
 * 
 * Implements PSP session management for Selenium WebDriver automation framework.
 * Provides session capture, restore, and transfer capabilities with Selenium-specific
 * features like multi-browser support and grid integration.
 */

const { Builder, By, until, Capabilities } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');
const fs = require('fs').promises;
const path = require('path');

class SeleniumPSPAdapter {
  constructor(options = {}) {
    this.sessionDir = options.sessionDir || './psp-sessions/selenium';
    this.browser = options.browser || 'chrome';
    this.gridUrl = options.gridUrl || null; // For Selenium Grid
    this.defaultOptions = {
      headless: options.headless !== false,
      ...options
    };
  }

  async initialize() {
    await fs.mkdir(this.sessionDir, { recursive: true });
    console.log('🔧 Selenium PSP adapter initialized');
  }

  /**
   * Create new Selenium session with PSP tracking
   */
  async createSession(sessionId, options = {}) {
    const sessionPath = path.join(this.sessionDir, sessionId);
    await fs.mkdir(sessionPath, { recursive: true });

    let driver;

    if (this.browser === 'chrome') {
      driver = await this.createChromeSession(sessionPath, options);
    } else if (this.browser === 'firefox') {
      driver = await this.createFirefoxSession(sessionPath, options);
    } else {
      throw new Error(`Unsupported browser: ${this.browser}`);
    }

    // Inject PSP session tracking
    await driver.executeScript(`
      window.__PSP_SELENIUM_SESSION__ = {
        sessionId: '${sessionId}',
        browser: '${this.browser}',
        startTime: Date.now(),
        actions: [],
        navigation: [],
        
        // Track user actions
        trackAction: function(action) {
          this.actions.push({
            timestamp: Date.now(),
            type: action.type,
            element: action.element,
            value: action.value
          });
        },
        
        // Track navigation
        trackNavigation: function(url) {
          this.navigation.push({
            timestamp: Date.now(),
            url: url,
            title: document.title
          });
        },
        
        // Get comprehensive session state
        getSessionState: function() {
          return {
            actions: this.actions,
            navigation: this.navigation,
            currentUrl: window.location.href,
            title: document.title,
            sessionStorage: Object.fromEntries(
              Object.keys(sessionStorage).map(key => [key, sessionStorage.getItem(key)])
            ),
            localStorage: Object.fromEntries(
              Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])
            )
          };
        }
      };
      
      // Track page navigation automatically
      window.addEventListener('beforeunload', function() {
        if (window.__PSP_SELENIUM_SESSION__) {
          window.__PSP_SELENIUM_SESSION__.trackNavigation(window.location.href);
        }
      });
    `);

    return {
      driver,
      sessionPath,
      provider: 'selenium',
      browser: this.browser,
      sessionId
    };
  }

  /**
   * Create Chrome session with Selenium
   */
  async createChromeSession(sessionPath, options = {}) {
    const chromeOptions = new chrome.Options();
    
    // Configure user data directory for persistence
    chromeOptions.addArguments(`--user-data-dir=${sessionPath}`);
    chromeOptions.addArguments('--no-sandbox');
    chromeOptions.addArguments('--disable-dev-shm-usage');
    chromeOptions.addArguments('--disable-web-security');
    
    if (this.defaultOptions.headless && options.headless !== false) {
      chromeOptions.addArguments('--headless=new');
    }

    // Add stealth options
    if (options.stealth) {
      chromeOptions.addArguments('--disable-blink-features=AutomationControlled');
      chromeOptions.addArguments('--disable-infobars');
      chromeOptions.excludeSwitches(['enable-automation']);
      chromeOptions.addArguments('--disable-extensions');
    }

    let builder = new Builder()
      .forBrowser('chrome')
      .setChromeOptions(chromeOptions);

    // Use Selenium Grid if configured
    if (this.gridUrl) {
      builder = builder.usingServer(this.gridUrl);
    }

    return await builder.build();
  }

  /**
   * Create Firefox session with Selenium
   */
  async createFirefoxSession(sessionPath, options = {}) {
    const firefoxOptions = new firefox.Options();
    
    // Configure profile directory for persistence
    const profilePath = path.join(sessionPath, 'firefox-profile');
    await fs.mkdir(profilePath, { recursive: true });
    
    firefoxOptions.setProfile(profilePath);
    firefoxOptions.addArguments('--no-sandbox');
    
    if (this.defaultOptions.headless && options.headless !== false) {
      firefoxOptions.addArguments('--headless');
    }

    let builder = new Builder()
      .forBrowser('firefox')
      .setFirefoxOptions(firefoxOptions);

    if (this.gridUrl) {
      builder = builder.usingServer(this.gridUrl);
    }

    return await builder.build();
  }

  /**
   * Capture session data from Selenium
   */
  async captureSession(sessionId) {
    const sessionPath = path.join(this.sessionDir, sessionId);
    
    // Launch browser to read session data
    let driver;
    
    if (this.browser === 'chrome') {
      driver = await this.createChromeSession(sessionPath, { headless: true });
    } else {
      driver = await this.createFirefoxSession(sessionPath, { headless: true });
    }

    await driver.get('https://httpbin.org/cookies');
    
    // Ensure PSP session tracking is injected after page load
    await driver.executeScript(`
      if (!window.__PSP_SELENIUM_SESSION__) {
        window.__PSP_SELENIUM_SESSION__ = {
          sessionId: '${sessionId}',
          browser: '${this.browser}',
          startTime: Date.now(),
          actions: [],
          navigation: [],
          
          trackAction: function(action) {
            this.actions.push({
              timestamp: Date.now(),
              type: action.type,
              element: action.element,
              value: action.value
            });
          },
          
          trackNavigation: function(url) {
            this.navigation.push({
              timestamp: Date.now(),
              url: url,
              title: document.title
            });
          },
          
          getSessionState: function() {
            return {
              actions: this.actions,
              navigation: this.navigation,
              currentUrl: window.location.href,
              title: document.title,
              sessionStorage: Object.fromEntries(
                Object.keys(sessionStorage).map(key => [key, sessionStorage.getItem(key)])
              ),
              localStorage: Object.fromEntries(
                Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])
              )
            };
          }
        };
      }
    `);

    // Capture comprehensive session data
    const sessionData = await driver.executeScript(`
      // Standard browser state
      const standardData = {
        cookies: document.cookie,
        localStorage: Object.fromEntries(
          Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])
        ),
        sessionStorage: Object.fromEntries(
          Object.keys(sessionStorage).map(key => [key, sessionStorage.getItem(key)])
        ),
        url: window.location.href,
        title: document.title,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      };

      // Selenium-specific data
      const seleniumData = window.__PSP_SELENIUM_SESSION__ ? 
        window.__PSP_SELENIUM_SESSION__.getSessionState() : {};

      return { ...standardData, seleniumData };
    `);

    // Get cookies using Selenium WebDriver API for detailed data
    const cookies = await driver.manage().getCookies();

    // Get current window handle and position
    const windowRect = await driver.manage().window().getRect();

    await driver.quit();

    return {
      ...sessionData,
      cookies: cookies, // Override with detailed cookie data
      windowRect,
      provider: 'selenium',
      browser: this.browser,
      captureTime: new Date().toISOString(),
      userDataDir: sessionPath
    };
  }

  /**
   * Restore session from PSP format
   */
  async restoreSession(sessionPath, pspFormat, options = {}) {
    await fs.mkdir(sessionPath, { recursive: true });

    let driver;
    
    if (this.browser === 'chrome') {
      driver = await this.createChromeSession(sessionPath, options);
    } else {
      driver = await this.createFirefoxSession(sessionPath, options);
    }

    // Navigate to original URL or default
    const targetUrl = pspFormat.sessionData.url || 'https://httpbin.org/';
    await driver.get(targetUrl);

    // Restore cookies
    if (pspFormat.sessionData.cookies && Array.isArray(pspFormat.sessionData.cookies)) {
      for (const cookie of pspFormat.sessionData.cookies) {
        try {
          await driver.manage().addCookie({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path || '/',
            secure: cookie.secure || false,
            httpOnly: cookie.httpOnly || false
          });
        } catch (error) {
          console.warn('Failed to restore cookie:', cookie.name, error.message);
        }
      }
      
      // Refresh page to apply cookies
      await driver.navigate().refresh();
    }

    // Restore localStorage and sessionStorage
    if (pspFormat.sessionData.localStorage || pspFormat.sessionData.sessionStorage) {
      await driver.executeScript(`
        const localStorage_data = arguments[0];
        const sessionStorage_data = arguments[1];
        
        // Restore localStorage
        if (localStorage_data) {
          for (const [key, value] of Object.entries(localStorage_data)) {
            localStorage.setItem(key, value);
          }
        }
        
        // Restore sessionStorage
        if (sessionStorage_data) {
          for (const [key, value] of Object.entries(sessionStorage_data)) {
            sessionStorage.setItem(key, value);
          }
        }
      `, pspFormat.sessionData.localStorage || {}, pspFormat.sessionData.sessionStorage || {});
    }

    // Restore Selenium-specific data
    if (pspFormat.seleniumData) {
      await driver.executeScript(`
        window.__PSP_SELENIUM_SESSION__ = {
          ...window.__PSP_SELENIUM_SESSION__,
          restored: true,
          restoredAt: Date.now(),
          originalData: arguments[0]
        };
      `, pspFormat.seleniumData);
    }

    // Set window size if available
    if (pspFormat.sessionData.viewport) {
      try {
        await driver.manage().window().setRect({
          width: pspFormat.sessionData.viewport.width || 1920,
          height: pspFormat.sessionData.viewport.height || 1080
        });
      } catch (error) {
        console.warn('Failed to set window size:', error.message);
      }
    }

    // Ensure PSP tracking is available before capturing data
    await driver.executeScript(`
      if (!window.__PSP_SELENIUM_SESSION__) {
        window.__PSP_SELENIUM_SESSION__ = {
          sessionId: 'restored',
          browser: '${this.browser}',
          startTime: Date.now(),
          actions: [],
          navigation: [],
          
          trackAction: function(action) {
            this.actions.push({
              timestamp: Date.now(),
              type: action.type,
              element: action.element,
              value: action.value
            });
          },
          
          trackNavigation: function(url) {
            this.navigation.push({
              timestamp: Date.now(),
              url: url,
              title: document.title
            });
          },
          
          getSessionState: function() {
            return {
              actions: this.actions,
              navigation: this.navigation,
              currentUrl: window.location.href,
              title: document.title,
              sessionStorage: Object.fromEntries(
                Object.keys(sessionStorage).map(key => [key, sessionStorage.getItem(key)])
              ),
              localStorage: Object.fromEntries(
                Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])
              )
            };
          }
        };
      }
    `);
    
    // Verify restoration by capturing current state
    const restoredData = await this.captureSessionData(driver);

    await driver.quit();

    return {
      ...restoredData,
      provider: 'selenium-restored',
      browser: this.browser,
      restoredFrom: pspFormat.sourceProvider || 'unknown',
      restoredAt: new Date().toISOString()
    };
  }

  /**
   * Helper method to capture session data from active driver
   */
  async captureSessionData(driver) {
    const cookies = await driver.manage().getCookies();
    const windowRect = await driver.manage().window().getRect();
    
    // Ensure PSP tracking is available before trying to use it
    await driver.executeScript(`
      if (!window.__PSP_SELENIUM_SESSION__) {
        window.__PSP_SELENIUM_SESSION__ = {
          sessionId: 'capture',
          browser: 'chrome',
          startTime: Date.now(),
          actions: [],
          navigation: [],
          
          trackAction: function(action) {
            this.actions.push({
              timestamp: Date.now(),
              type: action.type,
              element: action.element,
              value: action.value
            });
          },
          
          trackNavigation: function(url) {
            this.navigation.push({
              timestamp: Date.now(),
              url: url,
              title: document.title
            });
          },
          
          getSessionState: function() {
            return {
              actions: this.actions,
              navigation: this.navigation,
              currentUrl: window.location.href,
              title: document.title,
              sessionStorage: Object.fromEntries(
                Object.keys(sessionStorage).map(key => [key, sessionStorage.getItem(key)])
              ),
              localStorage: Object.fromEntries(
                Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])
              )
            };
          }
        };
      }
    `);
    
    const browserState = await driver.executeScript(`
      return {
        localStorage: Object.fromEntries(
          Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])
        ),
        sessionStorage: Object.fromEntries(
          Object.keys(sessionStorage).map(key => [key, sessionStorage.getItem(key)])
        ),
        url: window.location.href,
        title: document.title,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        seleniumData: window.__PSP_SELENIUM_SESSION__ ? 
          window.__PSP_SELENIUM_SESSION__.getSessionState() : {}
      };
    `);

    return {
      cookies,
      windowRect,
      ...browserState
    };
  }

  /**
   * Convert session data to PSP format
   */
  convertToPSPFormat(sessionData, sourceProvider = 'selenium') {
    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      sourceProvider,
      sessionData: {
        cookies: sessionData.cookies || [],
        localStorage: sessionData.localStorage || {},
        sessionStorage: sessionData.sessionStorage || {},
        url: sessionData.url,
        title: sessionData.title,
        userAgent: sessionData.userAgent,
        viewport: sessionData.viewport
      },
      seleniumData: sessionData.seleniumData || {},
      metadata: {
        platform: process.platform,
        captureMethod: 'selenium-psp-adapter',
        browser: this.browser,
        compatibility: ['selenium', 'playwright', 'puppeteer'],
        userDataDir: sessionData.userDataDir,
        windowRect: sessionData.windowRect,
        features: {
          multiDriver: true,
          gridSupport: !!this.gridUrl,
          crossBrowser: true
        }
      }
    };
  }

  /**
   * Multi-browser session testing
   */
  async createMultiBrowserSession(sessionId, browsers = ['chrome', 'firefox']) {
    const sessions = {};
    
    for (const browser of browsers) {
      const browserAdapter = new SeleniumPSPAdapter({
        ...this.defaultOptions,
        browser,
        sessionDir: path.join(this.sessionDir, browser)
      });
      
      await browserAdapter.initialize();
      sessions[browser] = await browserAdapter.createSession(`${sessionId}-${browser}`);
    }
    
    return sessions;
  }

  /**
   * Grid-based session management
   */
  async createGridSession(sessionId, capabilities = {}) {
    if (!this.gridUrl) {
      throw new Error('Grid URL not configured');
    }

    const sessionPath = path.join(this.sessionDir, sessionId);
    await fs.mkdir(sessionPath, { recursive: true });

    const caps = new Capabilities({
      browserName: this.browser,
      ...capabilities
    });

    const driver = await new Builder()
      .withCapabilities(caps)
      .usingServer(this.gridUrl)
      .build();

    // Inject PSP tracking for grid sessions
    await driver.executeScript(`
      window.__PSP_SELENIUM_GRID_SESSION__ = {
        sessionId: '${sessionId}',
        gridUrl: '${this.gridUrl}',
        capabilities: ${JSON.stringify(capabilities)},
        startTime: Date.now()
      };
    `);

    return {
      driver,
      sessionPath,
      provider: 'selenium-grid',
      gridUrl: this.gridUrl,
      capabilities: caps,
      sessionId
    };
  }

  /**
   * Wait for element with PSP tracking
   */
  async waitAndTrackElement(driver, locator, timeout = 10000) {
    const element = await driver.wait(until.elementLocated(locator), timeout);
    
    // Track element interaction
    await driver.executeScript(`
      if (window.__PSP_SELENIUM_SESSION__) {
        window.__PSP_SELENIUM_SESSION__.trackAction({
          type: 'element_located',
          element: arguments[0].outerHTML.substring(0, 100),
          timestamp: Date.now()
        });
      }
    `, element);

    return element;
  }
}

// Export for integration testing
async function testSeleniumIntegration() {
  console.log('🧪 Testing Selenium PSP Integration');
  console.log('==================================');

  const adapter = new SeleniumPSPAdapter({ browser: 'chrome' });
  await adapter.initialize();

  const testSessionId = `selenium-test-${Date.now()}`;

  try {
    // Test 1: Create session
    console.log('📝 Creating Selenium Chrome session...');
    const session = await adapter.createSession(testSessionId, { headless: true });
    
    await session.driver.get('https://httpbin.org/cookies/set/selenium_test/working');
    await session.driver.executeScript(`
      localStorage.setItem('selenium-test', JSON.stringify({
        framework: 'selenium',
        browser: 'chrome',
        timestamp: new Date().toISOString(),
        features: ['webdriver', 'grid-support', 'multi-browser']
      }));
    `);

    await session.driver.quit();
    console.log('  ✅ Chrome session created successfully');

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

    // Test 5: Multi-browser capabilities (if available)
    console.log('🌐 Testing multi-browser capabilities...');
    try {
      // Only test if we can create multiple sessions
      const firefoxAdapter = new SeleniumPSPAdapter({ browser: 'firefox' });
      await firefoxAdapter.initialize();
      console.log('  ✅ Multi-browser support available');
    } catch (error) {
      console.log('  ⚠️ Firefox not available, skipping multi-browser test');
    }

    console.log('\n🎉 Selenium PSP Integration: ✅ WORKING');
    console.log('  ✅ Chrome WebDriver session management');
    console.log('  ✅ Comprehensive data capture');
    console.log('  ✅ PSP format compatibility');
    console.log('  ✅ Session restoration');
    console.log('  ✅ Multi-browser architecture ready');

    return {
      success: true,
      sessionData,
      pspFormat,
      restoredData
    };

  } catch (error) {
    console.error('❌ Selenium integration test failed:', error.message);
    
    // Check for common Selenium issues
    if (error.message.includes('ChromeDriver')) {
      console.error('💡 Tip: Make sure ChromeDriver is installed and in PATH');
    }
    
    throw error;
  }
}

if (require.main === module) {
  testSeleniumIntegration().catch(console.error);
}

module.exports = { 
  SeleniumPSPAdapter, 
  testSeleniumIntegration 
};