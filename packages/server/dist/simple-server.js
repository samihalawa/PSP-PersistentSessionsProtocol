"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerSession = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
const crypto = __importStar(require("crypto"));
const playwright_1 = require("playwright");
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.static('public'));
/**
 * Simple session management for server
 */
class ServerSession {
    constructor(metadata, userDataDir) {
        this.metadata = metadata;
        this.userDataDir = userDataDir;
    }
    getId() {
        return this.metadata.id;
    }
    getMetadata() {
        return this.metadata;
    }
    getUserDataDir() {
        return this.userDataDir;
    }
    toJSON() {
        return {
            id: this.getId(),
            metadata: this.getMetadata(),
            userDataDir: this.getUserDataDir()
        };
    }
    async save() {
        const sessionDir = path.join(os.homedir(), '.psp', 'sessions');
        const sessionFile = path.join(sessionDir, `${this.metadata.id}.json`);
        fs.mkdirSync(sessionDir, { recursive: true });
        fs.writeFileSync(sessionFile, JSON.stringify({
            metadata: this.metadata,
            userDataDir: this.userDataDir
        }, null, 2));
    }
    static async load(sessionId) {
        const sessionDir = path.join(os.homedir(), '.psp', 'sessions');
        const sessionFile = path.join(sessionDir, `${sessionId}.json`);
        if (!fs.existsSync(sessionFile)) {
            throw new Error(`Session ${sessionId} not found`);
        }
        const data = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
        return new ServerSession(data.metadata, data.userDataDir);
    }
    static async create(name, userDataDir) {
        const id = crypto.randomUUID();
        const now = Date.now();
        const profileDir = userDataDir || path.join(os.homedir(), '.psp', 'profiles', id);
        fs.mkdirSync(profileDir, { recursive: true });
        const metadata = {
            id,
            name,
            createdAt: now,
            updatedAt: now,
            source: 'server'
        };
        const session = new ServerSession(metadata, profileDir);
        await session.save();
        return session;
    }
    static async list() {
        const sessionDir = path.join(os.homedir(), '.psp', 'sessions');
        if (!fs.existsSync(sessionDir)) {
            return [];
        }
        const files = fs.readdirSync(sessionDir).filter(f => f.endsWith('.json'));
        const sessions = [];
        for (const file of files) {
            try {
                const sessionId = path.basename(file, '.json');
                const session = await ServerSession.load(sessionId);
                sessions.push(session);
            }
            catch (error) {
                console.warn(`Failed to load session from ${file}`);
            }
        }
        return sessions;
    }
    async delete() {
        const sessionDir = path.join(os.homedir(), '.psp', 'sessions');
        const sessionFile = path.join(sessionDir, `${this.metadata.id}.json`);
        if (fs.existsSync(sessionFile)) {
            fs.unlinkSync(sessionFile);
        }
    }
}
exports.ServerSession = ServerSession;
/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'PSP Server v0.1',
        version: '0.1.0',
        features: ['chrome-profiles', 'session-management'],
        timestamp: new Date().toISOString()
    });
});
/**
 * Get server info
 */
app.get('/', (req, res) => {
    res.json({
        name: 'PersistentSessionsProtocol Server',
        version: '0.1.0',
        description: 'Chrome Profile Session Management Server',
        endpoints: {
            'GET /health': 'Health check',
            'GET /sessions': 'List all sessions',
            'POST /sessions': 'Create new session',
            'GET /sessions/:id': 'Get session details',
            'DELETE /sessions/:id': 'Delete session',
            'POST /sessions/:id/launch': 'Launch session in browser',
            'POST /demo': 'Run server demo'
        }
    });
});
/**
 * List all sessions
 */
app.get('/sessions', async (req, res) => {
    try {
        const sessions = await ServerSession.list();
        res.json({
            count: sessions.length,
            sessions: sessions.map(s => s.toJSON())
        });
    }
    catch (error) {
        console.error('Error listing sessions:', error);
        res.status(500).json({ error: 'Failed to list sessions' });
    }
});
/**
 * Create a new session
 */
app.post('/sessions', async (req, res) => {
    try {
        const { name, userDataDir } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Session name is required' });
        }
        const session = await ServerSession.create(name, userDataDir);
        res.status(201).json({
            message: 'Session created successfully',
            session: session.toJSON()
        });
    }
    catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({ error: 'Failed to create session' });
    }
});
/**
 * Get a specific session
 */
