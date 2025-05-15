import { 
  BrowserSessionState, 
  SessionMetadata,
  SessionOptions,
  RecordingOptions,
  PlaybackOptions 
} from './types';
import { StorageProvider } from './storage/provider';
import { LocalStorageProvider } from './storage/local';
import { generateId } from './utils/id';

/**
 * Core Session class that manages a browser session
 */
export class Session {
  /** Session metadata */
  private metadata: SessionMetadata;
  
  /** Current session state */
  private state: BrowserSessionState;
  
  /** Storage provider */
  private storageProvider: StorageProvider;

  /** Recording in progress */
  private isRecording: boolean = false;

  /** Adapter instance that created this session */
  private adapter: any;

  /**
   * Creates a new session instance
   */
  constructor(options: {
    metadata: SessionMetadata,
    state: BrowserSessionState,
    storageProvider?: StorageProvider,
    adapter?: any
  }) {
    this.metadata = options.metadata;
    this.state = options.state;
    this.storageProvider = options.storageProvider || new LocalStorageProvider();
    this.adapter = options.adapter;
  }

  /**
   * Creates a new session
   */
  static async create(options: SessionOptions, adapter?: any): Promise<Session> {
    const id = generateId();
    const now = Date.now();
    
    const metadata: SessionMetadata = {
      id,
      name: options.name,
      description: options.description,
      createdAt: now,
      updatedAt: now,
      tags: options.tags || [],
      createdWith: adapter?.type || 'unknown',
    };
    
    if (options.expireIn && options.expireIn > 0) {
      metadata.expireAt = now + (options.expireIn * 1000);
    }
    
    const state: BrowserSessionState = {
      version: '1.0.0',
      timestamp: now,
      origin: '',
      storage: {
        cookies: [],
        localStorage: new Map(),
        sessionStorage: new Map(),
      }
    };
    
    // Determine which storage provider to use
    let storageProvider: StorageProvider;
    switch (options.storage) {
      case 'redis':
        // TODO: Create Redis provider
        storageProvider = new LocalStorageProvider();
        break;
      case 'database':
        // TODO: Create Database provider
        storageProvider = new LocalStorageProvider();
        break;
      case 'cloud':
        // TODO: Create Cloud provider
        storageProvider = new LocalStorageProvider();
        break;
      case 'local':
      default:
        storageProvider = new LocalStorageProvider();
        break;
    }
    
    const session = new Session({
      metadata,
      state,
      storageProvider,
      adapter
    });
    
    // Initial save
    await session.save();
    
    return session;
  }
  
  /**
   * Loads an existing session from storage
   */
  static async load(id: string, storageProvider?: StorageProvider): Promise<Session> {
    const provider = storageProvider || new LocalStorageProvider();
    
    const { metadata, state } = await provider.load(id);
    
    return new Session({
      metadata,
      state,
      storageProvider: provider
    });
  }
  
  /**
   * Gets the session ID
   */
  getId(): string {
    return this.metadata.id;
  }
  
  /**
   * Gets session metadata
   */
  getMetadata(): SessionMetadata {
    return { ...this.metadata };
  }
  
  /**
   * Gets the current session state
   */
  getState(): BrowserSessionState {
    return { ...this.state };
  }
  
  /**
   * Updates session metadata
   */
  async updateMetadata(metadata: Partial<SessionMetadata>): Promise<void> {
    this.metadata = {
      ...this.metadata,
      ...metadata,
      updatedAt: Date.now()
    };
    
    await this.save();
  }
  
  /**
   * Captures the current browser state
   */
  async capture(target?: any): Promise<void> {
    if (!this.adapter && !target) {
      throw new Error('Either an adapter must be provided at creation time or a target must be provided to capture');
    }
    
    // Use the adapter to capture state
    if (target && this.adapter) {
      // Adapter is already connected to a target, but we're providing a new one
      if (this.adapter.connect) {
        await this.adapter.connect(target);
      }
    }
    
    if (this.adapter && this.adapter.captureState) {
      const newState = await this.adapter.captureState();
      this.state = {
        ...newState,
        timestamp: Date.now()
      };
    } else {
      throw new Error('No suitable adapter available to capture state');
    }
    
    // Update metadata
    this.metadata.updatedAt = Date.now();
    
    // Save the updated state
    await this.save();
  }
  
  /**
   * Restores this session to a browser instance
   */
  async restore(target: any): Promise<void> {
    if (!this.adapter && !target) {
      throw new Error('Either an adapter must be provided at creation time or a target must be provided to restore');
    }
    
    // Use the adapter to restore state
    if (target && this.adapter) {
      // Adapter is already connected to a target, but we're providing a new one
      if (this.adapter.connect) {
        await this.adapter.connect(target);
      }
    }
    
    if (this.adapter && this.adapter.applyState) {
      await this.adapter.applyState(this.state);
    } else {
      throw new Error('No suitable adapter available to restore state');
    }
  }
  
  /**
   * Starts recording user interactions
   */
  async startRecording(options?: RecordingOptions): Promise<void> {
    if (!this.adapter || !this.adapter.startRecording) {
      throw new Error('Adapter does not support recording');
    }
    
    await this.adapter.startRecording(options);
    this.isRecording = true;
  }
  
  /**
   * Stops recording and saves the recorded events
   */
  async stopRecording(): Promise<void> {
    if (!this.isRecording || !this.adapter || !this.adapter.stopRecording) {
      throw new Error('Recording is not in progress or adapter does not support recording');
    }
    
    const events = await this.adapter.stopRecording();
    
    // Update the state with recorded events
    this.state.recording = {
      events,
      startTime: Date.now() - (events.length > 0 ? events[events.length - 1].timestamp : 0),
      duration: events.length > 0 ? events[events.length - 1].timestamp : 0
    };
    
    this.isRecording = false;
    
    // Save the updated state
    await this.save();
  }
  
  /**
   * Plays back recorded events
   */
  async playRecording(target: any, options?: PlaybackOptions): Promise<void> {
    if (!this.state.recording || !this.state.recording.events.length) {
      throw new Error('No recorded events available to play');
    }
    
    if (!this.adapter && !target) {
      throw new Error('Either an adapter must be provided at creation time or a target must be provided to play recording');
    }
    
    // Use the adapter to play recording
    if (target && this.adapter) {
      // Adapter is already connected to a target, but we're providing a new one
      if (this.adapter.connect) {
        await this.adapter.connect(target);
      }
    }
    
    if (this.adapter && this.adapter.playRecording) {
      await this.adapter.playRecording(this.state.recording.events, options);
    } else {
      throw new Error('No suitable adapter available to play recording');
    }
  }
  
  /**
   * Saves the current session to storage
   */
  async save(): Promise<void> {
    await this.storageProvider.save({
      metadata: this.metadata,
      state: this.state
    });
  }
  
  /**
   * Deletes this session from storage
   */
  async delete(): Promise<void> {
    await this.storageProvider.delete(this.metadata.id);
  }
  
  /**
   * Creates a clone of this session with a new ID
   */
  async clone(newName?: string): Promise<Session> {
    const newId = generateId();
    const now = Date.now();
    
    const newMetadata: SessionMetadata = {
      ...this.metadata,
      id: newId,
      name: newName || `${this.metadata.name} (Clone)`,
      createdAt: now,
      updatedAt: now,
    };
    
    // Create new session with cloned data
    const session = new Session({
      metadata: newMetadata,
      state: { ...this.state, timestamp: now },
      storageProvider: this.storageProvider,
      adapter: this.adapter
    });
    
    // Save the new session
    await session.save();
    
    return session;
  }
}