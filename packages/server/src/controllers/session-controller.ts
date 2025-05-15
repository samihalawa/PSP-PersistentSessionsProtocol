import { Request, Response, NextFunction } from 'express';
import { StorageProvider, SessionFilter, Event, generateId } from '@psp/core';
import { createLogger } from '../utils/logger';
import { BadRequestError, NotFoundError } from '../utils/errors';

/**
 * Controller for session-related endpoints
 */
export class SessionController {
  private storageProvider: StorageProvider;
  private logger = createLogger('session-controller');
  
  constructor(storageProvider: StorageProvider) {
    this.storageProvider = storageProvider;
  }
  
  /**
   * List sessions
   */
  listSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Build filter from query parameters
      const filter: SessionFilter = {};
      
      if (req.query.name) {
        filter.name = req.query.name as string;
      }
      
      if (req.query.tags) {
        filter.tags = Array.isArray(req.query.tags) 
          ? req.query.tags as string[]
          : [req.query.tags as string];
      }
      
      if (req.query.limit) {
        filter.limit = parseInt(req.query.limit as string, 10);
      }
      
      if (req.query.offset) {
        filter.offset = parseInt(req.query.offset as string, 10);
      }
      
      // Get sessions from storage
      const sessions = await this.storageProvider.list(filter);
      
      res.json(sessions);
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Get a session by ID
   */
  getSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      
      // Check if session exists
      const exists = await this.storageProvider.exists(id);
      if (!exists) {
        throw new NotFoundError(`Session with ID ${id} not found`);
      }
      
      // Get session from storage
      const session = await this.storageProvider.load(id);
      
      res.json(session);
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Create a new session
   */
  createSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, description, tags, state } = req.body;
      
      // Generate a new session ID
      const id = generateId();
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
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Update a session
   */
  updateSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { metadata, state } = req.body;
      
      // Check if session exists
      const exists = await this.storageProvider.exists(id);
      if (!exists) {
        throw new NotFoundError(`Session with ID ${id} not found`);
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
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Partially update a session
   */
  patchSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { metadata, state } = req.body;
      
      // Check if session exists
      const exists = await this.storageProvider.exists(id);
      if (!exists) {
        throw new NotFoundError(`Session with ID ${id} not found`);
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
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Delete a session
   */
  deleteSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      
      // Check if session exists
      const exists = await this.storageProvider.exists(id);
      if (!exists) {
        throw new NotFoundError(`Session with ID ${id} not found`);
      }
      
      // Delete the session
      await this.storageProvider.delete(id);
      
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Get session events
   */
  getSessionEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      
      // Check if session exists
      const exists = await this.storageProvider.exists(id);
      if (!exists) {
        throw new NotFoundError(`Session with ID ${id} not found`);
      }
      
      // Get the session
      const session = await this.storageProvider.load(id);
      
      // Get events
      const events = session.state.recording?.events || [];
      
      res.json(events);
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Add events to a session
   */
  addSessionEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const events: Event[] = req.body;
      
      if (!Array.isArray(events)) {
        throw new BadRequestError('Events must be an array');
      }
      
      // Check if session exists
      const exists = await this.storageProvider.exists(id);
      if (!exists) {
        throw new NotFoundError(`Session with ID ${id} not found`);
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
    } catch (error) {
      next(error);
    }
  };
}