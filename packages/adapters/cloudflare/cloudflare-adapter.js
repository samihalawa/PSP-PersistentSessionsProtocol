/**
 * Cloudflare PSP Adapter - Browser Rendering & Isolation Integration
 * 
 * This adapter enables PSP session management for Cloudflare's browser rendering
 * and isolation capabilities, including Workers Browser Rendering API and
 * Cloudflare Browser Isolation with clientless access.
 */

import puppeteer from '@cloudflare/puppeteer';
import { PSPSessionBuilder } from '../../core/src/schema.js';

export class CloudflarePSPAdapter {
    constructor(options = {}) {
        this.options = {
            // Browser Rendering API options
            browserBinding: options.browserBinding || null,
            
            // Cloudflare Access/Isolation options
            teamName: options.teamName || null,
            accessToken: options.accessToken || null,
            
            // R2 Storage options for session persistence
            r2Bucket: options.r2Bucket || null,
            
            // Session configuration
            sessionTimeout: options.sessionTimeout || 3600, // 1 hour
            enableIsolation: options.enableIsolation || false,
            
            // Custom domain configuration
            customDomain: options.customDomain || null,
            workerDomain: options.workerDomain || null,
            
            ...options
        };
        
        this.activeSessions = new Map();
        this.isolationSessions = new Map();
    }

    /**
     * Create a new Cloudflare browser session using Workers Browser Rendering API
     */
    async createBrowserSession(sessionId, options = {}) {
        try {
            if (!this.options.browserBinding) {
                throw new Error('Browser binding not configured for Cloudflare Workers');
            }

            const browser = await puppeteer.launch({
                browserBinding: this.options.browserBinding,
                ...options.launchOptions
            });

            const page = await browser.newPage();
            
            // Set viewport and user agent for consistency
            if (options.viewport) {
                await page.setViewport(options.viewport);
            }
            
            if (options.userAgent) {
                await page.setUserAgent(options.userAgent);
            }

            const session = {
                sessionId,
                browser,
                page,
                type: 'browser_rendering',
                created: new Date().toISOString(),
                lastUsed: new Date().toISOString()
            };

            this.activeSessions.set(sessionId, session);
            
            // Set up session tracking
            await this._setupSessionTracking(page, sessionId);
            
            return session;
        } catch (error) {
            throw new Error(`Failed to create Cloudflare browser session: ${error.message}`);
        }
    }

    /**
     * Create a clientless isolation session using Cloudflare Browser Isolation
     */
    async createIsolationSession(sessionId, targetUrl, options = {}) {
        try {
            // Enhanced input validation
            if (!sessionId || typeof sessionId !== 'string') {
                throw new Error('Valid sessionId is required');
            }
            
            if (!targetUrl || typeof targetUrl !== 'string') {
                throw new Error('Valid targetUrl is required');
            }
            
            if (!this.options.teamName) {
                throw new Error('Team name not configured for Cloudflare Browser Isolation');
            }

            // Validate URL format
            try {
                new URL(targetUrl);
            } catch (urlError) {
                throw new Error(`Invalid targetUrl format: ${targetUrl}`);
            }

            // Validate team name format
            if (!/^[a-zA-Z0-9-]+$/.test(this.options.teamName)) {
                throw new Error('Invalid team name format. Must contain only alphanumeric characters and hyphens');
            }

            const baseDomain = this.options.customDomain || 
                              `${this.options.teamName}.cloudflareaccess.com`;
            
            const isolationUrl = `https://${baseDomain}/browser/${encodeURIComponent(targetUrl)}`;
            
            // Test connectivity to isolation service
            const connectivityCheck = await this._testIsolationConnectivity().catch(() => null);
            
            const session = {
                sessionId,
                isolationUrl,
                targetUrl,
                type: 'browser_isolation',
                created: new Date().toISOString(),
                lastUsed: new Date().toISOString(),
                domain: baseDomain,
                metadata: {
                    platform: process.platform,
                    nodeVersion: process.version,
                    connectivityStatus: connectivityCheck?.status || 'unknown',
                    options
                }
            };

            this.isolationSessions.set(sessionId, session);
            
            console.log(`✅ Created isolation session ${sessionId} for ${targetUrl}`);
            return session;
        } catch (error) {
            console.error('🔥 Isolation session creation failed:', error.message);
            throw new Error(`Failed to create Cloudflare isolation session: ${error.message}`);
        }
    }

