"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionController = void 0;
const core_1 = require("@psp/core");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
/**
 * Controller for session-related endpoints
 */
class SessionController {
    constructor(storageProvider) {
        this.logger = (0, logger_1.createLogger)('session-controller');
        /**
         * List sessions
         */
        this.listSessions = async (req, res, next) => {
            try {
                // Build filter from query parameters
                const filter = {};
                if (req.query.name) {
                    filter.name = req.query.name;
                }
                if (req.query.tags) {
                    filter.tags = Array.isArray(req.query.tags)
                        ? req.query.tags
                        : [req.query.tags];
                }
                if (req.query.limit) {
                    filter.limit = parseInt(req.query.limit, 10);
                }
                if (req.query.offset) {
                    filter.offset = parseInt(req.query.offset, 10);
                }
                // Get sessions from storage
                const sessions = await this.storageProvider.list(filter);
                res.json(sessions);
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Get a session by ID
         */
        this.getSession = async (req, res, next) => {
            try {
                const { id } = req.params;
                // Check if session exists
                const exists = await this.storageProvider.exists(id);
                if (!exists) {
                    throw new errors_1.NotFoundError(`Session with ID ${id} not found`);
                }
                // Get session from storage
                const session = await this.storageProvider.load(id);
                res.json(session);
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Create a new session
         */
        this.createSession = async (req, res, next) => {
            try {
                const { name, description, tags, state } = req.body;
                // Generate a new session ID
                const id = (0, core_1.generateId)();
                const now = Date.now();
                // Create the session
                const session = {
                    metadata: {
                        id,
                        name,
                        description,
                        tags: tags || [],
                        createdAt: now,
                        updatedAt: now,
                        createdWith: 'psp-server'
                    },
                    state: state || {
                        version: '1.0.0',
                        timestamp: now,
                        origin: '',
                        storage: {
                            cookies: [],
                            localStorage: new Map(),
                            sessionStorage: new Map()
                        }
                    }
                };
                // Save to storage
                await this.storageProvider.save(session);
                res.status(201).json(session);
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Update a session
         */
        this.updateSession = async (req, res, next) => {
            try {
                const { id } = req.params;
                const { metadata, state } = req.body;
                // Check if session exists
                const exists = await this.storageProvider.exists(id);
                if (!exists) {
                    throw new errors_1.NotFoundError(`Session with ID ${id} not found`);
                }
                // Get the existing session
                const session = await this.storageProvider.load(id);
                // Update metadata and state
                if (metadata) {
                    // Prevent changing the ID
                    delete metadata.id;
                    // Update updatedAt timestamp
                    metadata.updatedAt = Date.now();
                    session.metadata = {
                        ...session.metadata,
                        ...metadata
                    };
                }
                if (state) {
                    session.state = state;
                }
                // Save the updated session
                await this.storageProvider.save(session);
                res.json(session);
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Partially update a session
         */
        this.patchSession = async (req, res, next) => {
            try {
                const { id } = req.params;
                const { metadata, state } = req.body;
                // Check if session exists
                const exists = await this.storageProvider.exists(id);
                if (!exists) {
                    throw new errors_1.NotFoundError(`Session with ID ${id} not found`);
                }
                // Get the existing session
                const session = await this.storageProvider.load(id);
                // Update metadata if provided
                if (metadata) {
                    // Prevent changing the ID
                    delete metadata.id;
                    // Update updatedAt timestamp
                    metadata.updatedAt = Date.now();
                    session.metadata = {
                        ...session.metadata,
                        ...metadata
                    };
                }
                // Update state if provided (shallow merge)
                if (state) {
                    session.state = {
                        ...session.state,
                        ...state,
                        timestamp: Date.now()
                    };
                }
                // Save the updated session
                await this.storageProvider.save(session);
                res.json(session);
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Delete a session
         */
        this.deleteSession = async (req, res, next) => {
            try {
                const { id } = req.params;
                // Check if session exists
                const exists = await this.storageProvider.exists(id);
                if (!exists) {
                    throw new errors_1.NotFoundError(`Session with ID ${id} not found`);
                }
                // Delete the session
                await this.storageProvider.delete(id);
                res.status(204).end();
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Get session events
         */
        this.getSessionEvents = async (req, res, next) => {
            try {
                const { id } = req.params;
                // Check if session exists
                const exists = await this.storageProvider.exists(id);
                if (!exists) {
                    throw new errors_1.NotFoundError(`Session with ID ${id} not found`);
                }
                // Get the session
                const session = await this.storageProvider.load(id);
                // Get events
                const events = session.state.recording?.events || [];
                res.json(events);
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Add events to a session
         */
        this.addSessionEvents = async (req, res, next) => {
            try {
                const { id } = req.params;
                const events = req.body;
                if (!Array.isArray(events)) {
                    throw new errors_1.BadRequestError('Events must be an array');
                }
                // Check if session exists
                const exists = await this.storageProvider.exists(id);
                if (!exists) {
                    throw new errors_1.NotFoundError(`Session with ID ${id} not found`);
                }
                // Get the session
                const session = await this.storageProvider.load(id);
                // Add events
                if (!session.state.recording) {
                    session.state.recording = {
                        events: [],
                        startTime: Date.now(),
                        duration: 0
                    };
                }
                session.state.recording.events = [
                    ...session.state.recording.events,
                    ...events
                ];
                // Update duration if needed
                if (events.length > 0) {
                    const lastEvent = events[events.length - 1];
                    const duration = lastEvent.timestamp;
                    if (duration > (session.state.recording.duration || 0)) {
                        session.state.recording.duration = duration;
                    }
                }
                // Update timestamp
                session.state.timestamp = Date.now();
                session.metadata.updatedAt = Date.now();
                // Save the session
                await this.storageProvider.save(session);
                res.json(session.state.recording.events);
            }
            catch (error) {
                next(error);
            }
        };
        this.storageProvider = storageProvider;
    }
}
exports.SessionController = SessionController;
