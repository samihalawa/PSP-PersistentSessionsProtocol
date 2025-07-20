import { BrowserSessionState, SessionOptions, Event, RecordingOptions, PlaybackOptions } from './types';
import { Session } from './session';
import { StorageProvider } from './storage/provider';
/**
 * Base adapter class that framework-specific adapters should extend
 */
export declare abstract class Adapter {
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
    });
    /**
     * Connects to a browser instance
     */
    connect(target: any): Promise<void>;
    /**
     * Creates a new session
     */
    createSession(target: any, options: SessionOptions): Promise<Session>;
    /**
     * Loads an existing session
     */
    loadSession(id: string): Promise<Session>;
    /**
     * Lists available sessions
     */
    listSessions(filter?: any): Promise<any[]>;
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
