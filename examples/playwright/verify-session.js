/**
 * PSP Session Verification Tool
 *
 * This script verifies that a previously captured session can be correctly
 * restored by validating its state against a fresh browser instance.
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

/**
 * Verify a session's integrity by loading it in a fresh browser
 *
 * @param {string} sessionId - ID of the session to verify
 * @param {string} [storagePath] - Directory where sessions are stored
 * @returns {Promise<void>}
 */
async function verifySession(sessionId, storagePath = './sessions') {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Load the session data
    const sessionFile = path.join(storagePath, `${sessionId}.json`);
    const sessionData = JSON.parse(await fs.readFile(sessionFile, 'utf8'));

    console.log('🔍 Session Verification');
    console.log('=====================');
    console.log(`Session ID: ${sessionId}`);
    console.log(`Name: ${sessionData.metadata?.name || 'Unnamed Session'}`);
    console.log(`Origin: ${sessionData.origin}`);
    console.log(`Captured: ${new Date(sessionData.timestamp).toLocaleString()}`);
    console.log('=====================');

    // Navigate to the origin from the session
    await page.goto(sessionData.origin);
    console.log(`🌐 Navigated to ${sessionData.origin}`);

    // ---- Test 1: localStorage restoration ----
    console.log('\n📦 TESTING LOCAL STORAGE RESTORATION');

    // Restore localStorage from the session
    await page.evaluate((storedData) => {
      localStorage.clear();
      for (const [key, value] of Object.entries(storedData)) {
        localStorage.setItem(key, value);
      }
    }, sessionData.storage.localStorage);

    // Verify the localStorage values in the browser
    const browserStorage = await page.evaluate(() => {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        data[key] = localStorage.getItem(key);
      }
      return data;
    });

    // Compare with what was stored in the session
    console.log('Verification Results:');
    let localStorageMatches = true;

    for (const [key, value] of Object.entries(sessionData.storage.localStorage)) {
      const browserValue = browserStorage[key];
      const matches = browserValue === value;
      console.log(`  ${matches ? '✅' : '❌'} ${key}: ${value} ${matches ? '==' : '!='} ${browserValue}`);
      if (!matches) localStorageMatches = false;
    }

    // ---- Test 2: sessionStorage restoration ----
    console.log('\n🗄️ TESTING SESSION STORAGE RESTORATION');

    // Restore sessionStorage from the session
    await page.evaluate((storedData) => {
      sessionStorage.clear();
      for (const [key, value] of Object.entries(storedData)) {
        sessionStorage.setItem(key, value);
      }
    }, sessionData.storage.sessionStorage);

    // Verify the sessionStorage values in the browser
    const browserSessionStorage = await page.evaluate(() => {
      const data = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        data[key] = sessionStorage.getItem(key);
      }
      return data;
    });

    // Compare with what was stored in the session
    let sessionStorageMatches = true;

    for (const [key, value] of Object.entries(sessionData.storage.sessionStorage)) {
      const browserValue = browserSessionStorage[key];
      const matches = browserValue === value;
      console.log(`  ${matches ? '✅' : '❌'} ${key}: ${value} ${matches ? '==' : '!='} ${browserValue}`);
      if (!matches) sessionStorageMatches = false;
    }

    // ---- Test 3: Cookie restoration (if possible) ----
    console.log('\n🍪 TESTING COOKIE RESTORATION');

    // Get cookies from the browser
    const browserCookies = await context.cookies();
    const browserCookieMap = {};

    browserCookies.forEach(cookie => {
      browserCookieMap[cookie.name] = cookie.value;
    });

    // Compare with cookies from the session
    let cookiesMatched = true;
    let cookiesChecked = 0;

    if (sessionData.storage.cookies && sessionData.storage.cookies.length > 0) {
      sessionData.storage.cookies.forEach(cookie => {
        if (cookie.domain === new URL(sessionData.origin).hostname) {
          cookiesChecked++;
          const browserValue = browserCookieMap[cookie.name];
          const matches = browserValue === cookie.value;
          console.log(`  ${matches ? '✅' : '❌'} ${cookie.name}: ${cookie.value} ${matches ? '==' : '!='} ${browserValue || '(not set)'}`);
          if (!matches) cookiesMatched = false;
        }
      });

      if (cookiesChecked === 0) {
        console.log('  ℹ️ No domain-specific cookies to verify');
      }
    } else {
      console.log('  ℹ️ No cookies in session data');
    }

    // ---- Summary ----
    console.log('\n📝 VERIFICATION SUMMARY:');
    console.log(`  • Local Storage: ${localStorageMatches ? '✅ All values match' : '❌ Some values do not match'}`);
    console.log(`  • Session Storage: ${sessionStorageMatches ? '✅ All values match' : '❌ Some values do not match'}`);
    console.log(`  • Cookies: ${cookiesChecked === 0 ? 'ℹ️ Not tested' : cookiesMatched ? '✅ All values match' : '❌ Some values do not match'}`);

    const allPassed = localStorageMatches && sessionStorageMatches && (cookiesChecked === 0 || cookiesMatched);
    console.log('\n🏁 FINAL RESULT:');
    console.log(`  ${allPassed ? '✅ PASS' : '❌ FAIL'} - ${allPassed ? 'All tests passed!' : 'Some tests failed!'}`);

    // Keep browser open briefly
    console.log('\n🔍 Browser will close in 10 seconds... Press Ctrl+C to exit immediately.');
    await new Promise(resolve => setTimeout(resolve, 10000));
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  } finally {
    await browser.close();
  }
}

// Parse command line arguments
const sessionId = process.argv[2];
const storagePath = process.argv[3] || './sessions';

// Check if session ID was provided
if (!sessionId) {
  console.error('❌ Session ID is required');
  console.log('Usage: node verify-session.js <session-id> [storage-path]');
  process.exit(1);
}

// Run the verification
verifySession(sessionId, storagePath).catch(error => {
  console.error(`❌ Unhandled error: ${error.message}`);
  process.exit(1);
});