import { Adapter, BrowserSessionState, AdapterOptions, Event, RecordingOptions, PlaybackOptions } from '@psp/core';
/**
 * Options for configuring the Stagehand adapter
 */
export interface StagehandAdapterOptions extends AdapterOptions {
    /**
     * Custom options specific to Stagehand
     */
    stagehandOptions?: {
        /**
         * Whether to include selector strategy in session capture
         */
        captureSelectors?: boolean;
        /**
         * Whether to include form state in session capture
         */
        captureFormState?: boolean;
    };
}
/**
 * Adapter implementation for Stagehand framework
 */
export declare class StagehandAdapter extends Adapter {
    private stagehand;
    private options;
    private recordingObserver;
    /**
     * Creates a new StagehandAdapter instance
     *
     * @param options Configuration options for the adapter
     */
    constructor(options?: StagehandAdapterOptions);
    /**
     * Connects the adapter to a Stagehand instance
     *
     * @param stagehand The Stagehand instance
     */
    connect(stagehand: any): Promise<void>;
    /**
     * Captures the current browser state
     *
     * @returns The captured browser session state
     */
    captureState(): Promise<BrowserSessionState>;
    /**
     * Applies a previously captured browser state to the current Stagehand instance
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
     * Converts a Stagehand target to PSP format
     *
     * @param target The Stagehand target
     * @returns PSP format target
     */
    private convertStagehandTarget;
    /**
     * Normalizes cookies to a common format
     *
     * @param cookies The cookies array from Stagehand
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
