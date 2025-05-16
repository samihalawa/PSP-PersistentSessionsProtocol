/**
 * PSP (Persistent Sessions Protocol) Demo for Playwright
 *
 * This file demonstrates how to capture and restore browser sessions
 * using the Persistent Sessions Protocol with Playwright.
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

/**
 * Session class handles browser session state capture and restoration
 */
class Session {
  /**
   * Create a new session
   *
   * @param {Object} options Configuration options
   * @param {string} [options.id] Unique session ID (auto-generated if not provided)
   * @param {string} [options.name] Human-readable session name
   * @param {string} [options.storagePath] Directory to store session files
   * @param {Object} [options.metadata] Additional metadata for the session
   */
  constructor(options = {}) {
    this.id = options.id || Math.random().toString(36).substring(2, 10);
    this.name = options.name || 'Unnamed Session';
    this.storagePath = options.storagePath || './sessions';
    this.metadata = options.metadata || {};
  }

  /**
   * Capture the current browser state
   *
   * @param {Page} page Playwright page object
   * @returns {Promise<Object>} Captured session state
   */
  async capture(page) {
    console.log(`📸 Capturing session: ${this.name} (${this.id})`);

    // Get cookies
    const cookies = await page.context().cookies();

    // Get localStorage and sessionStorage
    const storage = await page.evaluate(() => {
      const localStorage = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        localStorage[key] = window.localStorage.getItem(key);
      }

      const sessionStorage = {};
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        sessionStorage[key] = window.sessionStorage.getItem(key);
      }

      return { localStorage, sessionStorage };
    });

    // Create the session state
    const state = {
      version: '1.0.0',
      timestamp: Date.now(),
      origin: new URL(page.url()).origin,
      storage: {
        cookies,
        localStorage: storage.localStorage,
        sessionStorage: storage.sessionStorage
      },
      url: page.url(),
      metadata: {
        name: this.name,
        captureDate: new Date().toISOString(),
        browser: 'playwright',
        ...this.metadata
      }
    };

    // Ensure the directory exists
    await fs.mkdir(this.storagePath, { recursive: true });

    // Save the session state
    await fs.writeFile(
      path.join(this.storagePath, `${this.id}.json`),
      JSON.stringify(state, null, 2)
    );

    console.log(`✅ Session saved: ${this.id}`);
    return state;
  }

  /**
   * Restore a previously captured browser state
   *
   * @param {Page} page Playwright page object
   * @returns {Promise<boolean>} Success status
   */
  async restore(page) {
    console.log(`🔄 Restoring session: ${this.name} (${this.id})`);

    try {
      // Load the session state
      const data = await fs.readFile(
        path.join(this.storagePath, `${this.id}.json`),
        'utf8'
      );
      const state = JSON.parse(data);

      // Set cookies
      await page.context().addCookies(state.storage.cookies);

      // Set localStorage and sessionStorage
      await page.goto(state.origin);

      await page.evaluate((storage) => {
        // Clear existing storage
        localStorage.clear();
        sessionStorage.clear();

        // Set localStorage items
        for (const [key, value] of Object.entries(storage.localStorage)) {
          localStorage.setItem(key, value);
        }

        // Set sessionStorage items
        for (const [key, value] of Object.entries(storage.sessionStorage)) {
          sessionStorage.setItem(key, value);
        }
      }, state.storage);

      // Navigate to the original URL
      if (state.url) {
        await page.goto(state.url);
      }

      console.log(`✅ Session restored: ${this.id}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to restore session: ${error.message}`);
      return false;
    }
  }

  /**
   * Load a session by ID
   *
   * @param {string} id Session ID
   * @param {Object} options Configuration options
   * @returns {Promise<Session>} Loaded session
   */
  static async load(id, options = {}) {
    const session = new Session({
      id,
      storagePath: options.storagePath || './sessions'
    });

    try {
      // Load the session state to get the name and metadata
      const data = await fs.readFile(
        path.join(session.storagePath, `${id}.json`),
        'utf8'
      );
      const state = JSON.parse(data);
      session.name = state.metadata?.name || session.name;
      session.metadata = state.metadata || {};
      return session;
    } catch (error) {
      console.error(`❌ Failed to load session: ${error.message}`);
      return session;
    }
  }
}

/**
 * Capture a browser session from a website
 *
 * @param {string} url URL to navigate to
 * @param {string} [username] Optional username for login
 * @param {string} [password] Optional password for login
 * @returns {Promise<string>} Session ID
 */
