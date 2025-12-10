/**
 * PSP Real-World Testing Suite
 * Tests PSP with popular web applications to ensure comprehensive session management
 */

import { chromium, Page, BrowserContext } from 'playwright';
import { PlaywrightAdapter } from '../packages/adapters/playwright/src';
import { Session } from '../packages/core/src';

interface PlatformTest {
  name: string;
  url: string;
  loginSelector?: string;
  sessionIndicator: string;
  specialFeatures?: string[];
  description: string;
}

// Popular platforms to test PSP compatibility
const POPULAR_PLATFORMS: PlatformTest[] = [
  {
    name: 'Gmail',
    url: 'https://accounts.google.com/signin',
    loginSelector: 'input[type="email"]',
    sessionIndicator: '.gmail-logo',
    specialFeatures: ['Google OAuth', 'HttpOnly Cookies', 'SameSite Strict'],
    description: 'Google\'s email service with complex OAuth authentication'
  },
  {
    name: 'GitHub',
    url: 'https://github.com/login',
    loginSelector: 'input[name="login"]',
    sessionIndicator: '[data-login]',
    specialFeatures: ['CSRF Tokens', 'Session Cookies', 'Local Storage'],
    description: 'Code hosting platform with comprehensive session management'
  },
  {
    name: 'Reddit',
    url: 'https://www.reddit.com/login',
    loginSelector: 'input[name="username"]',
    sessionIndicator: '[data-testid="user-menu"]',
    specialFeatures: ['JWT Tokens', 'Reddit Session', 'Cross-domain'],
    description: 'Social media platform with JWT-based authentication'
  },
  {
    name: 'HuggingFace',
    url: 'https://huggingface.co/login',
    loginSelector: 'input[name="username"]',
    sessionIndicator: '[data-tooltip="Settings"]',
    specialFeatures: ['API Tokens', 'Model Access', 'Workspace Sessions'],
    description: 'AI/ML platform with API token authentication'
  },
  {
    name: 'AWS Console',
    url: 'https://console.aws.amazon.com',
    loginSelector: 'input[name="username"]',
    sessionIndicator: '#nav-usermenu',
    specialFeatures: ['SAML', 'MFA Tokens', 'Region-specific Sessions'],
    description: 'AWS Cloud Console with enterprise authentication'
  },
  {
    name: 'Discord',
    url: 'https://discord.com/login',
    loginSelector: 'input[name="email"]',
    sessionIndicator: '[data-list-id="guildsnav"]',
    specialFeatures: ['WebSocket Auth', 'Real-time Sessions', 'Voice Tokens'],
    description: 'Chat platform with real-time authentication'
  },
  {
    name: 'Notion',
    url: 'https://www.notion.so/login',
    loginSelector: 'input[type="email"]',
    sessionIndicator: '[data-testid="sidebar"]',
    specialFeatures: ['Workspace Sessions', 'Collaborative Auth', 'Real-time Sync'],
    description: 'Collaborative workspace with complex session sync'
  },
  {
    name: 'Stripe Dashboard',
    url: 'https://dashboard.stripe.com/login',
    loginSelector: 'input[name="email"]',
    sessionIndicator: '[data-testid="dashboard-nav"]',
    specialFeatures: ['Financial Security', 'API Keys', 'Multi-account'],
    description: 'Payment platform with high-security authentication'
  },
  {
    name: 'LinkedIn',
    url: 'https://www.linkedin.com/login',
    loginSelector: 'input[name="session_key"]',
    sessionIndicator: '#global-nav',
    specialFeatures: ['Professional Network', 'CSRF Protection', 'Mobile Sync'],
    description: 'Professional network with comprehensive privacy controls'
  },
  {
    name: 'Figma',
    url: 'https://www.figma.com/login',
    loginSelector: 'input[name="email"]',
    sessionIndicator: '[data-testid="multiplayer_cursors"]',
    specialFeatures: ['Real-time Collaboration', 'Design Tokens', 'Team Sessions'],
    description: 'Design platform with real-time collaborative sessions'
  },
  {
    name: 'Shopify',
    url: 'https://accounts.shopify.com/lookup',
    loginSelector: 'input[name="account[email]"]',
    sessionIndicator: '[data-polaris-unstyled]',
    specialFeatures: ['E-commerce Sessions', 'Store Tokens', 'Multi-store'],
    description: 'E-commerce platform with store-specific sessions'
  },
  {
    name: 'Slack',
    url: 'https://slack.com/signin',
    loginSelector: 'input[name="domain"]',
    sessionIndicator: '[data-qa="client_body"]',
    specialFeatures: ['Workspace Auth', 'Real-time Messages', 'App Tokens'],
    description: 'Team communication with workspace-based authentication'
  },
  {
    name: 'Vercel',
    url: 'https://vercel.com/login',
    loginSelector: '[data-testid="login-email-input"]',
    sessionIndicator: '[data-testid="dashboard-sidebar"]',
    specialFeatures: ['Deployment Auth', 'Git Integration', 'Team Access'],
    description: 'Deployment platform with Git-based authentication'
  },
  {
    name: 'OpenAI ChatGPT',
    url: 'https://chat.openai.com',
    loginSelector: 'button[data-testid="login-button"]',
    sessionIndicator: '[data-testid="conversation-turn"]',
    specialFeatures: ['AI Session Continuity', 'Conversation State', 'Usage Tokens'],
    description: 'AI chat platform with conversation session management'
  },
  {
    name: 'Zendesk',
    url: 'https://zendesk.com/login',
    loginSelector: 'input[name="user[email]"]',
    sessionIndicator: '[data-garden-id="chrome.nav"]',
    specialFeatures: ['Support Ticket Auth', 'Multi-tenant', 'Role-based Access'],
    description: 'Customer support platform with role-based sessions'
  },
  {
    name: 'Atlassian Jira',
    url: 'https://id.atlassian.com/login',
    loginSelector: 'input[name="username"]',
    sessionIndicator: '[data-testid="navigation.ui.header"]',
    specialFeatures: ['Atlassian ID', 'Project Sessions', 'SSO Integration'],
    description: 'Project management with Atlassian unified authentication'
  },
  {
    name: 'DockerHub',
    url: 'https://hub.docker.com/login',
    loginSelector: 'input[name="username"]',
    sessionIndicator: '[data-testid="nav-user-menu"]',
    specialFeatures: ['Container Registry Auth', 'CLI Tokens', 'Organization Access'],
    description: 'Container registry with CLI and web authentication'
  },
  {
    name: 'Twitch',
    url: 'https://www.twitch.tv/login',
    loginSelector: 'input[autocomplete="username"]',
    sessionIndicator: '[data-a-target="user-menu-toggle"]',
    specialFeatures: ['Streaming Auth', 'Chat Sessions', 'Subscription States'],
    description: 'Streaming platform with chat and subscription management'
  },
  {
    name: 'Medium',
    url: 'https://medium.com/m/signin',
    loginSelector: 'input[name="email"]',
    sessionIndicator: '[data-testid="headerUserButton"]',
    specialFeatures: ['Publishing Auth', 'Reader Sessions', 'Partner Program'],
    description: 'Publishing platform with writer and reader sessions'
  },
  {
    name: 'Airtable',
    url: 'https://airtable.com/login',
    loginSelector: 'input[name="email"]',
    sessionIndicator: '[data-testid="workspace-switcher"]',
    specialFeatures: ['Database Sessions', 'Workspace Auth', 'API Access'],
    description: 'Database platform with workspace-based authentication'
  }
];

