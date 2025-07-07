/**
 * Cloudflare Integration Tests
 * 
 * Comprehensive testing suite for PSP Cloudflare integration including:
 * - Chrome session extraction accuracy
 * - R2 storage operations 
 * - Cloudflare adapter session management
 * - End-to-end session transfer workflow
 * - Authentication persistence validation
 */

import assert from 'assert';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

// Import PSP components
import ChromeSessionExtractor from '../packages/utilities/chrome-extractor.js';
import CloudflareR2StorageProvider from '../packages/adapters/cloudflare/r2-storage-provider.js';
import CloudflarePSPAdapter from '../packages/adapters/cloudflare/cloudflare-adapter.js';
import CloudflareTransferWorkflow from '../packages/workflows/cloudflare-transfer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_CONFIG = {
    // Mock Cloudflare credentials for testing
    cloudflare: {
        teamName: 'test-team',
        accessToken: 'test-access-token',
        r2Bucket: 'test-psp-sessions',
        r2AccountId: 'test-account-id',
        r2AccessKeyId: 'test-access-key',
        r2SecretAccessKey: 'test-secret-key'
    },
    
    // Test Chrome profile setup
    chrome: {
        testProfilePath: path.join(__dirname, 'fixtures', 'chrome-test-profile'),
        mockDataPath: path.join(__dirname, 'fixtures', 'mock-chrome-data')
    },
    
    // Test session data
    mockSession: {
        sessionId: 'test-session-123',
        cookies: [
            {
                name: 'auth_token',
                value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
                domain: '.example.com',
                path: '/',
                secure: true,
                httpOnly: true
            },
            {
                name: 'user_pref',
                value: 'theme=dark',
                domain: 'app.example.com',
                path: '/',
                secure: false,
                httpOnly: false
            }
        ],
        localStorage: {
            'example.com': {
                'user_settings': '{"theme":"dark","language":"en"}',
                'session_data': '{"user_id":"123","role":"admin"}'
            }
        },
        sessionStorage: {
            'example.com': {
                'temp_data': '{"workflow_step":3}',
                'csrf_token': 'abc123def456'
            }
        }
    }
};

