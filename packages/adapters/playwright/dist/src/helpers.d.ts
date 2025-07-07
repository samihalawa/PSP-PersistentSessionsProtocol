import { BrowserContext } from 'playwright';
interface SessionMetadata {
    id: string;
    name: string;
    description?: string;
    createdAt: number;
    updatedAt: number;
}
interface Session {
    getId(): string;
    getMetadata(): SessionMetadata;
    capture(context: BrowserContext): Promise<void>;
    restore(context: BrowserContext): Promise<void>;
    save(): Promise<void>;
    delete(): Promise<void>;
}
declare class SimpleSession implements Session {
    private metadata;
    private userDataDir;
    constructor(metadata: SessionMetadata, userDataDir: string);
    getId(): string;
    getMetadata(): SessionMetadata;
    capture(context: BrowserContext): Promise<void>;
    restore(context: BrowserContext): Promise<void>;
    save(): Promise<void>;
    delete(): Promise<void>;
    static load(sessionId: string): Promise<SimpleSession>;
    static create(options: {
        name: string;
        description?: string;
        userDataDir?: string;
    }): Promise<SimpleSession>;
    getUserDataDir(): string;
}
/**
 * Helper to launch Playwright with real Chrome profile persistence
 */
export declare function launchWithPSP(sessionId?: string, options?: {
    headless?: boolean;
    userDataDir?: string;
    sessionName?: string;
}): Promise<{
    context: BrowserContext;
    session: SimpleSession;
}>;
/**
 * Capture current session from an existing Chrome profile
 */
export declare function captureSession(userDataDir: string, sessionName?: string): Promise<string>;
/**
 * Import current Chrome session from running Chrome instance
 */
export declare function importCurrentChromeSession(sessionName?: string): Promise<string>;
/**
 * List all available sessions
 */
export declare function listSessions(): Promise<SimpleSession[]>;
/**
 * Simple demo function using real Chrome profiles
 */
export declare function demo(): Promise<void>;
export {};
