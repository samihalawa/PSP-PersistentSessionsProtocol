"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Adapter = void 0;
const session_1 = require("./session");
const local_1 = require("./storage/local");
/**
 * Base adapter class that framework-specific adapters should extend
 */
class Adapter {
    /**
     * Creates a new adapter
     */
    constructor(options) {
        this.type = options.type;
        this.options = { ...options };
        this.storageProvider = options.storageProvider || new local_1.LocalStorageProvider();
    }
    /**
     * Connects to a browser instance
     */
    async connect(target) {
        this.target = target;
    }
    /**
     * Creates a new session
     */
    async createSession(target, options) {
        // Connect to the target if needed
        if (target && (!this.target || this.target !== target)) {
            await this.connect(target);
        }
        // Create the session
        const session = await session_1.Session.create(options, this);
        return session;
    }
    /**
     * Loads an existing session
     */
    async loadSession(id) {
        return await session_1.Session.load(id, this.storageProvider);
    }
    /**
     * Lists available sessions
     */
    async listSessions(filter) {
        return await this.storageProvider.list(filter);
    }
}
exports.Adapter = Adapter;
