"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionController = void 0;
const types_1 = require("../../core/src/types");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const websockets_1 = require("../websockets");
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
                const id = (0, types_1.generateId)();
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
                        createdWith: 'psp-server',
                        status: 'inactive',
                        participants: [],
                        messages: [],
                        participantCount: 0,
                    },
                    state: state || {
                        version: '1.0.0',
                        timestamp: now,
                        origin: '',
                        storage: {
                            cookies: [],
                            localStorage: new Map(),
                            sessionStorage: new Map(),
                        },
                    },
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
                        ...metadata,
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
                        ...metadata,
                    };
                }
                // Update state if provided (shallow merge)
                if (state) {
                    session.state = {
                        ...session.state,
                        ...state,
                        timestamp: Date.now(),
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
                        duration: 0,
                    };
                }
                session.state.recording.events = [
                    ...session.state.recording.events,
                    ...events,
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
        /**
         * Join a session
         */
        this.joinSession = async (req, res, next) => {
            try {
                const { id } = req.params;
                const { participantName, participantId } = req.body;
                if (!participantName) {
                    throw new errors_1.BadRequestError('Participant name is required');
                }
                // Check if session exists
                const exists = await this.storageProvider.exists(id);
                if (!exists) {
                    throw new errors_1.NotFoundError(`Session with ID ${id} not found`);
                }
                // Get the session
                const session = await this.storageProvider.load(id);
                // Initialize participants array if it doesn't exist
                if (!session.metadata.participants) {
                    session.metadata.participants = [];
                }
                // Check if participant already exists
                const existingParticipant = session.metadata.participants.find((p) => p.id === participantId || p.name === participantName);
                let participant;
                if (existingParticipant) {
                    // Reactivate existing participant
                    existingParticipant.isActive = true;
                    existingParticipant.joinedAt = Date.now();
                    participant = existingParticipant;
                }
                else {
                    // Add new participant
                    participant = {
                        id: participantId || (0, types_1.generateId)(),
                        name: participantName,
                        joinedAt: Date.now(),
                        isActive: true,
                    };
                    session.metadata.participants.push(participant);
                }
                // Update session status and participant count
                session.metadata.status = 'active';
                session.metadata.participantCount = session.metadata.participants.filter((p) => p.isActive).length;
                session.metadata.updatedAt = Date.now();
                // Add system message
                if (!session.metadata.messages) {
                    session.metadata.messages = [];
                }
                const joinMessage = {
                    id: (0, types_1.generateId)(),
                    senderId: 'system',
                    senderName: 'System',
                    message: `${participantName} joined the session`,
                    timestamp: Date.now(),
                    type: 'system',
                };
                session.metadata.messages.push(joinMessage);
                // Save the session
                await this.storageProvider.save(session);
                // Broadcast the update to all connected clients
                (0, websockets_1.broadcastSessionUpdate)(id, {
                    type: 'participant_joined',
                    participant,
                    session: session.metadata,
                    message: joinMessage,
                });
                res.json({
                    success: true,
                    participant,
                    session: session.metadata,
                });
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Get session participants
         */
        this.getSessionParticipants = async (req, res, next) => {
            try {
                const { id } = req.params;
                // Check if session exists
                const exists = await this.storageProvider.exists(id);
                if (!exists) {
                    throw new errors_1.NotFoundError(`Session with ID ${id} not found`);
                }
                // Get the session
                const session = await this.storageProvider.load(id);
                const participants = session.metadata.participants || [];
                res.json({
                    participants,
                    activeCount: participants.filter((p) => p.isActive).length,
                    totalCount: participants.length,
                });
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Get session messages
         */
        this.getSessionMessages = async (req, res, next) => {
            try {
                const { id } = req.params;
                // Check if session exists
                const exists = await this.storageProvider.exists(id);
                if (!exists) {
                    throw new errors_1.NotFoundError(`Session with ID ${id} not found`);
                }
                // Get the session
                const session = await this.storageProvider.load(id);
                const messages = session.metadata.messages || [];
                res.json({
                    messages,
                    count: messages.length,
                });
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Send a message to session
         */
        this.sendSessionMessage = async (req, res, next) => {
            try {
                const { id } = req.params;
                const { message, senderId, senderName } = req.body;
                if (!message || !senderId) {
                    throw new errors_1.BadRequestError('Message and senderId are required');
                }
                // Check if session exists
                const exists = await this.storageProvider.exists(id);
                if (!exists) {
                    throw new errors_1.NotFoundError(`Session with ID ${id} not found`);
                }
                // Get the session
                const session = await this.storageProvider.load(id);
                // Initialize messages array if it doesn't exist
                if (!session.metadata.messages) {
                    session.metadata.messages = [];
                }
                // Create the message
                const newMessage = {
                    id: (0, types_1.generateId)(),
                    senderId,
                    senderName: senderName || 'Unknown',
                    message,
                    timestamp: Date.now(),
                    type: 'message',
                };
                session.metadata.messages.push(newMessage);
                session.metadata.updatedAt = Date.now();
                // Save the session
                await this.storageProvider.save(session);
                // Broadcast the message to all connected clients
                (0, websockets_1.broadcastSessionEvent)(id, {
                    type: 'message',
                    message: newMessage,
                });
                res.status(201).json({
                    success: true,
                    message: newMessage,
                });
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Terminate a session
         */
        this.terminateSession = async (req, res, next) => {
            try {
                const { id } = req.params;
                // Check if session exists
                const exists = await this.storageProvider.exists(id);
                if (!exists) {
                    throw new errors_1.NotFoundError(`Session with ID ${id} not found`);
                }
                // Get the session
                const session = await this.storageProvider.load(id);
                // Update session status
                session.metadata.status = 'terminated';
                session.metadata.updatedAt = Date.now();
                // Deactivate all participants
                if (session.metadata.participants) {
                    session.metadata.participants.forEach((p) => {
                        p.isActive = false;
                    });
                }
                // Add termination message
                if (!session.metadata.messages) {
                    session.metadata.messages = [];
                }
                const terminationMessage = {
                    id: (0, types_1.generateId)(),
                    senderId: 'system',
                    senderName: 'System',
                    message: 'Session has been terminated',
                    timestamp: Date.now(),
                    type: 'system',
                };
                session.metadata.messages.push(terminationMessage);
                // Save the session
                await this.storageProvider.save(session);
                // Broadcast the termination to all connected clients
                (0, websockets_1.broadcastSessionUpdate)(id, {
                    type: 'session_terminated',
                    session: session.metadata,
                    message: terminationMessage,
                });
                res.json({
                    success: true,
                    message: 'Session terminated successfully',
                    session: session.metadata,
                });
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Export session data
         */
        this.exportSession = async (req, res, next) => {
            try {
                const { id } = req.params;
                const format = req.query.format || 'json';
                // Check if session exists
                const exists = await this.storageProvider.exists(id);
                if (!exists) {
                    throw new errors_1.NotFoundError(`Session with ID ${id} not found`);
                }
                // Get the session
                const session = await this.storageProvider.load(id);
                // Prepare export data
                const exportData = {
                    metadata: session.metadata,
                    state: session.state,
                    exportedAt: Date.now(),
                    exportFormat: format,
                };
                switch (format) {
                    case 'json':
                        res.setHeader('Content-Type', 'application/json');
                        res.setHeader('Content-Disposition', `attachment; filename="session-${id}.json"`);
                        res.json(exportData);
                        break;
                    case 'yaml':
                        // Simple YAML-like format for basic compatibility
                        const yamlContent = `
# PSP Session Export
# Session ID: ${id}
# Exported: ${new Date().toISOString()}

metadata:
  id: "${session.metadata.id}"
  name: "${session.metadata.name}"
  description: "${session.metadata.description || ''}"
  createdAt: ${session.metadata.createdAt}
  updatedAt: ${session.metadata.updatedAt}
  status: "${session.metadata.status || 'inactive'}"
  participants: ${JSON.stringify(session.metadata.participants || [], null, 2)}
  messages: ${JSON.stringify(session.metadata.messages || [], null, 2)}

state:
  version: "${session.state.version}"
  timestamp: ${session.state.timestamp}
  origin: "${session.state.origin}"
  # Storage and other state data...
          `.trim();
                        res.setHeader('Content-Type', 'application/x-yaml');
                        res.setHeader('Content-Disposition', `attachment; filename="session-${id}.yaml"`);
                        res.send(yamlContent);
                        break;
                    case 'csv':
                        // CSV format for metadata and basic info
                        const csvContent = [
                            'Field,Value',
                            `ID,${session.metadata.id}`,
                            `Name,"${session.metadata.name}"`,
                            `Description,"${session.metadata.description || ''}"`,
                            `Created,${new Date(session.metadata.createdAt).toISOString()}`,
                            `Updated,${new Date(session.metadata.updatedAt).toISOString()}`,
                            `Status,${session.metadata.status || 'inactive'}`,
                            `Participants,${session.metadata.participantCount || 0}`,
                            `Messages,${(session.metadata.messages || []).length}`,
                        ].join('\n');
                        res.setHeader('Content-Type', 'text/csv');
                        res.setHeader('Content-Disposition', `attachment; filename="session-${id}.csv"`);
                        res.send(csvContent);
                        break;
                    default:
                        throw new errors_1.BadRequestError(`Unsupported export format: ${format}`);
                }
            }
            catch (error) {
                next(error);
            }
        };
        this.storageProvider = storageProvider;
    }
}
exports.SessionController = SessionController;