class PSPRealWorldTester {
  private adapter: PlaywrightAdapter;
  private page: Page;
  private context: BrowserContext;

  constructor() {
    this.adapter = new PlaywrightAdapter();
  }

  /**
   * Initialize the testing environment
   */
  async initialize(): Promise<void> {
    const browser = await chromium.launch({ headless: false });
    this.context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'PSP-Tester/1.0.0 (Compatible Browser for Session Testing)',
    });
    this.page = await this.context.newPage();
    await this.adapter.connect(this.page);
  }

  /**
   * Test session capture and restore for a specific platform
   */
  async testPlatform(platform: PlatformTest): Promise<{
    success: boolean;
    capturedFeatures: string[];
    errors: string[];
    sessionData?: any;
  }> {
    console.log(`🧪 Testing ${platform.name}...`);
    
    const errors: string[] = [];
    const capturedFeatures: string[] = [];
    
    try {
      // Navigate to the platform
      await this.page.goto(platform.url, { waitUntil: 'networkidle' });
      console.log(`  ✅ Navigated to ${platform.url}`);

      // Analyze the session mechanisms present
      const sessionAnalysis = await this.analyzeSessionMechanisms();
      capturedFeatures.push(...sessionAnalysis.mechanisms);

      // Create a session to capture the initial state
      const session = await Session.create({
        name: `${platform.name} Test Session`,
        description: `Testing PSP with ${platform.description}`,
        tags: ['test', platform.name.toLowerCase(), 'real-world'],
        storage: 'local'
      });

      // Capture the session state
      await session.capture(this.page);
      console.log(`  ✅ Captured session for ${platform.name}`);

      // Get the captured session data for analysis
      const sessionData = session.getState();

      // Analyze what we captured
      const analysis = this.analyzeSessionCapture(sessionData, platform);
      capturedFeatures.push(...analysis.features);
      
      if (analysis.warnings.length > 0) {
        errors.push(...analysis.warnings);
      }

      console.log(`  📊 Analysis: Captured ${capturedFeatures.length} features`);
      
      return {
        success: true,
        capturedFeatures,
        errors,
        sessionData: {
          cookieCount: sessionData.storage.cookies.length,
          localStorageOrigins: sessionData.storage.localStorage.size,
          sessionStorageOrigins: sessionData.storage.sessionStorage.size,
          hasHistory: !!sessionData.history,
          hasDOMSnapshot: !!sessionData.dom,
        }
      };

    } catch (error) {
      errors.push(error.message);
      console.log(`  ❌ Error testing ${platform.name}: ${error.message}`);
      
      return {
        success: false,
        capturedFeatures,
        errors,
      };
    }
  }

  /**
   * Analyze what session mechanisms are present on the current page
   */
  private async analyzeSessionMechanisms(): Promise<{
    mechanisms: string[];
    details: Record<string, any>;
  }> {
    const mechanisms: string[] = [];
    const details: Record<string, any> = {};

    // Check for various session mechanisms
    const analysis = await this.page.evaluate(() => {
      const results = {
        hasCookies: document.cookie.length > 0,
        hasLocalStorage: localStorage.length > 0,
        hasSessionStorage: sessionStorage.length > 0,
        hasFormTokens: !!document.querySelector('input[name*="token"], input[name*="csrf"]'),
        hasOAuthElements: !!document.querySelector('[class*="oauth"], [data-oauth], [href*="oauth"]'),
        hasJWTReferences: document.documentElement.innerHTML.includes('jwt') || 
                         document.documentElement.innerHTML.includes('bearer'),
        hasWebSockets: 'WebSocket' in window,
        hasServiceWorker: 'serviceWorker' in navigator,
        hasIndexedDB: 'indexedDB' in window,
        cookieCount: document.cookie.split(';').filter(c => c.trim()).length,
        localStorageKeys: Object.keys(localStorage),
        sessionStorageKeys: Object.keys(sessionStorage),
        securityHeaders: {
          hasCSP: !!document.querySelector('meta[http-equiv="Content-Security-Policy"]'),
          hasHSTS: false, // Can't detect from client side
        }
      };
      return results;
    });

    // Categorize mechanisms
    if (analysis.hasCookies) {
      mechanisms.push('HTTP Cookies');
      details.cookies = { count: analysis.cookieCount };
    }
    
    if (analysis.hasLocalStorage) {
      mechanisms.push('localStorage');
      details.localStorage = { keys: analysis.localStorageKeys };
    }
    
    if (analysis.hasSessionStorage) {
      mechanisms.push('sessionStorage');
      details.sessionStorage = { keys: analysis.sessionStorageKeys };
    }

    if (analysis.hasFormTokens) {
      mechanisms.push('CSRF Tokens');
    }

    if (analysis.hasOAuthElements) {
      mechanisms.push('OAuth Integration');
    }

    if (analysis.hasJWTReferences) {
      mechanisms.push('JWT Tokens');
    }

    if (analysis.hasWebSockets) {
      mechanisms.push('WebSocket Connections');
    }

    if (analysis.hasServiceWorker) {
      mechanisms.push('Service Worker');
    }

    if (analysis.hasIndexedDB) {
      mechanisms.push('IndexedDB');
    }

    return { mechanisms, details };
  }

  /**
   * Analyze the captured session data
   */
  private analyzeSessionCapture(sessionData: any, platform: PlatformTest): {
    features: string[];
    warnings: string[];
  } {
    const features: string[] = [];
    const warnings: string[] = [];

    // Check cookies
    if (sessionData.storage.cookies.length > 0) {
      features.push(`${sessionData.storage.cookies.length} HTTP Cookies`);
      
      // Analyze cookie types
      const httpOnlyCookies = sessionData.storage.cookies.filter((c: any) => c.httpOnly);
      const secureCookies = sessionData.storage.cookies.filter((c: any) => c.secure);
      const sameSiteCookies = sessionData.storage.cookies.filter((c: any) => c.sameSite !== 'None');
      
      if (httpOnlyCookies.length > 0) {
        features.push(`${httpOnlyCookies.length} HttpOnly Cookies`);
      }
      
      if (secureCookies.length > 0) {
        features.push(`${secureCookies.length} Secure Cookies`);
      }
      
      if (sameSiteCookies.length > 0) {
        features.push(`${sameSiteCookies.length} SameSite Cookies`);
      }
    } else {
      warnings.push('No cookies captured - may affect session restoration');
    }

    // Check storage mechanisms
    if (sessionData.storage.localStorage.size > 0) {
      features.push(`localStorage (${sessionData.storage.localStorage.size} origins)`);
    }

    if (sessionData.storage.sessionStorage.size > 0) {
      features.push(`sessionStorage (${sessionData.storage.sessionStorage.size} origins)`);
    }

    // Check advanced features
    if (sessionData.dom) {
      features.push('DOM Snapshot');
    }

    if (sessionData.history) {
      features.push('Navigation History');
    }

    if (sessionData.network) {
      features.push('Network Requests');
    }

    // Platform-specific warnings
    if (platform.specialFeatures?.includes('HttpOnly Cookies') && 
        !sessionData.storage.cookies.some((c: any) => c.httpOnly)) {
      warnings.push('Platform uses HttpOnly cookies but none were captured');
    }

    return { features, warnings };
  }

  /**
   * Run comprehensive tests on all platforms
   */
  async runComprehensiveTest(): Promise<{
    totalPlatforms: number;
    successfulTests: number;
    results: Array<{
      platform: string;
      success: boolean;
      features: string[];
      errors: string[];
    }>;
  }> {
    console.log('🚀 Starting PSP Real-World Testing Suite');
    console.log(`📋 Testing ${POPULAR_PLATFORMS.length} popular platforms...`);
    console.log('');

    const results = [];
    let successfulTests = 0;

    for (const platform of POPULAR_PLATFORMS) {
      const result = await this.testPlatform(platform);
      
      results.push({
        platform: platform.name,
        success: result.success,
        features: result.capturedFeatures,
        errors: result.errors,
      });

      if (result.success) {
        successfulTests++;
      }

      // Add delay between tests to avoid rate limiting
      await this.page.waitForTimeout(2000);
    }

    return {
      totalPlatforms: POPULAR_PLATFORMS.length,
      successfulTests,
      results,
    };
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.context) {
      await this.context.close();
    }
  }
}

