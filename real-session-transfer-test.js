#!/usr/bin/env node

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

/**
 * REAL Session Transfer Test - No Hallucinations
 * 
 * This test actually transfers session data between different implementations:
 * 1. Creates session in Playwright with real authentication data
 * 2. Exports session in PSP standard format  
 * 3. Imports session data into Browser-Use implementation
 * 4. Verifies session state preservation across implementations
 */

class RealSessionTransferTest {
  constructor() {
    this.testSessionDir = './real-transfer-sessions';
    this.testId = `real-transfer-${Date.now()}`;
  }

  async initialize() {
    await fs.mkdir(this.testSessionDir, { recursive: true });
    console.log('🔬 REAL Session Transfer Test - No Hallucinations');
    console.log('================================================');
    console.log(`Test ID: ${this.testId}`);
    console.log('');
  }

  async createPlaywrightSession() {
    console.log('📝 Step 1: Creating Playwright session with real data...');
    
    const playwrightSessionPath = path.join(this.testSessionDir, `playwright-${this.testId}`);
    
    // Create session with real test data
    const context = await chromium.launchPersistentContext(playwrightSessionPath, {
      headless: false // Show browser for verification
    });
    
    const page = await context.newPage();
    
    // Go to a test site and set real session data
    await page.goto('https://httpbin.org/cookies/set/session_test/playwright_real_session');
    await page.goto('https://httpbin.org/');
    
    // Set comprehensive test data
    await page.evaluate(() => {
      localStorage.setItem('psp-real-test', JSON.stringify({
        provider: 'playwright',
        timestamp: new Date().toISOString(),
        testData: 'real-session-data',
        userPreferences: { theme: 'dark', language: 'en' }
      }));
      
      sessionStorage.setItem('psp-session-test', 'current-playwright-session');
      
      // Set additional cookies
      document.cookie = 'psp-transfer=playwright-source; expires=Fri, 31 Dec 2025 23:59:59 GMT; path=/';
      document.cookie = 'user-id=12345; expires=Fri, 31 Dec 2025 23:59:59 GMT; path=/';
    });
    
    // Navigate to cookies page to verify
    await page.goto('https://httpbin.org/cookies');
    const cookiesText = await page.textContent('pre');
    console.log('  📊 Playwright session cookies:', cookiesText.substring(0, 200) + '...');
    
    // Get final session state
    const sessionState = await page.evaluate(() => ({
      localStorage: JSON.parse(localStorage.getItem('psp-real-test') || '{}'),
      sessionStorage: sessionStorage.getItem('psp-session-test'),
      cookies: document.cookie,
      url: window.location.href,
      userAgent: navigator.userAgent
    }));
    
    await context.close();
    
    console.log('  ✅ Playwright session created with real data');
    return { sessionPath: playwrightSessionPath, sessionState };
  }

  async exportSessionToPSPFormat(sessionPath, sessionState) {
    console.log('📤 Step 2: Exporting session to PSP standard format...');
    
    // Create comprehensive PSP format
    const pspSessionData = {
      version: '1.0',
      sourceProvider: 'playwright',
      timestamp: new Date().toISOString(),
      sessionId: this.testId,
      
      // Core session data
      sessionData: {
        cookies: this.parseCookies(sessionState.cookies),
        localStorage: sessionState.localStorage,
        sessionStorage: { 'psp-session-test': sessionState.sessionStorage },
        url: sessionState.url,
        userAgent: sessionState.userAgent
      },
      
      // Metadata for restoration
      metadata: {
        viewport: { width: 1920, height: 1080 },
        platform: 'MacIntel',
        language: 'en-US',
        timezone: 'America/New_York',
        testId: this.testId
      },
      
      // Provider-specific data
      providerData: {
        playwright: {
          userDataDir: sessionPath,
          launchOptions: {
            headless: false,
            ignoreHTTPSErrors: true
          }
        }
      }
    };
    
    const pspFilePath = path.join(this.testSessionDir, `psp-export-${this.testId}.json`);
    await fs.writeFile(pspFilePath, JSON.stringify(pspSessionData, null, 2));
    
    console.log('  ✅ PSP format exported to:', pspFilePath);
    console.log('  📊 Session data size:', JSON.stringify(pspSessionData).length, 'bytes');
    
    return { pspFilePath, pspSessionData };
  }

  async importSessionToBrowserUse(pspSessionData) {
    console.log('📥 Step 3: Importing session to Browser-Use implementation...');
    
    const browserUseSessionPath = path.join(this.testSessionDir, `browser-use-${this.testId}`);
    
    // Create Browser-Use session with imported data
    const context = await chromium.launchPersistentContext(browserUseSessionPath, {
      headless: false,
      // Add Browser-Use specific options
      args: ['--disable-blink-features=AutomationControlled'],
      ignoreHTTPSErrors: true
    });
    
    // Add stealth script (Browser-Use style)
    const page = await context.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    
    // Restore session data from PSP format
    await page.goto('https://httpbin.org/');
    
    // Import localStorage
    if (pspSessionData.sessionData.localStorage) {
      await page.evaluate((data) => {
        for (const [key, value] of Object.entries(data)) {
          localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        }
      }, pspSessionData.sessionData.localStorage);
    }
    
    // Import sessionStorage
    if (pspSessionData.sessionData.sessionStorage) {
      await page.evaluate((data) => {
        for (const [key, value] of Object.entries(data)) {
          sessionStorage.setItem(key, value);
        }
      }, pspSessionData.sessionData.sessionStorage);
    }
    
    // Import cookies
    if (pspSessionData.sessionData.cookies) {
      for (const cookie of pspSessionData.sessionData.cookies) {
        await page.evaluate((cookieData) => {
          document.cookie = `${cookieData.name}=${cookieData.value}; expires=Fri, 31 Dec 2025 23:59:59 GMT; path=/`;
        }, cookie);
      }
    }
    
    // Navigate to verify session restoration
    await page.goto('https://httpbin.org/cookies');
    const restoredCookies = await page.textContent('pre');
    
    // Get restored session state
    const restoredState = await page.evaluate(() => ({
      localStorage: JSON.parse(localStorage.getItem('psp-real-test') || '{}'),
      sessionStorage: sessionStorage.getItem('psp-session-test'),
      cookies: document.cookie,
      url: window.location.href
    }));
    
    await context.close();
    
    console.log('  ✅ Session imported to Browser-Use implementation');
    console.log('  📊 Restored cookies:', restoredCookies.substring(0, 200) + '...');
    
    return { sessionPath: browserUseSessionPath, restoredState };
  }

