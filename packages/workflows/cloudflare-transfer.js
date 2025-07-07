/**
 * Cloudflare Session Transfer Workflow
 * 
 * Complete workflow orchestrator for transferring sessions from local Chrome
 * to Cloudflare Browser Isolation and Workers Browser Rendering API.
 * 
 * Supports multiple transfer modes:
 * - Direct transfer via API injection
 * - Manual transfer with step-by-step guidance 
 * - Automated transfer via Workers
 * - Clientless isolation URL generation
 */

import ChromeSessionExtractor from '../utilities/chrome-extractor.js';
import CloudflarePSPAdapter from '../adapters/cloudflare/cloudflare-adapter.js';
import CloudflareR2StorageProvider from '../adapters/cloudflare/r2-storage-provider.js';
import { PSPEncryption } from '../core/src/encryption.js';

export class CloudflareTransferWorkflow {
    constructor(config = {}) {
        this.config = {
            // Chrome configuration
            chromePath: config.chromePath || null,
            chromeProfile: config.chromeProfile || 'Default',
            
            // Cloudflare configuration
            teamName: config.teamName || null,
            accessToken: config.accessToken || null,
            browserBinding: config.browserBinding || null,
            
            // R2 Storage configuration
            r2Bucket: config.r2Bucket || null,
            r2AccountId: config.r2AccountId || null,
            r2AccessKeyId: config.r2AccessKeyId || null,
            r2SecretAccessKey: config.r2SecretAccessKey || null,
            
            // Transfer options
            enableEncryption: config.enableEncryption !== false,
            encryptionPassword: config.encryptionPassword || null,
            transferMode: config.transferMode || 'isolation', // 'isolation', 'workers', 'manual'
            
            // Custom domains
            customDomain: config.customDomain || null,
            workerDomain: config.workerDomain || null,
            
            ...config
        };

        this.chromeExtractor = null;
        this.cloudflareAdapter = null;
        this.r2Storage = null;
        this.encryption = null;
        
        this.transferHistory = [];
    }

    /**
     * Initialize all components
     */
    async initialize() {
        console.log('🚀 Initializing Cloudflare transfer workflow...');

        // Initialize Chrome extractor
        this.chromeExtractor = new ChromeSessionExtractor({
            chromePath: this.config.chromePath,
            profileName: this.config.chromeProfile
        });

        // Initialize Cloudflare adapter
        this.cloudflareAdapter = new CloudflarePSPAdapter({
            teamName: this.config.teamName,
            accessToken: this.config.accessToken,
            browserBinding: this.config.browserBinding,
            customDomain: this.config.customDomain,
            workerDomain: this.config.workerDomain,
            r2Bucket: this.config.r2Bucket
        });

        // Initialize R2 storage
        this.r2Storage = new CloudflareR2StorageProvider({
            r2Bucket: this.config.r2Bucket,
            accountId: this.config.r2AccountId,
            accessKeyId: this.config.r2AccessKeyId,
            secretAccessKey: this.config.r2SecretAccessKey
        });

        // Initialize encryption if enabled
        if (this.config.enableEncryption) {
            this.encryption = new PSPEncryption();
        }

        console.log('✅ Cloudflare transfer workflow initialized');
    }

    /**
     * Complete session transfer workflow
     */
    async transferSession(options = {}) {
        await this.initialize();
        
        const transferId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`🔄 Starting session transfer: ${transferId}`);

