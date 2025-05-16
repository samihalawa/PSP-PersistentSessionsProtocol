"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockPspApiClient = void 0;
const uuid_1 = require("uuid");
/**
 * Mock data for testing
 */
const generateMockCookies = (domain, count = 3) => {
    const cookies = [];
    const sameSiteOptions = ['Strict', 'Lax', 'None'];
    for (let i = 0; i < count; i++) {
        cookies.push({
            name: `cookie_${i}`,
            value: `value_${i}`,
            domain,
            path: '/',
            expires: Date.now() + 86400000, // 1 day
            httpOnly: Math.random() > 0.5,
            secure: Math.random() > 0.5,
            sameSite: sameSiteOptions[Math.floor(Math.random() * sameSiteOptions.length)],
            partitioned: false
        });
    }
    return cookies;
};
const generateMockStorage = (origin) => {
    const storage = new Map();
    storage.set('user_id', '12345');
    storage.set('theme', 'light');
    storage.set('last_visit', Date.now().toString());
    return storage;
};
/**
 * Generate a mock session
 */
const generateMockSession = (id, name, description, tags, framework) => {
    const now = Date.now();
    const createdAt = now - Math.floor(Math.random() * 30 * 86400000); // 0-30 days ago
    const updatedAt = createdAt + Math.floor(Math.random() * (now - createdAt));
    const origin = 'https://example.com';
    // Create localStorage and sessionStorage
    const localStorage = new Map();
    const sessionStorage = new Map();
    localStorage.set(origin, generateMockStorage(origin));
    sessionStorage.set(origin, generateMockStorage(origin));
    // Create mock session
    return {
        metadata: {
            id,
            name,
            description,
            createdAt,
            updatedAt,
            tags,
            createdWith: framework || ['playwright', 'selenium', 'puppeteer'][Math.floor(Math.random() * 3)]
        },
        state: {
            version: '1.0.0',
            timestamp: updatedAt,
            origin,
            storage: {
                cookies: generateMockCookies(origin.replace('https://', '')),
                localStorage,
                sessionStorage
            },
            history: {
                currentUrl: origin,
                entries: [
                    {
                        url: origin,
                        title: 'Example Domain',
                        timestamp: updatedAt
                    }
                ],
                currentIndex: 0
            }
        }
    };
};
/**
 * Generate initial mock sessions
 */
const generateInitialSessions = () => {
    return [
        generateMockSession('1', 'Authentication Session', 'Session with logged in user credentials', ['auth', 'production'], 'playwright'),
        generateMockSession('2', 'Shopping Cart Session', 'E-commerce session with items in cart', ['e-commerce', 'testing'], 'selenium'),
        generateMockSession('3', 'Admin Dashboard', 'Administrator privileges session', ['admin', 'production'], 'puppeteer'),
        generateMockSession('4', 'Guest User', 'Anonymous browsing session', ['guest'], 'playwright'),
        generateMockSession('5', 'Checkout Process', 'Session for testing checkout flow', ['e-commerce', 'testing', 'checkout'], 'selenium')
    ];
};
/**
 * Mock PSP API for testing
 */
