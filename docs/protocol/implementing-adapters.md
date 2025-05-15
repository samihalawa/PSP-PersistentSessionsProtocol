# Implementing PSP Adapters

This guide explains how to implement PSP adapters for browser automation frameworks.

## Overview

A PSP adapter translates between the PersistentSessionsProtocol data model and a specific browser automation framework. Each adapter must implement these core functions:

1. **Session capture** - Extract state from a browser instance
2. **Session restoration** - Apply state to a browser instance
3. **Event recording** - Capture user interactions
4. **Event replay** - Reproduce recorded actions

## Required Capabilities

When implementing an adapter, you'll need to address these capabilities:

| Capability | Description | Priority |
|------------|-------------|----------|
| Cookies | Access to browser cookies | Required |
| LocalStorage | Access to localStorage | Required |
| SessionStorage | Access to sessionStorage | Required |
| History Handling | Browser history management | Required |
| Event Recording | User interaction capture | Required |
| Event Replay | Playback of recorded events | Required |
| Network Capture | Request/response recording | Optional |
| DOM State | HTML/DOM structure storage | Optional |
| IndexedDB | IndexedDB database access | Optional |
| WebSocket | WebSocket connection state | Optional |

## Adapter Interface

Each adapter should implement this general interface:

```typescript
interface PSPAdapter {
  // Initialize the adapter
  initialize(options?: AdapterOptions): Promise<void>;
  
  // Connect to browser/framework
  connect(target: any): Promise<void>;
  
  // Capture state from browser
  captureState(): Promise<BrowserSessionState>;
  
  // Apply state to browser
  applyState(state: BrowserSessionState): Promise<void>;
  
  // Start recording events
  startRecording(options?: RecordingOptions): Promise<void>;
  
  // Stop recording and return events
  stopRecording(): Promise<Event[]>;
  
  // Play recorded events
  playRecording(events: Event[], options?: PlaybackOptions): Promise<void>;
  
  // Clean up resources
  dispose(): Promise<void>;
}

interface AdapterOptions {
  // Features to enable (for selective capture/restore)
  features?: {
    cookies?: boolean;
    localStorage?: boolean;
    sessionStorage?: boolean;
    history?: boolean;
    network?: boolean;
    dom?: boolean;
    indexedDB?: boolean;
  };
  
  // Storage options
  storage?: StorageOptions;
  
  // Recording options
  recording?: RecordingOptions;
  
  // Framework-specific options
  [key: string]: any;
}
```

## Implementation Guidelines

### Step 1: State Capture

Implement state capture mechanisms for each storage type:

#### Cookies

```typescript
async function captureCookies(target): Promise<Cookie[]> {
  // Framework-specific cookie access
  const rawCookies = await target.cookies();
  
  // Convert to PSP format
  return rawCookies.map(cookie => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    expires: cookie.expires,
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: cookie.sameSite,
    partitioned: cookie.partitioned || false
  }));
}
```

#### localStorage and sessionStorage

This often requires JavaScript execution:

```typescript
async function captureLocalStorage(target, origin): Promise<Map<string, string>> {
  // Execute JavaScript to extract localStorage
  const result = await target.evaluate(() => {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      data[key] = localStorage.getItem(key);
    }
    return data;
  });
  
  return new Map(Object.entries(result));
}
```

### Step 2: State Restoration

Implement state restoration for each component:

#### Cookies

```typescript
async function restoreCookies(target, cookies: Cookie[]): Promise<void> {
  // Framework-specific cookie setting
  for (const cookie of cookies) {
    await target.setCookie(cookie);
  }
}
```

#### localStorage and sessionStorage

```typescript
async function restoreLocalStorage(target, origin: string, data: Map<string, string>): Promise<void> {
  // Convert Map to object for serialization
  const storageObj = Object.fromEntries(data);
  
  // Execute JavaScript to set localStorage
  await target.evaluate((storageData) => {
    localStorage.clear();
    for (const [key, value] of Object.entries(storageData)) {
      localStorage.setItem(key, value);
    }
  }, storageObj);
}
```

### Step 3: Event Recording

Implement event recording:

