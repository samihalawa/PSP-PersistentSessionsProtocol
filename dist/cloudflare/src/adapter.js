"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudflareAdapter = void 0;
const core_1 = require("@psp/core");
/**
 * Adapter implementation for Cloudflare Browser Rendering
 */
class CloudflareAdapter extends core_1.Adapter {
    /**
     * Creates a new CloudflareAdapter instance
     *
     * @param options Configuration options for the adapter
     */
    constructor(options = {}) {
        // If Cloudflare KV storage is specified, create a KV storage provider
        let storageProvider = options.storageProvider;
        // Initialize the adapter with the specified options
        super({
            ...options,
            type: 'cloudflare',
            storageProvider: storageProvider ? undefined : options.storageProvider
        });
        // If Cloudflare KV storage is specified, create a custom storage provider
        if (storageProvider && storageProvider.type === 'cloudflare-kv') {
            this.setStorageProvider(new CloudflareKVStorageProvider(storageProvider.namespace, storageProvider.keyPrefix));
        }
        this.options = options;
    }
    /**
     * Connects the adapter to a Cloudflare browser renderer instance
     *
     * @param renderer The Cloudflare browser renderer instance
     */
    async connect(renderer) {
        this.renderer = renderer;
        await super.connect(renderer);
    }
    /**
     * Captures the current browser state
     *
     * @returns The captured browser session state
     */
    async captureState() {
        if (!this.renderer) {
            throw new Error('Not connected to a browser renderer');
        }
        // Get current URL and extract origin
        const url = await this.renderer.evaluate('window.location.href');
        const origin = new URL(url).origin;
        // Get page title
        const title = await this.renderer.evaluate('document.title');
        // Capture cookies
        const cookies = await this.renderer.cookies();
        // Capture storage (localStorage and sessionStorage)
        const storage = await this.renderer.evaluate(`
      (() => {
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
      })()
    `);
        // Capture a screenshot for verification
        let screenshot = null;
        try {
            screenshot = await this.renderer.screenshot();
        }
        catch (error) {
            // Screenshot capture is optional
            console.warn('Failed to capture screenshot:', error);
        }
        // Build the extensions object
        const extensions = {};
        if (screenshot) {
            extensions.screenshot = {
                data: screenshot,
                mimeType: 'image/png',
                timestamp: Date.now()
            };
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
            extensions: Object.keys(extensions).length > 0 ? extensions : undefined
        };
    }
    /**
     * Applies a previously captured browser state to the current renderer
     *
     * @param state The browser session state to apply
     */
    async applyState(state) {
        if (!this.renderer) {
            throw new Error('Not connected to a browser renderer');
        }
        // Navigate to the URL if history is available
        if (state.history?.currentUrl) {
            await this.renderer.goto(state.history.currentUrl);
        }
        // Apply cookies
        for (const cookie of state.storage.cookies) {
            await this.renderer.setCookie({
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
        const url = await this.renderer.evaluate('window.location.href');
        const origin = new URL(url).origin;
        // Apply localStorage and sessionStorage
        const localStorage = state.storage.localStorage.get(origin);
        const sessionStorage = state.storage.sessionStorage.get(origin);
        await this.renderer.evaluate(`
      ((localStorage, sessionStorage) => {
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
        // Refresh the page to apply all state
        await this.renderer.goto(url);
    }
    /**
     * Normalizes cookies to a common format
     *
     * @param cookies The cookies array from Cloudflare
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
exports.CloudflareAdapter = CloudflareAdapter;
/**
 * Storage provider implementation for Cloudflare KV
 */
class CloudflareKVStorageProvider {
    /**
     * Creates a new CloudflareKVStorageProvider
     *
     * @param namespace Cloudflare KV namespace to use
     * @param keyPrefix Optional prefix for keys in the KV namespace
     */
    constructor(namespace, keyPrefix = 'psp_session_') {
        this.namespace = namespace;
        this.keyPrefix = keyPrefix;
    }
    /**
     * Save a session to Cloudflare KV
     *
     * @param session The session to save
     */
    async save(session) {
        const key = this.keyPrefix + session.metadata.id;
        // We need to convert Maps to objects for storage
        const serializedSession = {
            metadata: session.metadata,
            state: this.serializeState(session.state)
        };
        await this.namespace.put(key, JSON.stringify(serializedSession), {
            expirationTtl: this.getExpirationSeconds(session.metadata.expireAt)
        });
        // Store session metadata separately for listing
        const metadataKey = this.keyPrefix + 'meta_' + session.metadata.id;
        await this.namespace.put(metadataKey, JSON.stringify(session.metadata), {
            expirationTtl: this.getExpirationSeconds(session.metadata.expireAt)
        });
    }
    /**
     * Load a session from Cloudflare KV
     *
     * @param id The session ID to load
     * @returns The loaded session
     */
    async load(id) {
        const key = this.keyPrefix + id;
        const serializedSession = await this.namespace.get(key, 'json');
        if (!serializedSession) {
            throw new Error(`Session not found: ${id}`);
        }
        return {
            metadata: serializedSession.metadata,
            state: this.deserializeState(serializedSession.state)
        };
    }
    /**
     * Delete a session from Cloudflare KV
     *
     * @param id The session ID to delete
     */
    async delete(id) {
        const key = this.keyPrefix + id;
        const metadataKey = this.keyPrefix + 'meta_' + id;
        await Promise.all([
            this.namespace.delete(key),
            this.namespace.delete(metadataKey)
        ]);
    }
    /**
     * List sessions in Cloudflare KV
     *
     * @param filter Optional filter for listing sessions
     * @returns List of session metadata
     */
    async list(filter) {
        const prefix = this.keyPrefix + 'meta_';
        const { keys } = await this.namespace.list({ prefix });
        if (!keys.length) {
            return [];
        }
        // Fetch metadata for all keys in parallel
        const metadataPromises = keys.map(key => this.namespace.get(key.name, 'json'));
        let metadata = (await Promise.all(metadataPromises)).filter(Boolean);
        // Apply filters if present
        if (filter) {
            if (filter.name) {
                metadata = metadata.filter(m => m.name.toLowerCase().includes(filter.name.toLowerCase()));
            }
            if (filter.tags && filter.tags.length > 0) {
                metadata = metadata.filter(m => filter.tags.every((tag) => m.tags?.includes(tag)));
            }
            // Sort by updated time (newest first)
            metadata.sort((a, b) => b.updatedAt - a.updatedAt);
            // Apply offset and limit
            if (filter.offset || filter.limit) {
                const offset = filter.offset || 0;
                const limit = filter.limit;
                metadata = metadata.slice(offset, limit ? offset + limit : undefined);
            }
        }
        return metadata;
    }
    /**
     * Check if a session exists in Cloudflare KV
     *
     * @param id The session ID to check
     * @returns Whether the session exists
     */
    async exists(id) {
        const key = this.keyPrefix + id;
        const value = await this.namespace.get(key);
        return value !== null;
    }
    /**
     * Calculate expiration time in seconds from expiration timestamp
     *
     * @param expireAt Expiration timestamp
     * @returns Expiration time in seconds
     */
    getExpirationSeconds(expireAt) {
        if (!expireAt) {
            return undefined;
        }
        const now = Date.now();
        const expiresInMs = expireAt - now;
        return expiresInMs > 0 ? Math.ceil(expiresInMs / 1000) : undefined;
    }
    /**
     * Serialize state for storage
     *
     * @param state The state to serialize
     * @returns Serialized state
     */
    serializeState(state) {
        const serialized = { ...state };
        // Convert Maps to objects
        if (state.storage?.localStorage instanceof Map) {
            serialized.storage = { ...serialized.storage };
            const localStorage = {};
            for (const [origin, storage] of state.storage.localStorage.entries()) {
                localStorage[origin] = Object.fromEntries(storage);
            }
            serialized.storage.localStorage = localStorage;
        }
        if (state.storage?.sessionStorage instanceof Map) {
            serialized.storage = { ...serialized.storage };
            const sessionStorage = {};
            for (const [origin, storage] of state.storage.sessionStorage.entries()) {
                sessionStorage[origin] = Object.fromEntries(storage);
            }
            serialized.storage.sessionStorage = sessionStorage;
        }
        return serialized;
    }
    /**
     * Deserialize state from storage
     *
     * @param state The state to deserialize
     * @returns Deserialized state
     */
    deserializeState(state) {
        const deserialized = { ...state };
        // Convert objects back to Maps
        if (state.storage?.localStorage && typeof state.storage.localStorage === 'object') {
            deserialized.storage = { ...deserialized.storage };
            const localStorage = new Map();
            for (const [origin, storage] of Object.entries(state.storage.localStorage)) {
                localStorage.set(origin, new Map(Object.entries(storage)));
            }
            deserialized.storage.localStorage = localStorage;
        }
        if (state.storage?.sessionStorage && typeof state.storage.sessionStorage === 'object') {
            deserialized.storage = { ...deserialized.storage };
            const sessionStorage = new Map();
            for (const [origin, storage] of Object.entries(state.storage.sessionStorage)) {
                sessionStorage.set(origin, new Map(Object.entries(storage)));
            }
            deserialized.storage.sessionStorage = sessionStorage;
        }
        return deserialized;
    }
}
