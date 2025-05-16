"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserUseAdapter = void 0;
const core_1 = require("@psp/core");
/**
 * Adapter implementation for Browser-Use framework
 */
class BrowserUseAdapter extends core_1.Adapter {
    /**
     * Creates a new BrowserUseAdapter instance
     *
     * @param options Configuration options for the adapter
     */
    constructor(options = {}) {
        super({
            ...options,
            type: 'browser-use'
        });
        this.options = options;
    }
    /**
     * Connects the adapter to a Browser-Use browser instance
     *
     * @param browser The Browser-Use browser instance
     */
    async connect(browser) {
        this.browser = browser;
        await super.connect(browser);
    }
    /**
     * Captures the current browser state
     *
     * @returns The captured browser session state
     */
    async captureState() {
        if (!this.browser) {
            throw new Error('Not connected to a browser');
        }
        // Get current URL and extract origin
        const url = await this.browser.getCurrentUrl();
        const origin = new URL(url).origin;
        // Get page details
        const title = await this.browser.getTitle();
        // Capture cookies
        const cookies = await this.browser.getCookies();
        // Capture storage (localStorage and sessionStorage)
        const storage = await this.browser.evaluate(`(() => {
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
    })()`);
        // Capture viewport state if requested
        let viewport = undefined;
        if (this.options.browserUseOptions?.captureViewport) {
            viewport = await this.browser.evaluate(`(() => {
        return {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio
        };
      })()`);
        }
        // Run custom capture script if provided
        let customData = undefined;
        if (this.options.browserUseOptions?.customCaptureScript) {
            customData = await this.browser.evaluate(this.options.browserUseOptions.customCaptureScript);
        }
        // Construct the session state
        return {
            version: '1.0.0',
            timestamp: Date.now(),
            origin,
            storage: {
                cookies: this.normalizeCookies(cookies),
                localStorage: this.mapStorage(storage.localStorage, origin),
                sessionStorage: this.mapStorage(storage.sessionStorage, origin)
            },
            history: {
                currentUrl: url,
                entries: [
                    {
                        url,
                        title,
                        timestamp: Date.now()
                    }
                ],
                currentIndex: 0
            },
            viewport,
            extensions: customData ? { customData } : undefined
        };
    }
    /**
     * Applies a previously captured browser state to the current browser
     *
     * @param state The browser session state to apply
     */
    async applyState(state) {
        if (!this.browser) {
            throw new Error('Not connected to a browser');
        }
        // Navigate to the URL if history is available
        if (state.history?.currentUrl) {
            await this.browser.goto(state.history.currentUrl);
        }
        // Apply cookies
        for (const cookie of state.storage.cookies) {
            await this.browser.setCookie({
                name: cookie.name,
                value: cookie.value,
                domain: cookie.domain || undefined,
                path: cookie.path || '/',
                expires: cookie.expires ? new Date(cookie.expires) : undefined,
                httpOnly: cookie.httpOnly,
                secure: cookie.secure,
                sameSite: cookie.sameSite
            });
        }
        // Get current URL and origin
        const url = await this.browser.getCurrentUrl();
        const origin = new URL(url).origin;
        // Apply localStorage and sessionStorage
        const localStorage = state.storage.localStorage.get(origin);
        const sessionStorage = state.storage.sessionStorage.get(origin);
        await this.browser.evaluate(`((localStorage, sessionStorage) => {
      // Apply localStorage
      window.localStorage.clear();
      for (const [key, value] of Object.entries(localStorage || {})) {
        window.localStorage.setItem(key, value);
      }
      
      // Apply sessionStorage
      window.sessionStorage.clear();
      for (const [key, value] of Object.entries(sessionStorage || {})) {
        window.sessionStorage.setItem(key, value);
      }
    })(${JSON.stringify(Object.fromEntries(localStorage || []))}, ${JSON.stringify(Object.fromEntries(sessionStorage || []))})
    `);
        // Apply viewport if present
        if (state.viewport) {
            await this.browser.evaluate(`((viewport) => {
        if (viewport && viewport.width && viewport.height) {
          window.resizeTo(viewport.width, viewport.height);
        }
      })(${JSON.stringify(state.viewport)})
      `);
        }
        // Refresh to apply the full state
        await this.browser.refresh();
    }
    /**
     * Normalizes cookies to a common format
     *
     * @param cookies The cookies array from Browser-Use
     * @returns Normalized cookies array
     */
    normalizeCookies(cookies) {
        return cookies.map(cookie => ({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path || '/',
            expires: cookie.expires ? new Date(cookie.expires).getTime() : undefined,
            httpOnly: cookie.httpOnly || false,
            secure: cookie.secure || false,
            sameSite: cookie.sameSite || 'Lax'
        }));
    }
    /**
     * Maps storage objects to the PSP storage format
     *
     * @param storageObj The storage object (localStorage or sessionStorage)
     * @param origin The origin for which the storage applies
     * @returns Mapped storage in PSP format
     */
    mapStorage(storageObj, origin) {
        const map = new Map();
        map.set(origin, new Map(Object.entries(storageObj || {})));
        return map;
    }
}
exports.BrowserUseAdapter = BrowserUseAdapter;