```typescript
async function startEventRecording(target): Promise<void> {
  // Set up event listeners via JavaScript
  await target.evaluate(() => {
    window._pspEvents = [];
    window._pspStartTime = Date.now();
    
    // Record clicks
    document.addEventListener('click', (e) => {
      window._pspEvents.push({
        type: 'click',
        timestamp: Date.now() - window._pspStartTime,
        target: cssPath(e.target),
        data: {
          button: e.button,
          clientX: e.clientX,
          clientY: e.clientY,
          altKey: e.altKey,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
          metaKey: e.metaKey
        }
      });
    }, true);
    
    // Helper function to generate CSS selector
    function cssPath(el) {
      // Implementation of CSS path generation
      // ...
    }
    
    // Additional event listener setup...
  });
}
```

### Step 4: Event Replay

Implement event playback:

```typescript
async function replayEvents(target, events: Event[]): Promise<void> {
  for (const event of events) {
    switch (event.type) {
      case 'click':
        await replayClick(target, event);
        break;
      case 'input':
        await replayInput(target, event);
        break;
      // Handle other event types
    }
  }
}

async function replayClick(target, event: ClickEvent): Promise<void> {
  // Framework-specific click implementation
  await target.click(event.target, {
    button: event.data.button,
    position: {
      x: event.data.clientX,
      y: event.data.clientY
    },
    modifiers: [
      event.data.altKey && 'Alt',
      event.data.ctrlKey && 'Control',
      event.data.shiftKey && 'Shift',
      event.data.metaKey && 'Meta'
    ].filter(Boolean)
  });
}
```

## Framework-Specific Implementation Examples

### Playwright Adapter

```typescript
class PlaywrightAdapter implements PSPAdapter {
  private page: Page;
  private recording: boolean = false;
  private events: Event[] = [];
  private startTime: number = 0;
  
  async connect(page: Page): Promise<void> {
    this.page = page;
  }
  
  async captureState(): Promise<BrowserSessionState> {
    // Use Playwright's built-in state capture for cookies and storage
    const storageState = await this.page.context().storageState();
    
    // Collect additional state
    const url = this.page.url();
    const title = await this.page.title();
    
    // Build the complete state object
    return {
      version: '1.0.0',
      timestamp: Date.now(),
      origin: new URL(url).origin,
      storage: {
        cookies: storageState.cookies.map(cookie => ({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          expires: cookie.expires,
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite as any,
          partitioned: false // Playwright doesn't yet support partitioned cookies
        })),
        localStorage: this.convertStorageToMap(storageState.origins),
        sessionStorage: new Map() // Requires custom implementation
      },
      history: {
        currentUrl: url,
        entries: [{ url, title, timestamp: Date.now() }],
        currentIndex: 0
      },
      recording: this.recording ? {
        events: this.events,
        startTime: this.startTime,
        duration: Date.now() - this.startTime
      } : undefined
    };
  }
  
  async applyState(state: BrowserSessionState): Promise<void> {
    // Build Playwright-compatible storageState
    const storageState = {
      cookies: state.storage.cookies,
      origins: this.convertMapToStorageOrigins(state.storage.localStorage)
    };
    
    // Apply storage state
    await this.page.context().addCookies(storageState.cookies);
    
    // Apply localStorage
    for (const [origin, storage] of state.storage.localStorage.entries()) {
      await this.page.context().addInitScript(script => {
        if (window.location.origin === script.origin) {
          for (const [key, value] of Object.entries(script.storage)) {
            window.localStorage.setItem(key, value);
          }
        }
      }, { origin, storage: Object.fromEntries(storage) });
    }
    
    // Navigate to current URL if needed
    if (state.history?.currentUrl && this.page.url() !== state.history.currentUrl) {
      await this.page.goto(state.history.currentUrl);
    }
  }
  
  // Additional methods implementation...
  
  private convertStorageToMap(origins: any[]): Map<string, Map<string, string>> {
    const result = new Map();
    for (const origin of origins) {
      const storageMap = new Map();
      for (const [key, value] of Object.entries(origin.localStorage)) {
        storageMap.set(key, value as string);
      }
      result.set(origin.origin, storageMap);
    }
    return result;
  }
  
  private convertMapToStorageOrigins(map: Map<string, Map<string, string>>): any[] {
    return Array.from(map.entries()).map(([origin, storage]) => ({
      origin,
      localStorage: Object.fromEntries(storage)
    }));
  }
}
```