async function captureSession(url, username, password) {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Create a new session
  const session = new Session({
    name: `${new URL(url).hostname}-session`,
    metadata: {
      url,
      captureTime: new Date().toISOString()
    }
  });

  try {
    console.log(`🌐 Navigating to ${url}`);
    await page.goto(url);

    // Demo for github.com login (replace with your target site)
    if (url.includes('github.com') && username && password) {
      console.log('🔑 Logging in to GitHub...');
      await page.fill('input[name="login"]', username);
      await page.fill('input[name="password"]', password);
      await page.click('input[type="submit"]');

      // Wait for navigation to complete
      await page.waitForNavigation();

      // Check if we're logged in
      const loggedIn = await page.isVisible('summary[aria-label="View profile and more"]');
      if (!loggedIn) {
        throw new Error('Login failed');
      }
      console.log('🎉 Logged in successfully');
    } else {
      // Generic demo - just set some localStorage values
      await page.evaluate(() => {
        localStorage.setItem('psp-demo-value1', 'This is a test value');
        localStorage.setItem('psp-demo-value2', 'Another test value');
        localStorage.setItem('psp-timestamp', Date.now().toString());
        localStorage.setItem('psp-random', Math.random().toString());
      });
      console.log('💾 Set demo localStorage values');
    }

    // Capture the session
    await session.capture(page);

    console.log(`📋 Session ID: ${session.id}`);
    return session.id;
  } finally {
    await browser.close();
  }
}

/**
 * Restore a previously captured browser session
 *
 * @param {string} sessionId Session ID to restore
 * @returns {Promise<void>}
 */
async function restoreSession(sessionId) {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Load the saved session
    const session = await Session.load(sessionId);

    // Restore the session state
    await session.restore(page);

    // Keep the browser open for demonstration
    console.log('🔍 Browser restored with session state. Press Ctrl+C to exit.');
    await new Promise(() => {}); // Keep the process running
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    await browser.close();
  }
}

/**
 * List all available sessions
 *
 * @param {string} [storagePath] Path to sessions directory
 * @returns {Promise<void>}
 */
async function listSessions(storagePath = './sessions') {
  try {
    // Ensure sessions directory exists
    await fs.mkdir(storagePath, { recursive: true });

    // Get all JSON files in the sessions directory
    const files = await fs.readdir(storagePath);
    const sessionFiles = files.filter(file => file.endsWith('.json'));

    if (sessionFiles.length === 0) {
      console.log('No sessions found');
      return;
    }

    console.log('\n📋 Available Sessions:');
    console.log('====================');

    // Read and display each session
    for (const file of sessionFiles) {
      const sessionId = file.replace('.json', '');
      try {
        const data = await fs.readFile(path.join(storagePath, file), 'utf8');
        const session = JSON.parse(data);

        // Format and display session info
        const timestamp = new Date(session.timestamp).toLocaleString();
        const name = session.metadata?.name || 'Unnamed Session';

        console.log(`ID: ${sessionId}`);
        console.log(`Name: ${name}`);
        console.log(`URL: ${session.url || 'Unknown'}`);
        console.log(`Captured: ${timestamp}`);
        console.log('====================');
      } catch (error) {
        console.log(`ID: ${sessionId} (Error reading session data)`);
      }
    }
  } catch (error) {
    console.error(`❌ Error listing sessions: ${error.message}`);
  }
}

// Parse command line arguments
const action = process.argv[2];
const param1 = process.argv[3];
const param2 = process.argv[4];
const param3 = process.argv[5];

// Main function
async function main() {
  if (action === 'capture') {
    const url = param1 || 'https://example.com';
    const username = param2;
    const password = param3;

    const sessionId = await captureSession(url, username, password);
    console.log('\n✨ To restore this session, run:');
    console.log(`node session-demo.js restore ${sessionId}`);
  } else if (action === 'restore') {
    const sessionId = param1;
    if (!sessionId) {
      console.error('❌ Session ID is required');
      console.log('Usage: node session-demo.js restore <session-id>');
      process.exit(1);
    }

    await restoreSession(sessionId);
  } else if (action === 'list') {
    await listSessions(param1);
  } else {
    console.log('PSP Playwright Session Demo');
    console.log('==========================');
    console.log('\nCommands:');
    console.log('  capture [url] [username] [password] - Capture a new browser session');
    console.log('  restore <session-id>               - Restore a previously saved session');
    console.log('  list [directory]                   - List all available sessions');
    console.log('\nExamples:');
    console.log('  node session-demo.js capture https://example.com');
    console.log('  node session-demo.js capture https://github.com/login username password');
    console.log('  node session-demo.js restore a1b2c3d4');
    console.log('  node session-demo.js list');
  }
}

// Run the program
main().catch(error => {
  console.error(`❌ Unhandled error: ${error.message}`);
  process.exit(1);
});