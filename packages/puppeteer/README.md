# PSP Puppeteer Adapter

This package provides a Puppeteer adapter for the Persistent Sessions Protocol. It allows you to capture, store, and restore browser sessions when using the Puppeteer automation framework.

## Installation

```bash
npm install @psp/puppeteer
```

## Usage

```javascript
const puppeteer = require('puppeteer');
const { PuppeteerAdapter } = require('@psp/puppeteer');

async function puppeteerExample() {
  // Launch browser
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Create PSP adapter
  const adapter = new PuppeteerAdapter();
  
  // Create a session
  const session = await adapter.createSession(page, {
    name: 'puppeteer-session',
    description: 'Puppeteer authenticated session'
  });
  
  // Navigate to a login page
  await page.goto('https://example.com/login');
  
  // Fill form and login
  await page.type('#username', 'user@example.com');
  await page.type('#password', 'password123');
  await page.click('button[type="submit"]');
  
  // Wait for navigation
  await page.waitForNavigation();
  
  // Capture the session
  await session.capture();
  
  console.log(`Session saved with ID: ${session.getId()}`);
  
  // Close the browser
  await browser.close();
  
  // Later, in a new browser instance
  const newBrowser = await puppeteer.launch();
  const newPage = await newBrowser.newPage();
  
  // Load the saved session
  const savedSession = await adapter.loadSession(session.getId());
  
  // Restore the session
  await savedSession.restore(newPage);
  
  // Navigate to a protected page - already authenticated
  await newPage.goto('https://example.com/dashboard');
  
  // Take a screenshot to verify
  await newPage.screenshot({ path: 'authenticated.png' });
  
  await newBrowser.close();
}
```

## Advanced Usage with Chrome DevTools Protocol

For more advanced features, you can use the Chrome DevTools Protocol (CDP):

```javascript
const puppeteer = require('puppeteer');
const { PuppeteerAdapter } = require('@psp/puppeteer');

async function cdpExample() {
  // Launch browser
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Get CDP client
  const cdpClient = await page.target().createCDPSession();
  
  // Create PSP adapter with CDP support
  const adapter = new PuppeteerAdapter({
    useCDP: true,
    cdpClient
  });
  
  // Create a session
  const session = await adapter.createSession(page, {
    name: 'cdp-session',
    description: 'Session with CDP support'
  });
  
  // Use CDP to enable more capabilities
  await cdpClient.send('Network.enable');
  await cdpClient.send('Network.setCacheDisabled', { cacheDisabled: true });
  
  // Set up request interception for tokens
  await cdpClient.on('Network.responseReceived', async (params) => {
    if (params.response.url.includes('/api/auth')) {
      const responseBody = await cdpClient.send('Network.getResponseBody', {
        requestId: params.requestId
      });
      
      try {
        const authData = JSON.parse(responseBody.body);
        if (authData.token) {
          console.log('Captured authentication token');
          
          // Store the token in the session
          await session.updateState({
            authToken: authData.token
          });
        }
      } catch (e) {
        // Not JSON or no token
      }
    }
  });
  
  // Navigate to login
  await page.goto('https://example.com/login');
  // ... continue authentication flow
}
```

## Features

- **Full Session Persistence**: Store and restore cookies, localStorage, and sessionStorage.
- **Chrome DevTools Protocol Support**: Access advanced browser features through CDP.
- **Network Monitoring**: Optionally monitor and record network requests.
- **Event Recording & Playback**: Record user interactions and play them back.

## License

MIT