app.get('/sessions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const session = await ServerSession.load(id);
        res.json({ session: session.toJSON() });
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
            res.status(404).json({ error: 'Session not found' });
        }
        else {
            console.error('Error getting session:', error);
            res.status(500).json({ error: 'Failed to get session' });
        }
    }
});
/**
 * Delete a session
 */
app.delete('/sessions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const session = await ServerSession.load(id);
        await session.delete();
        res.json({
            message: 'Session deleted successfully',
            id: id
        });
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
            res.status(404).json({ error: 'Session not found' });
        }
        else {
            console.error('Error deleting session:', error);
            res.status(500).json({ error: 'Failed to delete session' });
        }
    }
});
/**
 * Launch a session in browser (for demonstration)
 */
app.post('/sessions/:id/launch', async (req, res) => {
    try {
        const { id } = req.params;
        const { headless = true, url = 'https://www.google.com' } = req.body;
        const session = await ServerSession.load(id);
        const userDataDir = session.getUserDataDir();
        // Launch Chrome with the session's profile
        const context = await playwright_1.chromium.launchPersistentContext(userDataDir, {
            headless: headless
        });
        const page = await context.newPage();
        await page.goto(url);
        // Demonstrate session persistence by setting some data
        await page.evaluate(() => {
            localStorage.setItem('server-launch', 'success');
            localStorage.setItem('launch-time', Date.now().toString());
        });
        // For headless mode, close immediately after demonstration
        if (headless) {
            const data = await page.evaluate(() => {
                return {
                    serverLaunch: localStorage.getItem('server-launch'),
                    launchTime: localStorage.getItem('launch-time'),
                    url: window.location.href
                };
            });
            await context.close();
            res.json({
                message: 'Session launched and closed successfully',
                session: session.toJSON(),
                demonstration: data
            });
        }
        else {
            res.json({
                message: 'Session launched in browser',
                session: session.toJSON(),
                note: 'Browser will remain open'
            });
        }
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
            res.status(404).json({ error: 'Session not found' });
        }
        else {
            console.error('Error launching session:', error);
            res.status(500).json({ error: 'Failed to launch session' });
        }
    }
});
/**
 * Server demo endpoint
 */
app.post('/demo', async (req, res) => {
    try {
        console.log('🎯 Running server demo...');
        // Create demo session
        const session = await ServerSession.create('Server Demo Session');
        // Launch and set data
        const context = await playwright_1.chromium.launchPersistentContext(session.getUserDataDir(), {
            headless: true
        });
        const page = await context.newPage();
        await page.goto('https://www.google.com');
        await page.evaluate(() => {
            localStorage.setItem('server-demo', 'chrome-profile-working');
            localStorage.setItem('timestamp', Date.now().toString());
        });
        await context.close();
        // Reopen to verify persistence
        const context2 = await playwright_1.chromium.launchPersistentContext(session.getUserDataDir(), {
            headless: true
        });
        const page2 = await context2.newPage();
        await page2.goto('https://www.google.com');
        const data = await page2.evaluate(() => {
            return {
                demo: localStorage.getItem('server-demo'),
                timestamp: localStorage.getItem('timestamp')
            };
        });
        await context2.close();
        const isWorking = data.demo === 'chrome-profile-working';
        res.json({
            message: 'Server demo completed',
            success: isWorking,
            session: session.toJSON(),
            demonstration: {
                persistenceTest: isWorking ? 'PASSED' : 'FAILED',
                data: data,
                profile: session.getUserDataDir()
            }
        });
    }
    catch (error) {
        console.error('Error running demo:', error);
        res.status(500).json({ error: 'Demo failed' });
    }
});
/**
 * Start server
 */
app.listen(port, () => {
    console.log('🚀 PSP Server v0.1 starting...');
    console.log(`📡 Server running on http://localhost:${port}`);
    console.log('🔧 Features: Chrome Profile Session Management');
    console.log('📋 Endpoints:');
    console.log('   GET  /health          - Health check');
    console.log('   GET  /sessions        - List sessions');
    console.log('   POST /sessions        - Create session');
    console.log('   GET  /sessions/:id    - Get session');
    console.log('   DELETE /sessions/:id  - Delete session');
    console.log('   POST /sessions/:id/launch - Launch session');
    console.log('   POST /demo            - Run demo');
    console.log('\n✅ Ready for PSP requests!');
});