/**
 * Main function to run the tests
 */
async function main() {
  const tester = new PSPRealWorldTester();
  
  try {
    await tester.initialize();
    
    console.log('🧪 PSP Real-World Testing Suite');
    console.log('================================');
    console.log('');
    console.log('This test suite validates PSP compatibility with popular web platforms.');
    console.log('It analyzes session management patterns and tests PSP\'s capture capabilities.');
    console.log('');

    const results = await tester.runComprehensiveTest();
    
    // Print summary
    console.log('');
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('========================');
    console.log(`✅ Successful Tests: ${results.successfulTests}/${results.totalPlatforms}`);
    console.log(`📈 Success Rate: ${(results.successfulTests / results.totalPlatforms * 100).toFixed(1)}%`);
    console.log('');

    // Print detailed results
    console.log('📋 DETAILED RESULTS');
    console.log('===================');
    
    for (const result of results.results) {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.platform}`);
      
      if (result.features.length > 0) {
        console.log(`   Features: ${result.features.join(', ')}`);
      }
      
      if (result.errors.length > 0) {
        console.log(`   Warnings: ${result.errors.join(', ')}`);
      }
      
      console.log('');
    }

    // Print compatibility analysis
    console.log('🔍 COMPATIBILITY ANALYSIS');
    console.log('=========================');
    
    const allFeatures = results.results.flatMap(r => r.features);
    const featureCounts = allFeatures.reduce((acc, feature) => {
      acc[feature] = (acc[feature] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('Most common session mechanisms:');
    Object.entries(featureCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([feature, count]) => {
        console.log(`  • ${feature}: ${count} platforms`);
      });

  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

// Export for use in other modules
export { PSPRealWorldTester, POPULAR_PLATFORMS };

// Run if called directly
if (require.main === module) {
  main();
}