describe('Cloudflare PSP Integration Tests', function() {
    this.timeout(30000); // 30 second timeout for integration tests
    
    let testTempDir;
    
    before(async function() {
        // Create temporary directory for test files
        testTempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'psp-cloudflare-test-'));
        
        // Set up mock Chrome profile structure
        await setupMockChromeProfile();
        
        console.log('🔧 Test setup completed');
    });
    
    after(async function() {
        // Cleanup test files
        await fs.rm(testTempDir, { recursive: true, force: true });
        console.log('🧹 Test cleanup completed');
    });
    
    describe('Chrome Session Extraction', function() {
        let chromeExtractor;
        
        beforeEach(function() {
            chromeExtractor = new ChromeSessionExtractor({
                chromePath: TEST_CONFIG.chrome.mockDataPath,
                profileName: 'Default'
            });
        });
        
        it('should extract cookies from Chrome profile', async function() {
            // Create mock cookie database
            await createMockCookieDatabase();
            
            const session = await chromeExtractor.extractSession();
            
            assert(session.sessionData.cookies, 'Cookies should be extracted');
            assert(Array.isArray(session.sessionData.cookies), 'Cookies should be an array');
            
            // Validate cookie structure
            if (session.sessionData.cookies.length > 0) {
                const cookie = session.sessionData.cookies[0];
                assert(typeof cookie.name === 'string', 'Cookie name should be string');
                assert(typeof cookie.value === 'string', 'Cookie value should be string');
                assert(typeof cookie.domain === 'string', 'Cookie domain should be string');
            }
            
            console.log('✅ Chrome cookies extraction test passed');
        });
        
        it('should extract localStorage data', async function() {
            // Create mock localStorage structure
            await createMockLocalStorage();
            
            const session = await chromeExtractor.extractSession();
            
            assert(session.sessionData.localStorage, 'localStorage should be extracted');
            assert(typeof session.sessionData.localStorage === 'object', 'localStorage should be object');
            
            console.log('✅ Chrome localStorage extraction test passed');
        });
        
        it('should handle missing Chrome profile gracefully', async function() {
            const invalidExtractor = new ChromeSessionExtractor({
                chromePath: '/nonexistent/path',
                profileName: 'NonExistent'
            });
            
            try {
                await invalidExtractor.extractSession();
                assert.fail('Should throw error for missing profile');
            } catch (error) {
                assert(error.message.includes('Chrome profile not found'), 'Should provide meaningful error');
            }
            
            console.log('✅ Chrome missing profile handling test passed');
        });
    });
    
    describe('Cloudflare R2 Storage Provider', function() {
        let r2Storage;
        
        beforeEach(function() {
            r2Storage = new CloudflareR2StorageProvider({
                r2Bucket: TEST_CONFIG.cloudflare.r2Bucket,
                accountId: TEST_CONFIG.cloudflare.r2AccountId,
                accessKeyId: TEST_CONFIG.cloudflare.r2AccessKeyId,
                secretAccessKey: TEST_CONFIG.cloudflare.r2SecretAccessKey
            });
        });
        
        it('should store session data in R2', async function() {
            const mockSessionData = {
                sessionId: TEST_CONFIG.mockSession.sessionId,
                sessionData: TEST_CONFIG.mockSession
            };
            
            // Mock R2 operations for testing
            r2Storage.r2Client = createMockR2Client();
            
            const result = await r2Storage.store(
                TEST_CONFIG.mockSession.sessionId,
                mockSessionData,
                { category: 'test' }
            );
            
            assert(result.success, 'Storage should succeed');
            assert(result.sessionId === TEST_CONFIG.mockSession.sessionId, 'Session ID should match');
            assert(result.key, 'Storage key should be provided');
            
            console.log('✅ R2 storage test passed');
        });
        
        it('should retrieve session data from R2', async function() {
            r2Storage.r2Client = createMockR2Client();
            
            // First store the session
            await r2Storage.store(
                TEST_CONFIG.mockSession.sessionId,
                { sessionData: TEST_CONFIG.mockSession },
                { category: 'test' }
            );
            
            // Then retrieve it
            const result = await r2Storage.retrieve(
                TEST_CONFIG.mockSession.sessionId,
                { category: 'test' }
            );
            
            assert(result.success, 'Retrieval should succeed');
            assert(result.sessionData, 'Session data should be returned');
            
            console.log('✅ R2 retrieval test passed');
        });
        
        it('should handle R2 connection errors gracefully', async function() {
            r2Storage.r2Client = createFailingR2Client();
            
            const result = await r2Storage.store(
                'test-session',
                { sessionData: {} },
                { category: 'test' }
            );
            
            assert(!result.success, 'Should fail gracefully');
            assert(result.error, 'Should provide error message');
            
            console.log('✅ R2 error handling test passed');
        });
    });
    
    describe('Cloudflare PSP Adapter', function() {
        let cloudflareAdapter;
        
        beforeEach(function() {
            cloudflareAdapter = new CloudflarePSPAdapter({
                teamName: TEST_CONFIG.cloudflare.teamName,
                accessToken: TEST_CONFIG.cloudflare.accessToken,
                r2Bucket: createMockR2Bucket()
            });
        });
        
        it('should create isolation session', async function() {
            const sessionId = 'test-isolation-session';
            const targetUrl = 'https://app.example.com';
            
            const session = await cloudflareAdapter.createIsolationSession(
                sessionId,
                targetUrl
            );
            
            assert(session.sessionId === sessionId, 'Session ID should match');
            assert(session.isolationUrl, 'Isolation URL should be generated');
            assert(session.type === 'browser_isolation', 'Type should be browser_isolation');
            assert(session.targetUrl === targetUrl, 'Target URL should match');
            
            console.log('✅ Cloudflare isolation session creation test passed');
        });
        
        it('should transfer session to isolation', async function() {
            const localSessionData = {
                sessionData: TEST_CONFIG.mockSession
            };
            
            const transferResult = await cloudflareAdapter.transferToIsolation(
                localSessionData,
                'https://app.example.com'
            );
            
            assert(transferResult.sessionId, 'Transfer session ID should be provided');
            assert(transferResult.isolationUrl, 'Isolation URL should be provided');
            assert(transferResult.instructions, 'Transfer instructions should be provided');
            assert(transferResult.instructions.cookies, 'Cookie instructions should be provided');
            
            console.log('✅ Cloudflare isolation transfer test passed');
        });
        
        it('should validate health check', async function() {
            const healthStatus = await cloudflareAdapter.healthCheck();
            
            assert(typeof healthStatus === 'object', 'Health status should be object');
            assert(healthStatus.timestamp, 'Timestamp should be provided');
            assert(typeof healthStatus.browserIsolation === 'boolean', 'Browser isolation status should be boolean');
            
            console.log('✅ Cloudflare health check test passed');
        });
    });
    
    describe('End-to-End Session Transfer Workflow', function() {
        let transferWorkflow;
        
        beforeEach(function() {
            transferWorkflow = new CloudflareTransferWorkflow({
                chromePath: TEST_CONFIG.chrome.mockDataPath,
                chromeProfile: 'Default',
                teamName: TEST_CONFIG.cloudflare.teamName,
                r2Bucket: TEST_CONFIG.cloudflare.r2Bucket,
                r2AccountId: TEST_CONFIG.cloudflare.r2AccountId,
                r2AccessKeyId: TEST_CONFIG.cloudflare.r2AccessKeyId,
                r2SecretAccessKey: TEST_CONFIG.cloudflare.r2SecretAccessKey,
                transferMode: 'isolation'
            });
        });
        
        it('should complete isolation mode transfer', async function() {
            // Mock Chrome extractor
            transferWorkflow.chromeExtractor = createMockChromeExtractor();
            
            // Mock R2 storage
            transferWorkflow.r2Storage = createMockR2Storage();
            
            // Mock Cloudflare adapter
            transferWorkflow.cloudflareAdapter = createMockCloudflareAdapter();
            
            const transferResult = await transferWorkflow.transferSession({
                targetUrl: 'https://app.example.com'
            });
            
            assert(transferResult.transferId, 'Transfer ID should be provided');
            assert(transferResult.mode === 'isolation', 'Transfer mode should be isolation');
            assert(transferResult.result, 'Transfer result should be provided');
            assert(transferResult.sessionStats, 'Session statistics should be provided');
            
            console.log('✅ End-to-end isolation transfer test passed');
        });
        
        it('should complete manual mode transfer', async function() {
            transferWorkflow.config.transferMode = 'manual';
            
            transferWorkflow.chromeExtractor = createMockChromeExtractor();
            transferWorkflow.r2Storage = createMockR2Storage();
            transferWorkflow.cloudflareAdapter = createMockCloudflareAdapter();
            
            const transferResult = await transferWorkflow.transferSession({
                targetUrl: 'https://app.example.com'
            });
            
            assert(transferResult.mode === 'manual', 'Transfer mode should be manual');
            assert(transferResult.result.steps, 'Manual steps should be provided');
            assert(transferResult.result.data, 'Manual transfer data should be provided');
            
            console.log('✅ End-to-end manual transfer test passed');
        });
        
        it('should test connectivity to all Cloudflare services', async function() {
            transferWorkflow.r2Storage = createMockR2Storage();
            transferWorkflow.cloudflareAdapter = createMockCloudflareAdapter();
            
            const connectivityResult = await transferWorkflow.testCloudflareConnectivity();
            
            assert(connectivityResult.timestamp, 'Timestamp should be provided');
            assert(typeof connectivityResult.r2Storage === 'object', 'R2 status should be provided');
            assert(typeof connectivityResult.browserIsolation === 'object', 'Browser isolation status should be provided');
            
            console.log('✅ Cloudflare connectivity test passed');
        });
    });
    
    describe('Authentication Persistence', function() {
        it('should preserve authentication cookies', async function() {
            const authCookies = [
                {
                    name: 'jwt_token',
                    value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature',
                    domain: '.example.com',
                    secure: true,
                    httpOnly: true
                }
            ];
            
            const transferWorkflow = new CloudflareTransferWorkflow({
                transferMode: 'manual'
            });
            
            transferWorkflow.chromeExtractor = createMockChromeExtractor({
                cookies: authCookies
            });
            transferWorkflow.r2Storage = createMockR2Storage();
            transferWorkflow.cloudflareAdapter = createMockCloudflareAdapter();
            
            const result = await transferWorkflow.transferSession();
            
            // Validate that authentication cookies are preserved
            const transferredCookies = result.result.data.cookies;
            const authCookie = transferredCookies.find(c => c.name === 'jwt_token');
            
            assert(authCookie, 'Authentication cookie should be preserved');
            assert(authCookie.value === authCookies[0].value, 'Cookie value should be preserved');
            assert(authCookie.secure === true, 'Cookie security settings should be preserved');
            
            console.log('✅ Authentication cookie persistence test passed');
        });
        
        it('should preserve authentication localStorage', async function() {
            const authStorage = {
                'app.example.com': {
                    'access_token': 'bearer_token_12345',
                    'user_session': '{"user_id":"123","expires":"2024-12-31"}'
                }
            };
            
            const transferWorkflow = new CloudflareTransferWorkflow({
                transferMode: 'manual'
            });
            
            transferWorkflow.chromeExtractor = createMockChromeExtractor({
                localStorage: authStorage
            });
            transferWorkflow.r2Storage = createMockR2Storage();
            transferWorkflow.cloudflareAdapter = createMockCloudflareAdapter();
            
            const result = await transferWorkflow.transferSession();
            
            // Validate localStorage persistence
            const transferredStorage = result.result.data.localStorage;
            
            assert(transferredStorage['app.example.com'], 'Domain-specific localStorage should be preserved');
            assert(transferredStorage['app.example.com']['access_token'] === 'bearer_token_12345', 'Access token should be preserved');
            
            console.log('✅ Authentication localStorage persistence test passed');
        });
    });
    
    // Helper functions for creating mock objects
    
    async function setupMockChromeProfile() {
        const profileDir = TEST_CONFIG.chrome.mockDataPath;
        const defaultProfileDir = path.join(profileDir, 'Default');
        
        await fs.mkdir(defaultProfileDir, { recursive: true });
        
        // Create basic profile structure
        await fs.writeFile(
            path.join(defaultProfileDir, 'Preferences'),
            JSON.stringify({
                profile: { name: 'Test Profile' },
                browser: { version: '120.0.0.0' }
            })
        );
    }
    
    async function createMockCookieDatabase() {
        // Create a minimal SQLite database structure for testing
        const cookieDbPath = path.join(TEST_CONFIG.chrome.mockDataPath, 'Default', 'Cookies');
        await fs.writeFile(cookieDbPath, Buffer.alloc(0)); // Empty file for now
    }
    
    async function createMockLocalStorage() {
        const localStorageDir = path.join(TEST_CONFIG.chrome.mockDataPath, 'Default', 'Local Storage', 'leveldb');
        await fs.mkdir(localStorageDir, { recursive: true });
        
        // Create mock LevelDB file
        await fs.writeFile(
            path.join(localStorageDir, '000001.ldb'),
            'Mock localStorage data'
        );
    }
    
    function createMockR2Client() {
        return {
            send: async (command) => {
                // Mock successful R2 operations
                return {
                    ETag: '"mock-etag"',
                    Location: 'https://test-bucket.r2.cloudflarestorage.com/test-key'
                };
            }
        };
    }
    
    function createFailingR2Client() {
        return {
            send: async () => {
                throw new Error('Mock R2 connection failed');
            }
        };
    }
    
    function createMockR2Bucket() {
        return {
            put: async (key, data, options) => ({ success: true }),
            get: async (key) => ({ text: async () => '{"test": true}' }),
            delete: async (key) => ({ success: true })
        };
    }
    
    function createMockChromeExtractor(customData = {}) {
        return {
            extractSession: async () => ({
                sessionData: {
                    cookies: customData.cookies || TEST_CONFIG.mockSession.cookies,
                    localStorage: customData.localStorage || TEST_CONFIG.mockSession.localStorage,
                    sessionStorage: customData.sessionStorage || TEST_CONFIG.mockSession.sessionStorage
                },
                metadata: {
                    extractedAt: new Date().toISOString(),
                    profileName: 'Default'
                }
            })
        };
    }
    
    function createMockR2Storage() {
        return {
            store: async () => ({ success: true, key: 'test-key' }),
            retrieve: async () => ({ success: true, sessionData: {} }),
            healthCheck: async () => ({ healthy: true })
        };
    }
    
    function createMockCloudflareAdapter() {
        return {
            transferToIsolation: async (sessionData, targetUrl) => ({
                isolationUrl: `https://test-team.cloudflareaccess.com/browser/${encodeURIComponent(targetUrl)}`,
                instructions: {
                    cookies: sessionData.sessionData.cookies || [],
                    localStorage: sessionData.sessionData.localStorage || {},
                    sessionStorage: sessionData.sessionData.sessionStorage || {},
                    manualSteps: []
                }
            }),
            healthCheck: async () => ({
                browserIsolation: true,
                browserRendering: false,
                r2Storage: true
            })
        };
    }
});