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
exports.ChromeProfileSession = exports.SimplePlaywrightAdapter = void 0;
exports.launchWithChromeProfile = launchWithChromeProfile;
const playwright_1 = require("playwright");
const core_1 = require("@psp/core");
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
const crypto = __importStar(require("crypto"));
/**
 * Simple Playwright Adapter for PSP v0.1
 * Uses launchPersistentContext for real Chrome profile persistence
 */
class SimplePlaywrightAdapter extends core_1.Adapter {
    constructor(options = {}) {
        super({
            ...options,
            type: 'playwright'
        });
    }
    async connect(target) {
        this.context = target;
        await super.connect(target);
    }
    async captureState() {
        if (!this.context) {
            throw new Error('Not connected to a Playwright context');
        }
        // For persistent contexts, the state is automatically saved in the Chrome profile
        const state = {
            version: '1.0.0',
            timestamp: Date.now(),
            origin: '',
            storage: {
                cookies: [],
                localStorage: new Map(),
                sessionStorage: new Map(),
            }
        };
        return state;
    }
    async applyState(state) {
        if (!this.context) {
            throw new Error('Not connected to a Playwright context');
        }
        // For persistent contexts, state is automatically restored from Chrome profile
        console.log('State applied from Chrome profile');
    }
    async startRecording(options) {
        throw new Error('Recording not implemented in simple adapter');
    }
    async stopRecording() {
        throw new Error('Recording not implemented in simple adapter');
    }
    async playRecording(events, options) {
        throw new Error('Playback not implemented in simple adapter');
    }
}
exports.SimplePlaywrightAdapter = SimplePlaywrightAdapter;
/**
 * Session class that uses Chrome profiles
 */
class ChromeProfileSession {
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
        return new ChromeProfileSession(data.metadata, data.userDataDir);
    }
    static async create(options) {
        const id = crypto.randomUUID();
        const now = Date.now();
        const userDataDir = options.userDataDir || path.join(os.homedir(), '.psp', 'profiles', id);
        fs.mkdirSync(userDataDir, { recursive: true });
        const metadata = {
            id,
            name: options.name,
            description: options.description,
            createdAt: now,
            updatedAt: now
        };
        const session = new ChromeProfileSession(metadata, userDataDir);
        await session.save();
        return session;
    }
}
exports.ChromeProfileSession = ChromeProfileSession;
/**
 * Launch with Chrome profile persistence
 */
async function launchWithChromeProfile(sessionId, options = {}) {
    let session;
    let userDataDir;
    if (sessionId) {
        try {
            session = await ChromeProfileSession.load(sessionId);
            userDataDir = session.getUserDataDir();
        }
        catch (error) {
            session = await ChromeProfileSession.create({
                name: options.sessionName || `Session ${new Date().toISOString()}`,
                userDataDir: options.userDataDir
            });
            userDataDir = session.getUserDataDir();
        }
    }
    else {
        session = await ChromeProfileSession.create({
            name: options.sessionName || `Session ${new Date().toISOString()}`,
            userDataDir: options.userDataDir
        });
        userDataDir = session.getUserDataDir();
    }
    const context = await playwright_1.chromium.launchPersistentContext(userDataDir, {
        headless: options.headless ?? false
    });
    return { context, session };
}
