import { Page, BrowserContext } from 'playwright';
import { Adapter, BrowserSessionState, Event, RecordingOptions, PlaybackOptions } from '@psp/core';
/**
 * Adapter for Playwright
 */
export declare class PlaywrightAdapter extends Adapter {
    /** The Playwright page */
    private page?;
    /** The Playwright browser context */
    private context?;
    /** Recording in progress */
    private recording;
    /** Events recorded */
    private events;
    /** Recording start time */
    private recordingStartTime;
    /**
     * Creates a new PlaywrightAdapter
     */
    constructor(options?: any);
    /**
     * Connects to a Playwright page or context
     */
    connect(target: Page | BrowserContext): Promise<void>;
    /**
     * Captures the current browser state
     */
    captureState(): Promise<BrowserSessionState>;
    /**
     * Applies a browser state to the current page
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
     * Polls for new events from the page
     */
    private pollEvents;
    /**
     * Gets the session storage from the page
     */
    private getSessionStorage;
    /**
     * Converts Playwright storage format to PSP format
     */
    private convertPlaywrightStorageToMap;
}
