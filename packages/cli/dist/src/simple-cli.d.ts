#!/usr/bin/env node
/**
 * Simple session management using Chrome profiles
 */
declare class CliSession {
    private metadata;
    private userDataDir;
    constructor(metadata: any, userDataDir: string);
    getId(): string;
    getMetadata(): any;
    getUserDataDir(): string;
    save(): Promise<void>;
    static load(sessionId: string): Promise<CliSession>;
    static create(name: string, userDataDir?: string): Promise<CliSession>;
    static list(): Promise<CliSession[]>;
}
export { CliSession };