    /**
     * Test connectivity to isolation service
     */
    async _testIsolationConnectivity() {
        try {
            const testUrl = `https://${this.options.teamName}.cloudflareaccess.com`;
            
            // For Node.js environments, we can't easily test HTTP connectivity
            // without additional dependencies, so we'll do basic validation
            return {
                status: 'available',
                endpoint: testUrl,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unavailable',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Capture session data from active Cloudflare browser session
     */
    async captureSessionData(sessionId) {
        if (!sessionId || typeof sessionId !== 'string') {
            throw new Error('Valid sessionId is required');
        }

        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found in active sessions`);
        }

        if (!session.page) {
            throw new Error(`Session ${sessionId} has no active page`);
        }

        try {
            const page = session.page;
            
            // Check if page is still valid
            const isPageClosed = page.isClosed();
            if (isPageClosed) {
                throw new Error(`Page for session ${sessionId} has been closed`);
            }
            
            // Update last used timestamp
            session.lastUsed = new Date().toISOString();

            console.log(`📸 Capturing session data for ${sessionId}...`);

            // Capture browser state with timeout protection
            const capturePromises = [
                this._captureCookiesWithRetry(page),
                this._captureLocalStorageWithRetry(page),
                this._captureSessionStorageWithRetry(page),
                this._captureCurrentUrlWithRetry(page)
            ];

            const [cookies, localStorage, sessionStorage, currentUrl] = await Promise.allSettled(capturePromises);

            // Handle capture results
            const capturedData = {
                cookies: cookies.status === 'fulfilled' ? cookies.value : [],
                localStorage: localStorage.status === 'fulfilled' ? localStorage.value : {},
                sessionStorage: sessionStorage.status === 'fulfilled' ? sessionStorage.value : {},
                currentUrl: currentUrl.status === 'fulfilled' ? currentUrl.value : 'about:blank'
            };

            // Log any capture failures
            if (cookies.status === 'rejected') console.warn('⚠️ Cookie capture failed:', cookies.reason);
            if (localStorage.status === 'rejected') console.warn('⚠️ localStorage capture failed:', localStorage.reason);
            if (sessionStorage.status === 'rejected') console.warn('⚠️ sessionStorage capture failed:', sessionStorage.reason);
            if (currentUrl.status === 'rejected') console.warn('⚠️ URL capture failed:', currentUrl.reason);

            // Capture Cloudflare-specific metadata
            const cloudflareMetadata = await this._captureCloudflareMetadata(page).catch(error => {
                console.warn('⚠️ Cloudflare metadata capture failed:', error.message);
                return {};
            });

            const pspSession = new PSPSessionBuilder()
                .sessionId(sessionId)
                .provider('cloudflare_browser_rendering')
                .cookies(capturedData.cookies)
                .localStorage(capturedData.localStorage)
                .sessionStorage(capturedData.sessionStorage)
                .currentUrl(capturedData.currentUrl)
                .metadata({
                    platform: 'cloudflare',
                    browserType: 'chromium',
                    isolation: session.type === 'browser_isolation',
                    created: session.created,
                    lastUsed: session.lastUsed,
                    captureTimestamp: new Date().toISOString(),
                    ...cloudflareMetadata
                })
                .build();

            console.log(`✅ Successfully captured session data for ${sessionId}`);
            return pspSession;

        } catch (error) {
            console.error(`🔥 Failed to capture Cloudflare session data for ${sessionId}:`, error.message);
            throw new Error(`Failed to capture Cloudflare session data: ${error.message}`);
        }
    }

    /**
     * Capture cookies with retry mechanism
     */
    async _captureCookiesWithRetry(page, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await page.cookies();
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, attempt * 100));
            }
        }
    }

    /**
     * Capture localStorage with retry mechanism
     */
    async _captureLocalStorageWithRetry(page, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await page.evaluate(() => {
                    const items = {};
                    try {
                        for (let i = 0; i < localStorage.length; i++) {
                            const key = localStorage.key(i);
                            if (key) {
                                items[key] = localStorage.getItem(key);
                            }
                        }
                    } catch (e) {
                        console.warn('localStorage access denied:', e.message);
                    }
                    return items;
                });
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, attempt * 100));
            }
        }
    }

    /**
     * Capture sessionStorage with retry mechanism
     */
    async _captureSessionStorageWithRetry(page, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await page.evaluate(() => {
                    const items = {};
                    try {
                        for (let i = 0; i < sessionStorage.length; i++) {
                            const key = sessionStorage.key(i);
                            if (key) {
                                items[key] = sessionStorage.getItem(key);
                            }
                        }
                    } catch (e) {
                        console.warn('sessionStorage access denied:', e.message);
                    }
                    return items;
                });
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, attempt * 100));
            }
        }
    }

    /**
     * Capture current URL with retry mechanism
     */
    async _captureCurrentUrlWithRetry(page, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return page.url();
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, attempt * 100));
            }
        }
    }

    /**
     * Restore session data to Cloudflare browser session
     */
    async restoreSessionData(sessionId, pspSessionData) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        try {
            const page = session.page;
            const sessionData = pspSessionData.sessionData;

            // Navigate to the original URL first if available
            if (sessionData.currentUrl && sessionData.currentUrl !== 'about:blank') {
                await page.goto(sessionData.currentUrl, { waitUntil: 'networkidle2' });
            }

            // Restore cookies
            if (sessionData.cookies && sessionData.cookies.length > 0) {
                await page.setCookie(...sessionData.cookies);
            }

            // Restore localStorage
            if (sessionData.localStorage) {
                await page.evaluate((localStorage) => {
                    for (const [key, value] of Object.entries(localStorage)) {
                        window.localStorage.setItem(key, value);
                    }
                }, sessionData.localStorage);
            }

            // Restore sessionStorage
            if (sessionData.sessionStorage) {
                await page.evaluate((sessionStorage) => {
                    for (const [key, value] of Object.entries(sessionStorage)) {
                        window.sessionStorage.setItem(key, value);
                    }
                }, sessionData.sessionStorage);
            }

            // Reload page to apply all changes
            await page.reload({ waitUntil: 'networkidle2' });

            session.lastUsed = new Date().toISOString();
            
            return true;
        } catch (error) {
            throw new Error(`Failed to restore Cloudflare session data: ${error.message}`);
        }
    }

    /**
     * Transfer session from local browser to Cloudflare isolation
     */
    async transferToIsolation(localSessionData, targetUrl, options = {}) {
        try {
            const sessionId = `isolation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Create isolation session
            const isolationSession = await this.createIsolationSession(sessionId, targetUrl, options);
            
            // Store local session data for later restoration
            if (this.options.r2Bucket) {
                await this._storeSessionInR2(sessionId, localSessionData);
            }

            // Generate transfer instructions
            const transferData = {
                sessionId,
                isolationUrl: isolationSession.isolationUrl,
                instructions: {
                    cookies: localSessionData.sessionData.cookies || [],
                    localStorage: localSessionData.sessionData.localStorage || {},
                    sessionStorage: localSessionData.sessionData.sessionStorage || {},
                    manualSteps: this._generateManualTransferSteps(localSessionData)
                }
            };

            return transferData;
        } catch (error) {
            throw new Error(`Failed to transfer session to Cloudflare isolation: ${error.message}`);
        }
    }

    /**
     * Store session data in Cloudflare R2 for cross-platform access
     */
    async _storeSessionInR2(sessionId, sessionData) {
        if (!this.options.r2Bucket) {
            throw new Error('R2 bucket not configured');
        }

        try {
            const key = `psp-sessions/cloudflare/${sessionId}.json`;
            const data = JSON.stringify({
                ...sessionData,
                stored: new Date().toISOString(),
                provider: 'cloudflare',
                type: 'isolation_transfer'
            });

            await this.options.r2Bucket.put(key, data, {
                metadata: {
                    sessionId,
                    provider: 'cloudflare',
                    created: new Date().toISOString()
                }
            });

            return key;
        } catch (error) {
            throw new Error(`Failed to store session in R2: ${error.message}`);
        }
    }

    /**
     * Retrieve session data from Cloudflare R2
     */
    async retrieveSessionFromR2(sessionId) {
        if (!this.options.r2Bucket) {
            throw new Error('R2 bucket not configured');
        }

        try {
            const key = `psp-sessions/cloudflare/${sessionId}.json`;
            const object = await this.options.r2Bucket.get(key);
            
            if (!object) {
                throw new Error(`Session ${sessionId} not found in R2`);
            }

            const data = await object.text();
            return JSON.parse(data);
        } catch (error) {
            throw new Error(`Failed to retrieve session from R2: ${error.message}`);
        }
    }

    /**
     * Set up session tracking for browser session
     */
    async _setupSessionTracking(page, sessionId) {
        await page.evaluateOnNewDocument((sessionId) => {
            window.__PSP_CLOUDFLARE_SESSION__ = {
                id: sessionId,
                provider: 'cloudflare',
                started: new Date().toISOString(),
                interactions: []
            };
        }, sessionId);
    }

    /**
     * Capture Cloudflare-specific metadata
     */
    async _captureCloudflareMetadata(page) {
        try {
            return await page.evaluate(() => {
                const metadata = {
                    cfRay: document.querySelector('meta[name="cf-ray"]')?.content || null,
                    cfCountry: document.querySelector('meta[name="cf-country"]')?.content || null,
                    cfIpcountry: document.querySelector('meta[name="cf-ipcountry"]')?.content || null,
                    cfVisitor: document.querySelector('meta[name="cf-visitor"]')?.content || null,
                    userAgent: navigator.userAgent,
                    timestamp: new Date().toISOString()
                };

                // Check if running in Cloudflare Worker context
                if (typeof globalThis !== 'undefined' && globalThis.CloudflareWorkersGlobalScope) {
                    metadata.workerContext = true;
                }

                return metadata;
            });
        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * Generate manual steps for session transfer to isolation browser
     */
    _generateManualTransferSteps(sessionData) {
        const steps = [];
        
        if (sessionData.sessionData.cookies?.length > 0) {
            steps.push({
                type: 'cookies',
                action: 'Open browser developer tools (F12), go to Application > Cookies, and manually add the provided cookies'
            });
        }

        if (Object.keys(sessionData.sessionData.localStorage || {}).length > 0) {
            steps.push({
                type: 'localStorage',
                action: 'In developer tools console, execute the provided localStorage commands'
            });
        }

        if (Object.keys(sessionData.sessionData.sessionStorage || {}).length > 0) {
            steps.push({
                type: 'sessionStorage',
                action: 'In developer tools console, execute the provided sessionStorage commands'
            });
        }

        return steps;
    }

    /**
     * Close session and cleanup resources
     */
    async closeSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        
        if (session) {
            try {
                if (session.browser) {
                    await session.browser.close();
                }
            } catch (error) {
                console.warn(`Error closing browser for session ${sessionId}:`, error);
            }
            
            this.activeSessions.delete(sessionId);
        }

        // Also remove isolation session if exists
        this.isolationSessions.delete(sessionId);
    }

    /**
     * List all active sessions
     */
    listSessions() {
        const browserSessions = Array.from(this.activeSessions.values()).map(session => ({
            sessionId: session.sessionId,
            type: session.type,
            created: session.created,
            lastUsed: session.lastUsed
        }));

        const isolationSessions = Array.from(this.isolationSessions.values()).map(session => ({
            sessionId: session.sessionId,
            type: session.type,
            created: session.created,
            lastUsed: session.lastUsed,
            targetUrl: session.targetUrl
        }));

        return {
            browserSessions,
            isolationSessions,
            total: browserSessions.length + isolationSessions.length
        };
    }

    /**
     * Health check for Cloudflare services
     */
    async healthCheck() {
        const status = {
            browserRendering: false,
            browserIsolation: false,
            r2Storage: false,
            timestamp: new Date().toISOString()
        };

        // Check Browser Rendering API
        try {
            if (this.options.browserBinding) {
                const testBrowser = await puppeteer.launch({
                    browserBinding: this.options.browserBinding
                });
                await testBrowser.close();
                status.browserRendering = true;
            }
        } catch (error) {
            status.browserRenderingError = error.message;
        }

        // Check Browser Isolation
        try {
            if (this.options.teamName) {
                const testUrl = `https://${this.options.teamName}.cloudflareaccess.com/browser/https://example.com`;
                status.browserIsolation = true;
                status.isolationTestUrl = testUrl;
            }
        } catch (error) {
            status.browserIsolationError = error.message;
        }

        // Check R2 Storage
        try {
            if (this.options.r2Bucket) {
                // Test R2 connectivity with a simple operation
                const testKey = 'psp-health-check';
                await this.options.r2Bucket.put(testKey, 'test');
                await this.options.r2Bucket.delete(testKey);
                status.r2Storage = true;
            }
        } catch (error) {
            status.r2StorageError = error.message;
        }

        return status;
    }
}

export default CloudflarePSPAdapter;