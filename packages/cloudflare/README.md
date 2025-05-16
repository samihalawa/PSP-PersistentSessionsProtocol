# PSP Cloudflare Adapter

This package provides a Cloudflare adapter for the Persistent Sessions Protocol. It allows you to capture, store, and restore browser sessions when using Cloudflare Workers and Browser Rendering.

## Installation

```bash
npm install @psp/cloudflare
```

## Usage

```javascript
import { Renderer } from '@cloudflare/browser-rendering';
import { CloudflareAdapter } from '@psp/cloudflare';

export default {
  async fetch(request, env, ctx) {
    // Check if we have a session ID in the request
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    
    // Initialize the browser renderer
    const renderer = new Renderer();
    
    // Create PSP adapter with KV storage
    const adapter = new CloudflareAdapter({
      storageProvider: {
        type: 'cloudflare-kv',
        namespace: env.PSP_SESSIONS
      }
    });
    
    // If we have a session ID, try to restore it
    if (sessionId) {
      try {
        const session = await adapter.loadSession(sessionId);
        await session.restore(renderer);
        
        console.log('Session restored successfully');
      } catch (error) {
        console.error('Failed to restore session:', error);
        // Continue with a new session
      }
    }
    
    // Navigate to the target page
    const targetUrl = url.searchParams.get('url') || 'https://example.com';
    await renderer.goto(targetUrl);
    
    // Interact with the page
    if (!sessionId) {
      // If this is a new session, perform login
      await renderer.goto('https://example.com/login');
      await renderer.fill('#username', 'user@example.com');
      await renderer.fill('#password', 'password123');
      await renderer.click('button[type="submit"]');
      await renderer.waitForNavigation();
      
      // Create and capture the session
      const session = await adapter.createSession(renderer, {
        name: 'cloudflare-session',
        description: 'Cloudflare Browser authenticated session'
      });
      
      await session.capture();
      
      // Return the session ID in the response
      return new Response(JSON.stringify({
        sessionId: session.getId(),
        message: 'Session created successfully'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Take a screenshot of the authenticated page
    const screenshot = await renderer.screenshot();
    
    // Return the screenshot
    return new Response(screenshot, {
      headers: { 'Content-Type': 'image/png' }
    });
  }
};
```

## Features

- **Serverless-First Design**: Optimized for Cloudflare Workers environment.
- **KV Storage Provider**: Built-in support for Cloudflare KV for session storage.
- **Screenshot Capture**: Capture screenshots for visual verification.
- **Full Session Persistence**: Store and restore cookies, localStorage, and sessionStorage.

## License

MIT