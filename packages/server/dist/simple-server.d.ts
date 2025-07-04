/**
 * Simple session management for server
 */
declare class ServerSession {
    private metadata;
    private userDataDir;
    constructor(metadata: any, userDataDir: string);
    getId(): string;
    getMetadata(): any;
    getUserDataDir(): string;
    toJSON(): any;
    save(): Promise<void>;
    static load(sessionId: string): Promise<ServerSession>;
    static create(name: string, userDataDir?: string): Promise<ServerSession>;
    static list(): Promise<ServerSession[]>;
    delete(): Promise<void>;
}
export { ServerSession };
