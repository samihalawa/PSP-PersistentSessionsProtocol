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
Object.defineProperty(exports, "__esModule", { value: true });
exports.launchWithPSP = launchWithPSP;
exports.captureSession = captureSession;
exports.listSessions = listSessions;
exports.demo = demo;
const playwright_1 = require("playwright");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const crypto = __importStar(require("crypto"));
// Simple session implementation for v0.1
class SimpleSession {
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
    async capture(context) {
        // For Chrome profiles, the session data is automatically persisted
        // in the userDataDir by Chrome itself
        console.log(`Session captured to Chrome profile: ${this.userDataDir}`);
    }
    async restore(context) {
        // For Chrome profiles, restoration happens automatically when
        // launching with the same userDataDir
        console.log(`Session restored from Chrome profile: ${this.userDataDir}`);
    }
    async save() {
        // Save session metadata
        const sessionDir = path.join(os.homedir(), '.psp', 'sessions');
        const sessionFile = path.join(sessionDir, `${this.metadata.id}.json`);
        // Ensure directory exists
        fs.mkdirSync(sessionDir, { recursive: true });
        // Save metadata
        fs.writeFileSync(sessionFile, JSON.stringify({
            metadata: this.metadata,
            userDataDir: this.userDataDir
        }, null, 2));
    }
    async delete() {
        const sessionDir = path.join(os.homedir(), '.psp', 'sessions');
        const sessionFile = path.join(sessionDir, `${this.metadata.id}.json`);
        if (fs.existsSync(sessionFile)) {
            fs.unlinkSync(sessionFile);
        }
    }
    static async load(sessionId) {
        const sessionDir = path.join(os.homedir(), '.psp', 'sessions');
        const sessionFile = path.join(sessionDir, `${sessionId}.json`);
        if (!fs.existsSync(sessionFile)) {
            throw new Error(`Session ${sessionId} not found`);
        }
        const data = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
        return new SimpleSession(data.metadata, data.userDataDir);
    }
    static async create(options) {
        const id = crypto.randomUUID();
        const now = Date.now();
        // Use provided userDataDir or create a new one
        const userDataDir = options.userDataDir || path.join(os.homedir(), '.psp', 'profiles', id);
        // Ensure profile directory exists
        fs.mkdirSync(userDataDir, { recursive: true });
        const metadata = {
            id,
            name: options.name,
            description: options.description,
            createdAt: now,
            updatedAt: now
        };
        const session = new SimpleSession(metadata, userDataDir);
        await session.save();
        return session;
    }
    getUserDataDir() {
        return this.userDataDir;
    }
}
/**
 * Helper to launch Playwright with real Chrome profile persistence
 */
async function launchWithPSP(sessionId, options = {}) {
    let session;
    let userDataDir;
    if (sessionId) {
        // Load existing session
        try {
            session = await SimpleSession.load(sessionId);
            userDataDir = session.getUserDataDir();
            console.log(`Loaded session: ${session.getMetadata().name}`);
            console.log(`Using Chrome profile: ${userDataDir}`);
        }
        catch (error) {
            console.warn(`Could not load session ${sessionId}:`, error);
            // Create new session as fallback
            session = await SimpleSession.create({
                name: options.sessionName || `Session ${new Date().toISOString()}`,
                userDataDir: options.userDataDir
            });
            userDataDir = session.getUserDataDir();
        }
    }
    else {
        // Create new session
        session = await SimpleSession.create({
            name: options.sessionName || `Session ${new Date().toISOString()}`,
            userDataDir: options.userDataDir
        });
        userDataDir = session.getUserDataDir();
    }
    // Launch browser with persistent context using the Chrome profile
    const context = await playwright_1.chromium.launchPersistentContext(userDataDir, {
        headless: options.headless ?? false,
        // Chrome-specific options for better session persistence
        channel: 'chrome', // Use actual Chrome instead of Chromium
        args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
        ]
    });
    console.log(`Chrome launched with persistent context at: ${userDataDir}`);
    return { context, session };
}
/**
 * Capture current session from an existing Chrome profile
 */
async function captureSession(userDataDir, sessionName) {
    // Create session from existing Chrome profile
    const session = await SimpleSession.create({
        name: sessionName || `Captured ${new Date().toISOString()}`,
        userDataDir: userDataDir
    });
    console.log(`Session captured with ID: ${session.getId()}`);
    console.log(`Profile directory: ${userDataDir}`);
    return session.getId();
}
/**
 * List all available sessions
 */
async function listSessions() {
    const sessionDir = path.join(os.homedir(), '.psp', 'sessions');
    if (!fs.existsSync(sessionDir)) {
        return [];
    }
    const files = fs.readdirSync(sessionDir).filter(f => f.endsWith('.json'));
    const sessions = [];
    for (const file of files) {
        try {
            const sessionId = path.basename(file, '.json');
            const session = await SimpleSession.load(sessionId);
            sessions.push(session);
        }
        catch (error) {
            console.warn(`Failed to load session from ${file}:`, error);
        }
    }
    return sessions;
}
/**
 * Simple demo function using real Chrome profiles
 */
async function demo() {
    console.log('🚀 PSP Playwright Demo Starting with Real Chrome Profiles...');
    // Step 1: Launch with new session using Chrome profile
    const { context, session } = await launchWithPSP(undefined, {
        sessionName: 'Demo Session',
        headless: false
    });
    const page = await context.newPage();
    // Navigate and interact
    console.log('📝 Setting a test cookie...');
    await page.goto('https://httpbin.org/cookies/set?demo=test&psp=chrome-profile');
    await page.waitForLoadState('networkidle');
    // The session is automatically captured in the Chrome profile
    await session.capture(context);
    const sessionId = session.getId();
    console.log(`✅ Session captured: ${sessionId}`);
    console.log(`📁 Chrome profile location: ${session.getUserDataDir()}`);
    await context.close();
    // Step 2: Launch with restored session
    console.log('🔄 Restoring session from Chrome profile...');
    const { context: context2, session: session2 } = await launchWithPSP(sessionId, {
        headless: false
    });
    const page2 = await context2.newPage();
    await page2.goto('https://httpbin.org/cookies');
    // Check if cookies were restored from Chrome profile
    const response = await page2.textContent('body');
    console.log('🍪 Response from cookie check:', response);
    if (response && (response.includes('demo') || response.includes('psp'))) {
        console.log('✅ Chrome profile session restoration successful!');
    }
    else {
        console.log('❌ Session restoration failed');
    }
    // Keep browser open for a moment to demonstrate
    console.log('🔍 Browser will stay open for 5 seconds for inspection...');
    await page2.waitForTimeout(5000);
    await context2.close();
    console.log('🎉 Demo completed!');
}
