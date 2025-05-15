import { 
  BrowserSessionState,
  SessionOptions,
  Event,
  RecordingOptions,
  PlaybackOptions
} from './types';
import { Session } from './session';
import { StorageProvider } from './storage/provider';
import { LocalStorageProvider } from './storage/local';

/**
 * Base adapter class that framework-specific adapters should extend
 */
export abstract class Adapter {
  /** The adapter type name */
  readonly type: string;
  
  /** Options used for this adapter */
  protected options: Record<string, any>;
  
  /** Storage provider */
  protected storageProvider: StorageProvider;
  
  /** Connected browser target */
  protected target: any;
  
  /**
   * Creates a new adapter
   */
  constructor(options: {
    type: string;
    storageProvider?: StorageProvider;
    [key: string]: any;
  }) {
    this.type = options.type;
    this.options = { ...options };
    this.storageProvider = options.storageProvider || new LocalStorageProvider();
  }
  
  /**
   * Connects to a browser instance
   */
  async connect(target: any): Promise<void> {
    this.target = target;
  }
  
  /**
   * Creates a new session
   */
  async createSession(target: any, options: SessionOptions): Promise<Session> {
    // Connect to the target if needed
    if (target && (!this.target || this.target !== target)) {
      await this.connect(target);
    }
    
    // Create the session
    const session = await Session.create(options, this);
    
    return session;
  }
  
  /**
   * Loads an existing session
   */
  async loadSession(id: string): Promise<Session> {
    return await Session.load(id, this.storageProvider);
  }
  
  /**
   * Lists available sessions
   */
  async listSessions(filter?: any): Promise<any[]> {
    return await this.storageProvider.list(filter);
  }
  
  /**
   * Extracts state from the browser
   */
  abstract captureState(): Promise<BrowserSessionState>;
  
  /**
   * Applies state to the browser
   */
  abstract applyState(state: BrowserSessionState): Promise<void>;
  
  /**
   * Starts recording user interactions
   */
  abstract startRecording(options?: RecordingOptions): Promise<void>;
  
  /**
   * Stops recording and returns the recorded events
   */
  abstract stopRecording(): Promise<Event[]>;
  
  /**
   * Plays back recorded events
   */
  abstract playRecording(events: Event[], options?: PlaybackOptions): Promise<void>;
}