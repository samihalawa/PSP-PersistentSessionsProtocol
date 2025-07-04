import { BrowserContext } from 'playwright';
import { Adapter, BrowserSessionState, Event, RecordingOptions, PlaybackOptions } from '@psp/core';
/**
 * Simple Playwright Adapter for PSP v0.1
 * Uses launchPersistentContext for real Chrome profile persistence
 */
export declare class SimplePlaywrightAdapter extends Adapter {
    private context?;
    constructor(options?: any);
    connect(target: BrowserContext): Promise<void>;
    captureState(): Promise<BrowserSessionState>;
    applyState(state: BrowserSessionState): Promise<void>;
    startRecording(options?: RecordingOptions): Promise<void>;
    stopRecording(): Promise<Event[]>;
    playRecording(events: Event[], options?: PlaybackOptions): Promise<void>;
}
/**
 * Session class that uses Chrome profiles
 */
export declare class ChromeProfileSession {
    private metadata;
    private userDataDir;
    constructor(metadata: any, userDataDir: string);
    getId(): string;
    getMetadata(): any;
    getUserDataDir(): string;
    save(): Promise<void>;
    static load(sessionId: string): Promise<ChromeProfileSession>;
    static create(options: {
        name: string;
        description?: string;
        userDataDir?: string;
    }): Promise<ChromeProfileSession>;
}
/**
 * Launch with Chrome profile persistence
 */
export declare function launchWithChromeProfile(sessionId?: string, options?: {
    headless?: boolean;
    userDataDir?: string;
    sessionName?: string;
}): Promise<{
    context: BrowserContext;
    session: ChromeProfileSession;
}>;
