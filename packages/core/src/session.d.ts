import { BrowserSessionState, SessionMetadata, SessionOptions, RecordingOptions, PlaybackOptions } from './types';
import { StorageProvider } from './storage/provider';
/**
 * Core Session class that manages a browser session
 */
export declare class Session {
    /** Session metadata */
    private metadata;
    /** Current session state */
    private state;
    /** Storage provider */
    private storageProvider;
    /** Recording in progress */
    private isRecording;
    /** Adapter instance that created this session */
    private adapter;
    /**
     * Creates a new session instance
     */
    constructor(options: {
        metadata: SessionMetadata;
        state: BrowserSessionState;
        storageProvider?: StorageProvider;
        adapter?: any;
    });
    /**
     * Creates a new session
     */
    static create(options: SessionOptions, adapter?: any): Promise<Session>;
    /**
     * Loads an existing session from storage
     */
    static load(id: string, storageProvider?: StorageProvider): Promise<Session>;
    /**
     * Gets the session ID
     */
    getId(): string;
    /**
     * Gets session metadata
     */
    getMetadata(): SessionMetadata;
    /**
     * Gets the current session state
     */
    getState(): BrowserSessionState;
    /**
     * Updates session metadata
     */
    updateMetadata(metadata: Partial<SessionMetadata>): Promise<void>;
    /**
     * Captures the current browser state
     */
    capture(target?: any): Promise<void>;
    /**
     * Restores this session to a browser instance
     */
    restore(target: any): Promise<void>;
    /**
     * Starts recording user interactions
     */
    startRecording(options?: RecordingOptions): Promise<void>;
    /**
     * Stops recording and saves the recorded events
     */
    stopRecording(): Promise<void>;
    /**
     * Plays back recorded events
     */
    playRecording(target: any, options?: PlaybackOptions): Promise<void>;
    /**
     * Saves the current session to storage
     */
    save(): Promise<void>;
    /**
     * Deletes this session from storage
     */
    delete(): Promise<void>;
    /**
     * Creates a clone of this session with a new ID
     */
    clone(newName?: string): Promise<Session>;
}
//# sourceMappingURL=session.d.ts.map