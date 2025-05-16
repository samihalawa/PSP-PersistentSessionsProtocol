import { Adapter, BrowserSessionState, AdapterOptions } from '@psp/core';
/**
 * Options for configuring the Browser-Use adapter
 */
export interface BrowserUseAdapterOptions extends AdapterOptions {
    /**
     * Custom options specific to Browser-Use
     */
    browserUseOptions?: {
        /**
         * Whether to include viewport state in session capture
         */
        captureViewport?: boolean;
        /**
         * Additional script to run during state capture
         */
        customCaptureScript?: string;
    };
}
/**
 * Adapter implementation for Browser-Use framework
 */
export declare class BrowserUseAdapter extends Adapter {
    private browser;
    private options;
    /**
     * Creates a new BrowserUseAdapter instance
     *
     * @param options Configuration options for the adapter
     */
    constructor(options?: BrowserUseAdapterOptions);
    /**
     * Connects the adapter to a Browser-Use browser instance
     *
     * @param browser The Browser-Use browser instance
     */
    connect(browser: any): Promise<void>;
    /**
     * Captures the current browser state
     *
     * @returns The captured browser session state
     */
    captureState(): Promise<BrowserSessionState>;
    /**
     * Applies a previously captured browser state to the current browser
     *
     * @param state The browser session state to apply
     */
    applyState(state: BrowserSessionState): Promise<void>;
    /**
     * Normalizes cookies to a common format
     *
     * @param cookies The cookies array from Browser-Use
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
