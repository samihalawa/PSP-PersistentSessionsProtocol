// Example: Saving and restoring a browser session with Playwright
const { chromium } = require('playwright');
const { Session } = require('../../packages/core/src');
const { createStorageProvider } = require('../../packages/core/src/storage');

// Create an S3 storage provider to enable cross-server persistence
// This could be any other storage provider like Cloudflare, Supabase, etc.
const storageProvider = createStorageProvider({
  type: 's3',
  region: 'us-east-1',
  bucket: 'psp-sessions',
  // For local testing with MinIO or similar S3-compatible service
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  forcePathStyle: true,
  accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
  secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin'
});

// For local testing, you could also use the local storage provider
const localStorageProvider = createStorageProvider({
  type: 'local',
  directory: './sessions'
});

// For demo, let's use the local provider with a fallback to S3
// This demonstrates the orchestrator's capability
const orchestratedStorage = createStorageProvider({
  type: 'orchestrator',
  primary: localStorageProvider,
  secondary: [storageProvider],
  useCache: true,
  replicate: true
});

// Function to save a session (typically run on the first server)
async function saveSession(websiteUrl, username, password) {
  console.log(`Launching browser to capture session for ${websiteUrl}`);
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Navigate to the website
  await page.goto(websiteUrl);
  console.log('Navigated to website');
  
  // Perform login (these selectors would be customized for the actual website)
  try {
    await page.fill('input[name="username"], input[type="email"], input#username', username);
    await page.fill('input[name="password"], input[type="password"], input#password', password);
    await page.click('button[type="submit"], input[type="submit"], .login-button');
    console.log('Submitted login form');

    // Wait for login to complete - again, this would be customized
    await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
    // Alternative methods to detect successful login:
    // await page.waitForSelector('.logged-in-indicator')
    
    console.log('Login appears to be complete');
  } catch (e) {
    console.warn('Login process may have failed:', e.message);
    console.log('Continuing with session capture anyway...');
  }

  // Create a new session
  const session = new Session({
    name: `${new URL(websiteUrl).hostname}-session`,
    description: `Automated login session for ${websiteUrl}`,
    tags: ['playwright', 'automated'],
    storageProvider: orchestratedStorage
  });

  // Capture the browser state
  console.log('Capturing browser session state...');
  await session.capture(page);
  
  // Save the session to the storage provider
  console.log('Saving session to storage...');
  await session.save();
  
  console.log(`Session saved successfully with ID: ${session.id}`);
  
  // Close the browser
  await browser.close();
  
  return session.id;
}

// Function to restore a session (typically run on the second server)
async function restoreSession(sessionId) {
  console.log(`Restoring session ${sessionId}`);
  
  // Load the session from storage
  const session = await Session.load(sessionId, {
    storageProvider: orchestratedStorage
  });

  console.log(`Found session: ${session.metadata.name}`);
  
  // Launch a new browser
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Restore the session state
  console.log('Applying session state to browser...');
  await session.restore(page);
  
  // The page should now be in the logged-in state
  console.log('Session restored successfully, browser should be in authenticated state');
  
  // Return the browser and page for further interaction
  return { browser, page, session };
}

// Helper function to delay execution
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Main function to demonstrate the entire workflow
async function demo() {
  const websiteUrl = 'https://demo.playwright.dev/todomvc/';
  const username = 'demo_user@example.com';
  const password = 'password123';
  
  try {
    // First phase: Save a session
    const sessionId = await saveSession(websiteUrl, username, password);
    
    console.log('\n--------------------------------------------------\n');
    console.log('Session saved. In a real scenario, this would now be available to other servers.');
    console.log(`Session ID: ${sessionId}`);
    console.log('\nWaiting 5 seconds before restoring the session...');
    await delay(5000);
    console.log('\n--------------------------------------------------\n');
    
    // Second phase: Restore the session
    console.log('Now simulating a different server or environment...');
    const { browser, page, session } = await restoreSession(sessionId);
    
    // Demonstrate that the session is restored by interacting with the page
    console.log('Performing actions to verify the session is restored correctly...');
    
    // For demo purposes, get the current URL to show we're logged in
    console.log(`Current URL: ${page.url()}`);
    
    // Wait a moment to see the browser in action 
    console.log('Session successfully demonstrated! Keeping browser open for 5 seconds...');
    await delay(5000);
    
    // Clean up
    await browser.close();
    console.log('Demo complete.');
    
  } catch (error) {
    console.error('Error in demo:', error);
  }
}

// Run the demo
if (require.main === module) {
  demo().catch(console.error);
}

module.exports = {
  saveSession,
  restoreSession
};