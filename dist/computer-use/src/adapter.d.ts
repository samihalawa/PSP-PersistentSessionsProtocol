import { Adapter, BrowserSessionState, AdapterOptions } from '@psp/core';
/**
 * Options for configuring the Computer-Use adapter
 */
export interface ComputerUseAdapterOptions extends AdapterOptions {
    /**
     * Custom options specific to Computer-Use
     */
    computerUseOptions?: {
        /**
         * Whether to include file system state in session capture
         */
        captureFileSystem?: boolean;
        /**
         * Specific directories to include when capturing filesystem state
         */
        fileSystemPaths?: string[];
        /**
         * Whether to include system state like environment variables
         */
        captureSystemState?: boolean;
    };
}
/**
 * Capture options for computer state
 */
export interface CaptureOptions {
    /**
     * Include file system state
     */
    includeFiles?: boolean;
    /**
     * Include system state (environment, etc.)
     */
    includeSystemState?: boolean;
    /**
     * Directory paths to include in file capture
     */
    filePaths?: string[];
}
/**
 * Adapter implementation for Computer-Use framework
 */
export declare class ComputerUseAdapter extends Adapter {
    private computer;
    private options;
    private browser;
    /**
     * Creates a new ComputerUseAdapter instance
     *
     * @param options Configuration options for the adapter
     */
    constructor(options?: ComputerUseAdapterOptions);
    /**
     * Connects the adapter to a Computer-Use computer instance
     *
     * @param computer The Computer-Use computer instance
     */
    connect(computer: any): Promise<void>;
    /**
     * Gets the active browser instance from the computer
     *
     * @returns The active browser instance or null if none is active
     */
    private getActiveBrowser;
    /**
     * Captures the current browser and computer state
     *
     * @param options Optional capture options
     * @returns The captured browser session state
     */
    captureState(options?: CaptureOptions): Promise<BrowserSessionState>;
    /**
     * Applies a previously captured browser state to the current computer
     *
     * @param state The browser session state to apply
     */
    applyState(state: BrowserSessionState): Promise<void>;
    /**
     * Captures file system state for specified paths
     *
     * @param paths Array of paths to capture
     * @returns Object representing file system state
     */
    private captureFileSystem;
    /**
     * Restores file system state from captured data
     *
     * @param fileSystem The file system state to restore
     */
    private restoreFileSystem;
    /**
     * Captures system state including environment variables
     *
     * @returns Object containing system state
     */
    private captureSystemState;
    /**
     * Restores system state from captured data
     *
     * @param systemState The system state to restore
     */
    private restoreSystemState;
    /**
     * Normalizes cookies to a common format
     *
     * @param cookies The cookies array from Computer-Use
     * @returns Normalized cookies array
     */
    private normalizeCookies;
    /**
     * Maps storage objects to the PSP storage format
     *
     * @param storageObj The storage object (localStorage or sessionStorage)
     * @param origin The origin for which the storage applies
     * @returns Mapped storage in PSP format
     */
    private mapStorage;
}