class MockPspApiClient {
    constructor() {
        this.sessions = generateInitialSessions();
        this.sessionListeners = new Map();
        this.eventListeners = new Map();
    }
    /**
     * Simulates a delay for asynchronous operations
     */
    async delay(ms = 500) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * List all sessions
     */
    async listSessions(filters) {
        await this.delay();
        let filtered = this.sessions.map(s => s.metadata);
        // Apply filters
        if (filters) {
            if (filters.name) {
                filtered = filtered.filter(s => s.name.toLowerCase().includes(filters.name.toLowerCase()));
            }
            if (filters.tags && filters.tags.length > 0) {
                filtered = filtered.filter(s => filters.tags.every(tag => s.tags?.includes(tag)));
            }
            // Sort by updated time (newest first)
            filtered.sort((a, b) => b.updatedAt - a.updatedAt);
            // Apply pagination
            if (filters.offset || filters.limit) {
                const offset = filters.offset || 0;
                const limit = filters.limit;
                filtered = filtered.slice(offset, limit ? offset + limit : undefined);
            }
        }
        return filtered;
    }
    /**
     * Get a session by ID
     */
    async getSession(id) {
        await this.delay();
        const session = this.sessions.find(s => s.metadata.id === id);
        if (!session) {
            throw new Error(`Session with ID ${id} not found`);
        }
        return { ...session };
    }
    /**
     * Create a new session
     */
    async createSession(data) {
        await this.delay();
        const id = (0, uuid_1.v4)();
        const session = generateMockSession(id, data.name, data.description, data.tags);
        this.sessions.push(session);
        return session.metadata;
    }
    /**
     * Update a session
     */
    async updateSession(id, data) {
        await this.delay();
        const sessionIndex = this.sessions.findIndex(s => s.metadata.id === id);
        if (sessionIndex === -1) {
            throw new Error(`Session with ID ${id} not found`);
        }
        const session = this.sessions[sessionIndex];
        const updatedSession = {
            ...session,
            ...data,
            metadata: {
                ...session.metadata,
                ...(data.metadata || {}),
                updatedAt: Date.now()
            }
        };
        this.sessions[sessionIndex] = updatedSession;
        // Notify listeners
        this.notifySessionListeners(id, updatedSession);
        return { ...updatedSession };
    }
    /**
     * Delete a session
     */
    async deleteSession(id) {
        await this.delay();
        const sessionIndex = this.sessions.findIndex(s => s.metadata.id === id);
        if (sessionIndex === -1) {
            throw new Error(`Session with ID ${id} not found`);
        }
        this.sessions.splice(sessionIndex, 1);
    }
    /**
     * Get session events
     */
    async getSessionEvents(id) {
        await this.delay();
        const session = this.sessions.find(s => s.metadata.id === id);
        if (!session) {
            throw new Error(`Session with ID ${id} not found`);
        }
        if (!session.state.recording || !session.state.recording.events) {
            return [];
        }
        return [...session.state.recording.events];
    }
    /**
     * Add events to a session
     */
    async addSessionEvents(id, events) {
        await this.delay();
        const sessionIndex = this.sessions.findIndex(s => s.metadata.id === id);
        if (sessionIndex === -1) {
            throw new Error(`Session with ID ${id} not found`);
        }
        const session = this.sessions[sessionIndex];
        if (!session.state.recording) {
            session.state.recording = {
                events: [],
                startTime: Date.now(),
                duration: 0
            };
        }
        // Add events
        session.state.recording.events = [
            ...(session.state.recording.events || []),
            ...events
        ];
        // Update duration
        if (session.state.recording.events.length > 0) {
            const lastEvent = session.state.recording.events[session.state.recording.events.length - 1];
            session.state.recording.duration = lastEvent.timestamp;
        }
        // Update session
        session.metadata.updatedAt = Date.now();
        this.sessions[sessionIndex] = session;
        // Notify listeners
        this.notifyEventListeners(id, events);
    }
    /**
     * Add a listener for session updates
     */
    addSessionListener(sessionId, listener) {
        let listeners = this.sessionListeners.get(sessionId);
        if (!listeners) {
            listeners = new Set();
            this.sessionListeners.set(sessionId, listeners);
        }
        listeners.add(listener);
    }
    /**
     * Remove a listener for session updates
     */
    removeSessionListener(sessionId, listener) {
        const listeners = this.sessionListeners.get(sessionId);
        if (listeners) {
            listeners.delete(listener);
            if (listeners.size === 0) {
                this.sessionListeners.delete(sessionId);
            }
        }
    }
    /**
     * Add a listener for session events
     */
    addEventListener(sessionId, listener) {
        let listeners = this.eventListeners.get(sessionId);
        if (!listeners) {
            listeners = new Set();
            this.eventListeners.set(sessionId, listeners);
        }
        listeners.add(listener);
    }
    /**
     * Remove a listener for session events
     */
    removeEventListener(sessionId, listener) {
        const listeners = this.eventListeners.get(sessionId);
        if (listeners) {
            listeners.delete(listener);
            if (listeners.size === 0) {
                this.eventListeners.delete(sessionId);
            }
        }
    }
    /**
     * Notify session listeners of updates
     */
    notifySessionListeners(sessionId, session) {
        const listeners = this.sessionListeners.get(sessionId);
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener(session);
                }
                catch (error) {
                    console.error('Error in session listener:', error);
                }
            });
        }
    }
    /**
     * Notify event listeners of updates
     */
    notifyEventListeners(sessionId, events) {
        const listeners = this.eventListeners.get(sessionId);
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener(events);
                }
                catch (error) {
                    console.error('Error in event listener:', error);
                }
            });
        }
    }
    /**
     * Other methods (subscribe, unsubscribe, etc.) can be empty implementations
     * since they're not needed for mock testing
     */
    subscribeToSession() { }
    unsubscribeFromSession() { }
    addErrorListener() { }
    removeErrorListener() { }
}
exports.MockPspApiClient = MockPspApiClient;