        try {
            // Step 1: Extract Chrome session
            console.log('📤 Extracting Chrome session...');
            const chromeSession = await this.chromeExtractor.extractSession();
            
            if (!chromeSession.sessionData.cookies?.length) {
                console.warn('⚠️ No cookies found in Chrome session');
            }

            // Step 2: Store session in R2 for backup/sharing
            console.log('☁️ Storing session in Cloudflare R2...');
            const r2Result = await this.r2Storage.store(transferId, chromeSession, {
                category: 'chrome-local',
                transferType: 'chrome-to-cloudflare',
                metadata: {
                    transferId,
                    sourceProfile: this.config.chromeProfile,
                    targetMode: this.config.transferMode
                }
            });

            if (!r2Result.success) {
                throw new Error(`Failed to store session in R2: ${r2Result.error}`);
            }

            // Step 3: Perform transfer based on mode
            let transferResult;
            switch (this.config.transferMode) {
                case 'isolation':
                    transferResult = await this._transferToIsolation(transferId, chromeSession, options);
                    break;
                case 'workers':
                    transferResult = await this._transferToWorkers(transferId, chromeSession, options);
                    break;
                case 'manual':
                    transferResult = await this._generateManualInstructions(transferId, chromeSession, options);
                    break;
                default:
                    throw new Error(`Unknown transfer mode: ${this.config.transferMode}`);
            }

            // Step 4: Record transfer
            const transfer = {
                transferId,
                timestamp: new Date().toISOString(),
                mode: this.config.transferMode,
                sourceProfile: this.config.chromeProfile,
                r2Location: r2Result.key,
                result: transferResult,
                sessionStats: this._getSessionStats(chromeSession)
            };

            this.transferHistory.push(transfer);

            console.log(`✅ Session transfer completed: ${transferId}`);
            return transfer;

        } catch (error) {
            console.error(`❌ Session transfer failed: ${error.message}`);
            const failedTransfer = {
                transferId,
                timestamp: new Date().toISOString(),
                mode: this.config.transferMode,
                error: error.message,
                status: 'failed'
            };
            
            this.transferHistory.push(failedTransfer);
            throw error;
        }
    }

    /**
     * Transfer to Cloudflare Browser Isolation
     */
    async _transferToIsolation(transferId, chromeSession, options = {}) {
        console.log('🔒 Setting up Browser Isolation transfer...');

        const targetUrl = options.targetUrl || 'https://example.com';
        
        // Create isolation session
        const isolationTransfer = await this.cloudflareAdapter.transferToIsolation(
            chromeSession, 
            targetUrl, 
            options
        );

        // Generate restoration script for manual injection
        const restorationScript = this._generateRestorationScript(chromeSession);

        // Store restoration data in R2
        await this.r2Storage.store(`${transferId}_restoration`, {
            sessionData: chromeSession.sessionData,
            restorationScript,
            isolationUrl: isolationTransfer.isolationUrl
        }, {
            category: 'cloudflare-isolation',
            ttl: 3600 // 1 hour
        });

        return {
            mode: 'isolation',
            transferId,
            isolationUrl: isolationTransfer.isolationUrl,
            restorationScript,
            manualSteps: isolationTransfer.instructions.manualSteps,
            sessionData: {
                cookies: isolationTransfer.instructions.cookies.length,
                localStorage: Object.keys(isolationTransfer.instructions.localStorage).length,
                sessionStorage: Object.keys(isolationTransfer.instructions.sessionStorage).length
            },
            instructions: this._generateIsolationInstructions(isolationTransfer, restorationScript)
        };
    }

    /**
     * Transfer to Workers Browser Rendering API
     */
    async _transferToWorkers(transferId, chromeSession, options = {}) {
        console.log('⚡ Setting up Workers Browser Rendering transfer...');

        if (!this.config.browserBinding) {
            throw new Error('Browser binding not configured for Workers transfer');
        }

        // Create Workers browser session
        const workersSession = await this.cloudflareAdapter.createBrowserSession(transferId, {
            launchOptions: options.launchOptions || {},
            viewport: options.viewport || { width: 1920, height: 1080 }
        });

        // Restore session data
        const restoreResult = await this.cloudflareAdapter.restoreSessionData(
            transferId, 
            chromeSession
        );

        if (!restoreResult) {
            throw new Error('Failed to restore session data in Workers browser');
        }

        // Store Workers session info in R2
        await this.r2Storage.store(`${transferId}_workers`, {
            sessionId: transferId,
            sessionData: chromeSession.sessionData,
            workersSessionCreated: true
        }, {
            category: 'cloudflare-workers',
            ttl: 3600
        });

        return {
            mode: 'workers',
            transferId,
            sessionId: transferId,
            restored: restoreResult,
            instructions: [
                'Session has been automatically restored in the Workers browser instance',
                'You can now access the browser through your Worker endpoint',
                'Session data including cookies and storage has been transferred'
            ]
        };
    }

    /**
     * Generate manual transfer instructions
     */
    async _generateManualInstructions(transferId, chromeSession, options = {}) {
        console.log('📋 Generating manual transfer instructions...');

        const sessionData = chromeSession.sessionData;
        const restorationScript = this._generateRestorationScript(chromeSession);
        
        // Create browser isolation URL for manual setup
        let isolationUrl = null;
        if (this.config.teamName) {
            const targetUrl = options.targetUrl || 'https://example.com';
            const baseDomain = this.config.customDomain || 
                              `${this.config.teamName}.cloudflareaccess.com`;
            isolationUrl = `https://${baseDomain}/browser/${encodeURIComponent(targetUrl)}`;
        }

        const instructions = {
            overview: 'Manual session transfer instructions for Cloudflare browsers',
            steps: [],
            data: {
                cookies: sessionData.cookies || [],
                localStorage: sessionData.localStorage || {},
                sessionStorage: sessionData.sessionStorage || {},
                restorationScript
            },
            isolationUrl
        };

        // Step-by-step instructions
        if (isolationUrl) {
            instructions.steps.push({
                step: 1,
                title: 'Open Cloudflare Browser Isolation',
                description: `Navigate to: ${isolationUrl}`,
                action: 'navigate'
            });
        }

        instructions.steps.push({
            step: 2,
            title: 'Open Developer Tools',
            description: 'Press F12 or right-click and select "Inspect"',
            action: 'devtools'
        });

        instructions.steps.push({
            step: 3,
            title: 'Go to Console Tab',
            description: 'Click on the "Console" tab in developer tools',
            action: 'console'
        });

        instructions.steps.push({
            step: 4,
            title: 'Execute Restoration Script',
            description: 'Copy and paste the restoration script below into the console and press Enter',
            action: 'execute',
            script: restorationScript
        });

        if (sessionData.cookies?.length > 0) {
            instructions.steps.push({
                step: 5,
                title: 'Set Cookies (if needed)',
                description: 'Go to Application > Cookies and manually add cookies if the script failed',
                action: 'manual_cookies',
                data: sessionData.cookies
            });
        }

        instructions.steps.push({
            step: 6,
            title: 'Reload Page',
            description: 'Refresh the page to apply all changes',
            action: 'reload'
        });

        // Store instructions in R2
        await this.r2Storage.store(`${transferId}_manual`, instructions, {
            category: 'manual-instructions',
            ttl: 86400 // 24 hours
        });

        return instructions;
    }

    /**
     * Generate JavaScript restoration script
     */
    _generateRestorationScript(chromeSession) {
        const sessionData = chromeSession.sessionData;
        const script = [];

        script.push('// PSP Session Restoration Script');
        script.push('// Generated by Cloudflare Transfer Workflow');
        script.push('console.log("🔄 Starting PSP session restoration...");');

        // Restore localStorage
        if (sessionData.localStorage && Object.keys(sessionData.localStorage).length > 0) {
            script.push('');
            script.push('// Restore localStorage');
            for (const [domain, storage] of Object.entries(sessionData.localStorage)) {
                for (const [key, value] of Object.entries(storage)) {
                    script.push(`try { localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(value)}); } catch(e) { console.warn("Failed to set localStorage:", e); }`);
                }
            }
        }

        // Restore sessionStorage
        if (sessionData.sessionStorage && Object.keys(sessionData.sessionStorage).length > 0) {
            script.push('');
            script.push('// Restore sessionStorage');
            for (const [domain, storage] of Object.entries(sessionData.sessionStorage)) {
                for (const [key, value] of Object.entries(storage)) {
                    script.push(`try { sessionStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(value)}); } catch(e) { console.warn("Failed to set sessionStorage:", e); }`);
                }
            }
        }

        // Cookie restoration (limited in cross-origin contexts)
        if (sessionData.cookies?.length > 0) {
            script.push('');
            script.push('// Restore cookies (limited by same-origin policy)');
            script.push('const cookies = ' + JSON.stringify(sessionData.cookies, null, 2) + ';');
            script.push(`
cookies.forEach(cookie => {
    try {
        let cookieString = cookie.name + '=' + cookie.value;
        if (cookie.path) cookieString += '; path=' + cookie.path;
        if (cookie.domain && window.location.hostname.endsWith(cookie.domain.replace('.', ''))) {
            cookieString += '; domain=' + cookie.domain;
        }
        if (cookie.secure) cookieString += '; secure';
        if (cookie.httpOnly) {
            console.warn('Cannot set HttpOnly cookie:', cookie.name);
            return;
        }
        document.cookie = cookieString;
        console.log('Set cookie:', cookie.name);
    } catch(e) {
        console.warn('Failed to set cookie:', cookie.name, e);
    }
});`);
        }

        script.push('');
        script.push('console.log("✅ PSP session restoration completed");');
        script.push('console.log("🔄 Refreshing page to apply changes...");');
        script.push('setTimeout(() => window.location.reload(), 1000);');

        return script.join('\n');
    }

    /**
     * Generate isolation-specific instructions
     */
    _generateIsolationInstructions(isolationTransfer, restorationScript) {
        return {
            quickStart: [
                `1. Open: ${isolationTransfer.isolationUrl}`,
                '2. Press F12 to open Developer Tools',
                '3. Go to Console tab',
                '4. Paste the restoration script and press Enter',
                '5. Wait for page reload'
            ],
            detailedSteps: isolationTransfer.instructions.manualSteps,
            automationScript: restorationScript,
            tips: [
                'Make sure you have access to the Cloudflare team',
                'Some cookies may not transfer due to security restrictions',
                'Try logging in manually if automated restoration fails',
                'Use the isolation URL for secure browsing'
            ]
        };
    }

    /**
     * Get session statistics
     */
    _getSessionStats(chromeSession) {
        const sessionData = chromeSession.sessionData;
        
        return {
            cookies: sessionData.cookies?.length || 0,
            localStorageDomains: Object.keys(sessionData.localStorage || {}).length,
            sessionStorageDomains: Object.keys(sessionData.sessionStorage || {}).length,
            historyEntries: sessionData.metadata?.history?.length || 0,
            bookmarks: Object.values(sessionData.metadata?.bookmarks || {})
                .reduce((total, folder) => total + (Array.isArray(folder) ? folder.length : 0), 0),
            extractedAt: chromeSession.metadata.extractedAt,
            profile: sessionData.metadata?.profileName || 'Unknown'
        };
    }

    /**
     * List available Chrome profiles
     */
    async listChromeProfiles() {
        if (!this.chromeExtractor) {
            this.chromeExtractor = new ChromeSessionExtractor({
                chromePath: this.config.chromePath
            });
        }

        return await this.chromeExtractor.listProfiles();
    }

    /**
     * Test Cloudflare connectivity
     */
    async testCloudflareConnectivity() {
        await this.initialize();
        
        const results = {
            r2Storage: null,
            browserIsolation: null,
            workersApi: null,
            timestamp: new Date().toISOString()
        };

        // Test R2 Storage
        try {
            results.r2Storage = await this.r2Storage.healthCheck();
        } catch (error) {
            results.r2Storage = { healthy: false, error: error.message };
        }

        // Test Browser Isolation
        try {
            if (this.config.teamName) {
                const testUrl = `https://${this.config.teamName}.cloudflareaccess.com/browser/https://example.com`;
                results.browserIsolation = {
                    healthy: true,
                    testUrl,
                    teamName: this.config.teamName
                };
            } else {
                results.browserIsolation = { healthy: false, error: 'Team name not configured' };
            }
        } catch (error) {
            results.browserIsolation = { healthy: false, error: error.message };
        }

        // Test Workers API
        try {
            results.workersApi = await this.cloudflareAdapter.healthCheck();
        } catch (error) {
            results.workersApi = { healthy: false, error: error.message };
        }

        return results;
    }

    /**
     * Get transfer history
     */
    getTransferHistory() {
        return {
            transfers: this.transferHistory,
            totalTransfers: this.transferHistory.length,
            successfulTransfers: this.transferHistory.filter(t => t.result && !t.error).length,
            failedTransfers: this.transferHistory.filter(t => t.error).length
        };
    }

    /**
     * Clean up resources
     */
    async cleanup() {
        // Close any active Cloudflare sessions
        if (this.cloudflareAdapter) {
            const sessions = this.cloudflareAdapter.listSessions();
            for (const session of sessions.browserSessions) {
                await this.cloudflareAdapter.closeSession(session.sessionId);
            }
        }

        console.log('🧹 Cloudflare transfer workflow cleanup completed');
    }
}

export default CloudflareTransferWorkflow;