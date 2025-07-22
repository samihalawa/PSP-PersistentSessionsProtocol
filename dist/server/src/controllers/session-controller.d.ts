import { Request, Response, NextFunction } from 'express';
import { StorageProvider } from '../../../dist/core/src';
/**
 * Controller for session-related endpoints
 */
export declare class SessionController {
    private storageProvider;
    private logger;
    constructor(storageProvider: StorageProvider);
    /**
     * List sessions
     */
    listSessions: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Get a session by ID
     */
    getSession: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Create a new session
     */
    createSession: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Update a session
     */
    updateSession: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Partially update a session
     */
    patchSession: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Delete a session
     */
    deleteSession: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Get session events
     */
    getSessionEvents: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Add events to a session
     */
    addSessionEvents: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Join a session
     */
    joinSession: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Get session participants
     */
    getSessionParticipants: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Get session messages
     */
    getSessionMessages: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Send a message to session
     */
    sendSessionMessage: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Terminate a session
     */
    terminateSession: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Export session data
     */
    exportSession: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
