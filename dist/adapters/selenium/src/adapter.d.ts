import { WebDriver } from 'selenium-webdriver';
import { Adapter, BrowserSessionState, Event, RecordingOptions, PlaybackOptions } from '@psp/core';
declare global {
    interface Window {
        _pspEvents?: Event[];
        _pspStartTime?: number;
        _pspGetEvents?: () => Event[];
    }
}
/**
 * Adapter for Selenium WebDriver
 */
export declare class SeleniumAdapter extends Adapter {
    /** The WebDriver instance */
    private driver?;
    /** Recording in progress */
    private recording;
    /** Events recorded */
    private events;
    /** Recording start time */
    private recordingStartTime;
    /** Recording interval ID */
    private recordingInterval?;
    /**
     * Creates a new SeleniumAdapter
     */
    constructor(options?: any);
    /**
     * Connects to a WebDriver instance
     */
    connect(driver: WebDriver): Promise<void>;
    /**
     * Captures the current browser state
     */
    captureState(): Promise<BrowserSessionState>;
    /**
     * Applies a browser state to the current WebDriver
     */
    applyState(state: BrowserSessionState): Promise<void>;
    /**
     * Starts recording user interactions
     */
    startRecording(options?: RecordingOptions): Promise<void>;
    /**
     * Stops recording and returns the recorded events
     */
    stopRecording(): Promise<Event[]>;
    /**
     * Plays back recorded events
     */
    playRecording(events: Event[], options?: PlaybackOptions): Promise<void>;
    /**
     * Plays a click event
     */
    private playClickEvent;
    /**
     * Plays an input event
     */
    private playInputEvent;
    /**
     * Plays a key event
     */
    private playKeyEvent;
    /**
     * Plays a navigation event
     */
    private playNavigationEvent;
    /**
     * Plays a scroll event
     */
    private playScrollEvent;
    /**
     * Starts polling for events during recording
     */
    private startEventPolling;
    /**
     * Polls for new events from the WebDriver
     */
    private pollEvents;
    /**
     * Converts plain object storage to Maps
     */
    private convertStorageToMap;
}