### Selenium Adapter

```typescript
class SeleniumAdapter implements PSPAdapter {
  private driver: WebDriver;
  
  async connect(driver: WebDriver): Promise<void> {
    this.driver = driver;
  }
  
  async captureState(): Promise<BrowserSessionState> {
    // Current URL and title
    const url = await this.driver.getCurrentUrl();
    const title = await this.driver.getTitle();
    
    // Get cookies
    const cookies = await this.driver.manage().getCookies();
    
    // Get localStorage and sessionStorage via JavaScript
    const storage = await this.driver.executeScript(() => {
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
    
    // Build complete state object
    return {
      version: '1.0.0',
      timestamp: Date.now(),
      origin: new URL(url).origin,
      storage: {
        cookies: cookies.map(cookie => ({
          name: cookie.getName(),
          value: cookie.getValue(),
          domain: cookie.getDomain(),
          path: cookie.getPath(),
          expires: cookie.getExpiry()?.getTime() || null,
          httpOnly: cookie.isHttpOnly(),
          secure: cookie.isSecure(),
          sameSite: 'Lax', // Selenium doesn't expose SameSite
          partitioned: false
        })),
        localStorage: this.convertStorageToMap(storage.localStorage, url),
        sessionStorage: this.convertStorageToMap(storage.sessionStorage, url)
      },
      history: {
        currentUrl: url,
        entries: [{ url, title, timestamp: Date.now() }],
        currentIndex: 0
      }
    };
  }
  
  async applyState(state: BrowserSessionState): Promise<void> {
    // Set cookies
    for (const cookie of state.storage.cookies) {
      await this.driver.manage().addCookie({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expiry: cookie.expires ? new Date(cookie.expires) : undefined,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure
      });
    }
    
    // Navigate to the URL
    if (state.history?.currentUrl) {
      await this.driver.get(state.history.currentUrl);
      
      // Set localStorage and sessionStorage
      const origin = new URL(state.history.currentUrl).origin;
      const localStorage = state.storage.localStorage.get(origin);
      const sessionStorage = state.storage.sessionStorage.get(origin);
      
      if (localStorage || sessionStorage) {
        await this.driver.executeScript((ls, ss) => {
          if (ls) {
            window.localStorage.clear();
            for (const [key, value] of Object.entries(ls)) {
              window.localStorage.setItem(key, value);
            }
          }
          
          if (ss) {
            window.sessionStorage.clear();
            for (const [key, value] of Object.entries(ss)) {
              window.sessionStorage.setItem(key, value);
            }
          }
        }, localStorage ? Object.fromEntries(localStorage) : null, 
           sessionStorage ? Object.fromEntries(sessionStorage) : null);
      }
    }
  }
  
  // Additional methods implementation...
  
  private convertStorageToMap(storage: Record<string, string>, url: string): Map<string, Map<string, string>> {
    const map = new Map();
    const origin = new URL(url).origin;
    const storageMap = new Map(Object.entries(storage));
    map.set(origin, storageMap);
    return map;
  }
}
```

## Testing Your Adapter

When testing your adapter, verify these scenarios:

1. **Authentication persistence** - Capture session after login, restore in new browser, verify still logged in
2. **Form state persistence** - Capture with form partially filled, restore and verify form values
3. **Navigation history** - Capture after browsing multiple pages, restore and test back/forward
4. **Cookie handling** - Verify all cookies including HttpOnly and secure cookies are properly handled
5. **Cross-origin storage** - Test with sites that store data across multiple origins

## Performance Optimization

Consider these optimization techniques:

1. **Selective capture** - Only capture needed state components
2. **Asynchronous processing** - Perform heavy operations async where possible
3. **Batched operations** - Group related operations
4. **Compression** - Compress large state objects

## Security Considerations

When implementing an adapter:

1. **Handle credentials carefully** - Use secure storage for sensitive data
2. **Sanitize session data** - Remove sensitive information when requested
3. **Support encryption** - Implement encryption for stored session data
4. **Respect origin policies** - Don't bypass cross-origin restrictions