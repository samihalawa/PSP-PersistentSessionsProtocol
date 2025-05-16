import { Adapter, BrowserSessionState, AdapterOptions, Event, RecordingOptions, PlaybackOptions } from '@psp/core';
/**
 * Options for configuring the Puppeteer adapter
 */
export interface PuppeteerAdapterOptions extends AdapterOptions {
    /**
     * Whether to use Chrome DevTools Protocol for advanced features
     */
    useCDP?: boolean;
    /**
     * Existing CDP client to use
     */
    cdpClient?: any;
}
/**
 * Adapter implementation for Puppeteer framework
 */
export declare class PuppeteerAdapter extends Adapter {
    private page;
    private options;
    private cdpClient;
    /**
     * Creates a new PuppeteerAdapter instance
     *
     * @param options Configuration options for the adapter
     */
    constructor(options?: PuppeteerAdapterOptions);
    /**
     * Connects the adapter to a Puppeteer page instance
     *
     * @param page The Puppeteer page instance
     */
    connect(page: any): Promise<void>;
    /**
     * Captures the current browser state
     *
     * @returns The captured browser session state
     */
    captureState(): Promise<BrowserSessionState>;
    /**
     * Applies a previously captured browser state to the current page
     *
     * @param state The browser session state to apply
     */
    applyState(state: BrowserSessionState): Promise<void>;
    /**
     * Starts recording user interactions
     *
     * @param options Optional recording options
     */
    startRecording(options?: RecordingOptions): Promise<void>;
    /**
     * Stops recording and returns the recorded events
     *
     * @returns The recorded events
     */
    stopRecording(): Promise<Event[]>;
    /**
     * Plays back recorded events
     *
     * @param events The events to play back
     * @param options Optional playback options
     */
    playRecording(events: Event[], options?: PlaybackOptions): Promise<void>;
    /**
     * Extracts target information from a target object or string
     *
     * @param target The target object or string
     * @returns Extracted target information
     */
    private extractTargetInfo;
    /**
     * Normalizes cookies to a common format
     *
     * @param cookies The cookies array from Puppeteer
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
