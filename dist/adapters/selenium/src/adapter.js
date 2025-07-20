"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeleniumAdapter = void 0;
const core_1 = require("@psp/core");
/**
 * Adapter for Selenium WebDriver
 */
class SeleniumAdapter extends core_1.Adapter {
    /**
     * Creates a new SeleniumAdapter
     */
    constructor(options = {}) {
        super({
            ...options,
            type: 'selenium',
        });
        /** Recording in progress */
        this.recording = false;
        /** Events recorded */
        this.events = [];
        /** Recording start time */
        this.recordingStartTime = 0;
    }
    /**
     * Connects to a WebDriver instance
     */
    async connect(driver) {
        this.driver = driver;
        await super.connect(driver);
    }
    /**
     * Captures the current browser state
     */
    async captureState() {
        if (!this.driver) {
            throw new Error('Not connected to a WebDriver');
        }
        // Get current URL and title
        const url = await this.driver.getCurrentUrl();
        const title = await this.driver.getTitle();
        const origin = new URL(url).origin;
        // Get cookies
        const cookies = await this.driver.manage().getCookies();
        // Get localStorage and sessionStorage
        const storage = (await this.driver.executeScript(() => {
            // Extract localStorage
            const localStorage = {};
            for (let i = 0; i < window.localStorage.length; i++) {
                const key = window.localStorage.key(i);
                if (key) {
                    localStorage[key] = window.localStorage.getItem(key) || '';
                }
            }
            // Extract sessionStorage
            const sessionStorage = {};
            for (let i = 0; i < window.sessionStorage.length; i++) {
                const key = window.sessionStorage.key(i);
                if (key) {
                    sessionStorage[key] = window.sessionStorage.getItem(key) || '';
                }
            }
            return { localStorage, sessionStorage };
        }));
        // Get scroll position
        const scrollPosition = await this.driver.executeScript(() => ({
            x: window.scrollX,
            y: window.scrollY,
        }));
        // Get HTML content
        const html = await this.driver.executeScript(() => document.documentElement.outerHTML);
        // Build the full state object
        const state = {
            version: '1.0.0',
            timestamp: Date.now(),
            origin,
            storage: {
                cookies: cookies.map((cookie) => ({
                    name: cookie.name,
                    value: cookie.value,
                    domain: cookie.domain || '',
                    path: cookie.path || '/',
                    expires: cookie.expiry ? cookie.expiry.getTime() : null,
                    httpOnly: cookie.httpOnly || false,
                    secure: cookie.secure || false,
                    sameSite: 'Lax', // Selenium doesn't expose SameSite
                    partitioned: false, // Selenium doesn't support partitioned cookies
                })),
                localStorage: this.convertStorageToMap(storage.localStorage, origin),
                sessionStorage: this.convertStorageToMap(storage.sessionStorage, origin),
            },
            dom: {
                html: html,
                scrollPosition: scrollPosition,
            },
            history: {
                currentUrl: url,
                entries: [
                    {
                        url,
                        title,
                        timestamp: Date.now(),
                        scrollPosition: scrollPosition,
                    },
                ],
                currentIndex: 0,
            },
        };
        // Add recording if available
        if (this.recording && this.events.length > 0) {
            state.recording = {
                events: [...this.events],
                startTime: this.recordingStartTime,
                duration: Date.now() - this.recordingStartTime,
            };
        }
        return state;
    }
    /**
     * Applies a browser state to the current WebDriver
     */
    async applyState(state) {
        if (!this.driver) {
            throw new Error('Not connected to a WebDriver');
        }
        // Navigate to the URL
        if (state.history?.currentUrl) {
            await this.driver.get(state.history.currentUrl);
        }
        // Apply cookies
        await this.driver.manage().deleteAllCookies();
        for (const cookie of state.storage.cookies) {
            await this.driver.manage().addCookie({
                name: cookie.name,
                value: cookie.value,
                domain: cookie.domain,
                path: cookie.path,
                expiry: cookie.expires ? new Date(cookie.expires) : undefined,
                httpOnly: cookie.httpOnly,
                secure: cookie.secure,
            });
        }
        // Apply localStorage and sessionStorage
        const origin = new URL(await this.driver.getCurrentUrl()).origin;
        const localStorage = state.storage.localStorage.get(origin);
        const sessionStorage = state.storage.sessionStorage.get(origin);
        await this.driver.executeScript((ls, ss) => {
            // Apply localStorage
            if (ls && window.localStorage) {
                window.localStorage.clear();
                for (const [key, value] of Object.entries(ls)) {
                    window.localStorage.setItem(key, String(value));
                }
            }
            // Apply sessionStorage
            if (ss && window.sessionStorage) {
                window.sessionStorage.clear();
                for (const [key, value] of Object.entries(ss)) {
                    window.sessionStorage.setItem(key, String(value));
                }
            }
        }, localStorage ? Object.fromEntries(localStorage) : null, sessionStorage ? Object.fromEntries(sessionStorage) : null);
        // Apply scroll position if available
        if (state.dom?.scrollPosition) {
            await this.driver.executeScript((pos) => {
                window.scrollTo(pos.x, pos.y);
            }, state.dom.scrollPosition);
        }
        // Refresh the page to ensure all state is applied
        await this.driver.navigate().refresh();
    }
    /**
     * Starts recording user interactions
     */
    async startRecording(options) {
        if (!this.driver) {
            throw new Error('Not connected to a WebDriver');
        }
        // Reset recording state
        this.events = [];
        this.recordingStartTime = Date.now();
        this.recording = true;
        // Determine which events to record
        const recordOptions = {
            click: true,
            input: true,
            keypress: true,
            navigation: true,
            scroll: false,
            network: false,
            ...options?.events,
        };
        // Install event listeners via executeScript
        await this.driver.executeScript((opts) => {
            // Create global storage for events
            window._pspEvents = [];
            window._pspStartTime = Date.now();
            // Create a function to retrieve events later
            window._pspGetEvents = function () {
                const events = window._pspEvents || [];
                window._pspEvents = [];
                return events;
            };
            // Helper function to generate a CSS selector for an element
            function cssPath(el) {
                if (!el || !el.tagName)
                    return '';
                const path = [];
                while (el.nodeType === Node.ELEMENT_NODE) {
                    let selector = el.nodeName.toLowerCase();
                    if (el.id) {
                        selector += `#${el.id}`;
                        path.unshift(selector);
                        break;
                    }
                    else {
                        const siblings = Array.from(el.parentNode.children);
                        if (siblings.length > 1) {
                            const index = siblings.indexOf(el);
                            selector += `:nth-child(${index + 1})`;
                        }
                        path.unshift(selector);
                        el = el.parentNode;
                    }
                }
                return path.join(' > ');
            }
            // Record click events
            if (opts.click) {
                document.addEventListener('click', (e) => {
                    window._pspEvents?.push({
                        type: 'click',
                        timestamp: Date.now() - (window._pspStartTime || 0),
                        target: cssPath(e.target),
                        data: {
                            button: e.button,
                            clientX: e.clientX,
                            clientY: e.clientY,
                            altKey: e.altKey,
                            ctrlKey: e.ctrlKey,
                            shiftKey: e.shiftKey,
                            metaKey: e.metaKey,
                        },
                    });
                }, true);
            }
            // Record input events
            if (opts.input) {
                document.addEventListener('input', (e) => {
                    if (e.target instanceof HTMLInputElement ||
                        e.target instanceof HTMLTextAreaElement ||
                        e.target instanceof HTMLSelectElement) {
                        window._pspEvents?.push({
                            type: 'input',
                            timestamp: Date.now() - (window._pspStartTime || 0),
                            target: cssPath(e.target),
                            data: {
                                value: e.target.value,
                            },
                        });
                    }
                }, true);
            }
            // Record keypress events
            if (opts.keypress) {
                document.addEventListener('keydown', (e) => {
                    window._pspEvents?.push({
                        type: 'keydown',
                        timestamp: Date.now() - (window._pspStartTime || 0),
                        target: cssPath(e.target),
                        data: {
                            key: e.key,
                            code: e.code,
                            altKey: e.altKey,
                            ctrlKey: e.ctrlKey,
                            shiftKey: e.shiftKey,
                            metaKey: e.metaKey,
                        },
                    });
                }, true);
            }
            // Record navigation events
            if (opts.navigation) {
                // Record via history API hooks
                const originalPushState = history.pushState;
                const originalReplaceState = history.replaceState;
                history.pushState = function (...args) {
                    window._pspEvents?.push({
                        type: 'navigation',
                        timestamp: Date.now() - (window._pspStartTime || 0),
                        data: {
                            url: args[2],
                            navigationType: 'navigate',
                        },
                    });
                    return originalPushState.apply(this, args);
                };
                history.replaceState = function (...args) {
                    window._pspEvents?.push({
                        type: 'navigation',
                        timestamp: Date.now() - (window._pspStartTime || 0),
                        data: {
                            url: args[2],
                            navigationType: 'navigate',
                        },
                    });
                    return originalReplaceState.apply(this, args);
                };
                window.addEventListener('popstate', () => {
                    window._pspEvents?.push({
                        type: 'navigation',
                        timestamp: Date.now() - (window._pspStartTime || 0),
                        data: {
                            url: window.location.href,
                            navigationType: 'back_forward',
                        },
                    });
                });
            }
            // Record scroll events
            if (opts.scroll) {
                let scrollTimeout;
                window.addEventListener('scroll', () => {
                    if (scrollTimeout) {
                        clearTimeout(scrollTimeout);
                    }
                    scrollTimeout = setTimeout(() => {
                        window._pspEvents?.push({
                            type: 'scroll',
                            timestamp: Date.now() - (window._pspStartTime || 0),
                            data: {
                                x: window.scrollX,
                                y: window.scrollY,
                            },
                        });
                    }, 100); // Debounce scroll events
                }, true);
            }
            return true;
        }, recordOptions);
        // Set up a polling interval to collect events
        this.startEventPolling();
    }
    /**
     * Stops recording and returns the recorded events
     */
    async stopRecording() {
        if (!this.driver || !this.recording) {
            throw new Error('Recording is not in progress');
        }
        // Stop the polling interval
        if (this.recordingInterval) {
            clearInterval(this.recordingInterval);
            this.recordingInterval = undefined;
        }
        // Get final events
        await this.pollEvents();
        // Clean up event listeners
        await this.driver.executeScript(() => {
            // Clear event storage
            window._pspEvents = [];
            window._pspGetEvents = undefined;
            window._pspStartTime = undefined;
        });
        // Stop recording
        this.recording = false;
        // Return collected events
        return [...this.events];
    }
    /**
     * Plays back recorded events
     */
    async playRecording(events, options) {
        if (!this.driver) {
            throw new Error('Not connected to a WebDriver');
        }
        const playbackOptions = {
            speed: 1.0,
            validateTargets: true,
            actionTimeout: 30000,
            ...options,
        };
        // Play each event sequentially
        for (const event of events) {
            try {
                switch (event.type) {
                    case 'click':
                        await this.playClickEvent(event, playbackOptions);
                        break;
                    case 'input':
                        await this.playInputEvent(event, playbackOptions);
                        break;
                    case 'keydown':
                        await this.playKeyEvent(event, playbackOptions);
                        break;
                    case 'navigation':
                        await this.playNavigationEvent(event, playbackOptions);
                        break;
                    case 'scroll':
                        await this.playScrollEvent(event, playbackOptions);
                        break;
                    default:
                        console.warn(`Unsupported event type: ${event.type}`);
                }
                // Add delay based on playback speed
                if (events.indexOf(event) < events.length - 1) {
                    const nextEvent = events[events.indexOf(event) + 1];
                    const delay = (nextEvent.timestamp - event.timestamp) / playbackOptions.speed;
                    if (delay > 0) {
                        await new Promise((resolve) => setTimeout(resolve, delay));
                    }
                }
            }
            catch (error) {
                console.error(`Error playing event: ${event.type}`, error);
                if (playbackOptions.validateTargets) {
                    throw error;
                }
            }
        }
    }
    /**
     * Plays a click event
     */
    async playClickEvent(event, options) {
        if (!this.driver || !event.target)
            return;
        // Find the element
        const element = await this.driver.findElement({ css: event.target });
        // Click it
        await element.click();
    }
    /**
     * Plays an input event
     */
    async playInputEvent(event, options) {
        if (!this.driver || !event.target)
            return;
        // Find the element
        const element = await this.driver.findElement({ css: event.target });
        // Clear it
        await element.clear();
        // Type the value
        await element.sendKeys(event.data.value);
    }
    /**
     * Plays a key event
     */
    async playKeyEvent(event, options) {
        if (!this.driver)
            return;
        // Focus the element if a target is specified
        let element;
        if (event.target) {
            element = await this.driver.findElement({ css: event.target });
            await element.click();
        }
        // Send the key
        const target = element || this.driver.switchTo().activeElement();
        await target.sendKeys(event.data.key);
    }
    /**
     * Plays a navigation event
     */
    async playNavigationEvent(event, options) {
        if (!this.driver)
            return;
        await this.driver.get(event.data.url);
    }
    /**
     * Plays a scroll event
     */
    async playScrollEvent(event, options) {
        if (!this.driver)
            return;
        await this.driver.executeScript((pos) => {
            window.scrollTo(pos.x, pos.y);
        }, event.data);
    }
    /**
     * Starts polling for events during recording
     */
    startEventPolling() {
        if (!this.recording || !this.driver)
            return;
        this.recordingInterval = setInterval(async () => {
            await this.pollEvents();
        }, 500);
    }
    /**
     * Polls for new events from the WebDriver
     */
    async pollEvents() {
        if (!this.driver || !this.recording)
            return;
        try {
            const newEvents = (await this.driver.executeScript(() => {
                return typeof window._pspGetEvents === 'function'
                    ? window._pspGetEvents()
                    : [];
            }));
            this.events.push(...newEvents);
        }
        catch (error) {
            console.error('Error polling events:', error);
        }
    }
    /**
     * Converts plain object storage to Maps
     */
    convertStorageToMap(storage, origin) {
        const result = new Map();
        result.set(origin, new Map(Object.entries(storage)));
        return result;
    }
}
exports.SeleniumAdapter = SeleniumAdapter;