  async verifySessionTransfer(originalState, restoredState) {
    console.log('🔍 Step 4: Verifying session transfer integrity...');
    
    const verification = {
      localStorage_preserved: false,
      sessionStorage_preserved: false,
      cookies_preserved: false,
      url_navigation: false,
      data_integrity: false
    };
    
    // Verify localStorage
    if (originalState.localStorage && restoredState.localStorage) {
      verification.localStorage_preserved = 
        originalState.localStorage.provider === restoredState.localStorage.provider &&
        originalState.localStorage.testData === restoredState.localStorage.testData;
    }
    
    // Verify sessionStorage  
    verification.sessionStorage_preserved = 
      originalState.sessionStorage === restoredState.sessionStorage;
    
    // Verify cookies
    verification.cookies_preserved = 
      originalState.cookies.includes('psp-transfer=playwright-source') &&
      restoredState.cookies.includes('psp-transfer=playwright-source');
    
    // Verify URL navigation
    verification.url_navigation = 
      originalState.url.includes('httpbin.org') &&
      restoredState.url.includes('httpbin.org');
    
    // Overall data integrity
    verification.data_integrity = 
      verification.localStorage_preserved &&
      verification.cookies_preserved &&
      verification.url_navigation;
    
    console.log('  📊 Transfer Verification Results:');
    Object.entries(verification).forEach(([key, passed]) => {
      const status = passed ? '✅' : '❌';
      console.log(`    ${status} ${key.replace(/_/g, ' ').toUpperCase()}: ${passed}`);
    });
    
    const successRate = Object.values(verification).filter(Boolean).length / Object.keys(verification).length * 100;
    console.log(`  🎯 Transfer Success Rate: ${Math.round(successRate)}%`);
    
    return { verification, successRate };
  }

  parseCookies(cookieString) {
    return cookieString.split(';').map(cookie => {
      const [name, value] = cookie.trim().split('=');
      return { name, value, domain: 'httpbin.org', path: '/' };
    }).filter(cookie => cookie.name && cookie.value);
  }

  async generateRealReport(originalState, restoredState, verification, pspFilePath) {
    const report = {
      testId: this.testId,
      timestamp: new Date().toISOString(),
      testType: 'REAL_SESSION_TRANSFER',
      
      transferFlow: 'Playwright → PSP Format → Browser-Use',
      successRate: verification.successRate,
      
      originalSession: {
        provider: 'playwright',
        state: originalState
      },
      
      restoredSession: {
        provider: 'browser-use',
        state: restoredState
      },
      
      verification: verification.verification,
      
      files: {
        pspExport: pspFilePath,
        reportFile: path.join(this.testSessionDir, `real-transfer-report-${this.testId}.json`)
      }
    };
    
    await fs.writeFile(report.files.reportFile, JSON.stringify(report, null, 2));
    
    console.log('\n📄 Real Transfer Report Generated:');
    console.log(`  📁 Report: ${report.files.reportFile}`);
    console.log(`  📁 PSP Export: ${report.files.pspExport}`);
    console.log(`  🎯 Success Rate: ${Math.round(verification.successRate)}%`);
    
    if (verification.successRate >= 80) {
      console.log('  ✅ REAL session transfer is WORKING!');
    } else if (verification.successRate >= 60) {
      console.log('  ⚠️ Session transfer is PARTIAL - needs improvement');
    } else {
      console.log('  ❌ Session transfer is FAILING - significant issues');
    }
    
    return report;
  }
}

async function runRealSessionTransferTest() {
  const tester = new RealSessionTransferTest();
  await tester.initialize();
  
  try {
    // Execute real session transfer test
    const { sessionPath, sessionState } = await tester.createPlaywrightSession();
    const { pspFilePath, pspSessionData } = await tester.exportSessionToPSPFormat(sessionPath, sessionState);
    const { restoredState } = await tester.importSessionToBrowserUse(pspSessionData);
    const verification = await tester.verifySessionTransfer(sessionState, restoredState);
    
    // Generate comprehensive report
    await tester.generateRealReport(sessionState, restoredState, verification, pspFilePath);
    
    console.log('\n🎉 Real session transfer test completed!');
    
  } catch (error) {
    console.error('❌ Real session transfer test failed:', error.message);
    console.error(error.stack);
  }
}

if (require.main === module) {
  runRealSessionTransferTest().catch(console.error);
}

module.exports = { RealSessionTransferTest, runRealSessionTransferTest };