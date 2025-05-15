import { BrowserSessionState, SessionMetadata, SessionFilter } from '../types';

/**
 * Interface for session data that is stored
 */
export interface StoredSession {
  metadata: SessionMetadata;
  state: BrowserSessionState;
}

/**
 * Interface for session storage providers
 */
export interface StorageProvider {
  /**
   * Save a session to storage
   */
  save(session: StoredSession): Promise<void>;
  
  /**
   * Load a session from storage by ID
   */
  load(id: string): Promise<StoredSession>;
  
  /**
   * Delete a session from storage
   */
  delete(id: string): Promise<void>;
  
  /**
   * List sessions matching the filter
   */
  list(filter?: SessionFilter): Promise<SessionMetadata[]>;
  
  /**
   * Check if a session exists
   */
  exists(id: string): Promise<boolean>;
}