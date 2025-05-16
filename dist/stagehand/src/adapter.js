"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StagehandAdapter = void 0;
const core_1 = require("@psp/core");
/**
 * Adapter implementation for Stagehand framework
 */
class StagehandAdapter extends core_1.Adapter {
    /**
     * Creates a new StagehandAdapter instance
     *
     * @param options Configuration options for the adapter
     */
    constructor(options = {}) {
        super({
            ...options,
            type: 'stagehand'
        });
        this.options = options;
    }
    /**
     * Connects the adapter to a Stagehand instance
     *
     * @param stagehand The Stagehand instance
     */
    async connect(stagehand) {
        this.stagehand = stagehand;
        await super.connect(stagehand);
    }
    /**
     * Captures the current browser state
     *
     * @returns The captured browser session state
     */
    async captureState() {
        if (!this.stagehand) {
            throw new Error('Not connected to a Stagehand instance');
        }
        // Get current URL and extract origin
        const url = await this.stagehand.getCurrentUrl();
        const origin = new URL(url).origin;
        // Get page title
        const title = await this.stagehand.getTitle();
        // Capture cookies
        const cookies = await this.stagehand.getCookies();
        // Capture storage (localStorage and sessionStorage)
        const storage = await this.stagehand.evaluate(`(() => {
      const localStorage = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        localStorage[key] = window.localStorage.getItem(key);
      }
      
      const sessionStorage = {};
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        sessionStorage[key] = window.sessionStorage.getItem(key);
      }
      
      return { localStorage, sessionStorage };
    })()`);
        // Extensions for Stagehand-specific state
        const extensions = {};
        // Capture selector strategies if requested
        if (this.options.stagehandOptions?.captureSelectors) {
            try {
                const selectorRegistry = await this.stagehand.getSelectorRegistry();
                extensions.selectorRegistry = selectorRegistry;
            }
            catch (error) {
                console.warn('Failed to capture selector registry:', error);
            }
        }
        // Capture form state if requested
        if (this.options.stagehandOptions?.captureFormState) {
            try {
                const formState = await this.stagehand.evaluate(`(() => {
          const forms = {};
          document.querySelectorAll('form').forEach((form, index) => {
            const formId = form.id || form.name || \`form-\${index}\`;
            const formData = {};
            const elements = form.elements;
            
            for (let i = 0; i < elements.length; i++) {
              const element = elements[i];
              if (element.name) {
                if (element.type === 'checkbox' || element.type === 'radio') {
                  formData[element.name] = element.checked;
                } else {
                  formData[element.name] = element.value;
                }
              }
            }
            
            forms[formId] = formData;
          });
          
          return forms;
        })()`);
                extensions.formState = formState;
            }
            catch (error) {
                console.warn('Failed to capture form state:', error);
            }
        }
        // Construct the session state
        return {
            version: '1.0.0',
            timestamp: Date.now(),
            origin,
            storage: {
                cookies: this.normalizeCookies(cookies),
                localStorage: this.mapStorage(storage.localStorage, origin),
                sessionStorage: this.mapStorage(storage.sessionStorage, origin)
            },
            history: {
                currentUrl: url,
                entries: [
                    {
                        url,
                        title,
                        timestamp: Date.now()
                    }
                ],
                currentIndex: 0
            },
            extensions: Object.keys(extensions).length > 0 ? extensions : undefined
        };
    }
    /**
     * Applies a previously captured browser state to the current Stagehand instance
     *
     * @param state The browser session state to apply
     */
    async applyState(state) {
        if (!this.stagehand) {
            throw new Error('Not connected to a Stagehand instance');
        }
        // Navigate to the URL if history is available
        if (state.history?.currentUrl) {
            await this.stagehand.goto(state.history.currentUrl);
        }
        // Apply cookies
        for (const cookie of state.storage.cookies) {
            await this.stagehand.setCookie({
                name: cookie.name,
                value: cookie.value,
                domain: cookie.domain || undefined,
                path: cookie.path || '/',
                expires: cookie.expires ? new Date(cookie.expires) : undefined,
                httpOnly: cookie.httpOnly,
                secure: cookie.secure,
                sameSite: cookie.sameSite
            });
        }
        // Get current URL and origin
        const url = await this.stagehand.getCurrentUrl();
        const origin = new URL(url).origin;
        // Apply localStorage and sessionStorage
        const localStorage = state.storage.localStorage.get(origin);
        const sessionStorage = state.storage.sessionStorage.get(origin);
        await this.stagehand.evaluate(`((localStorage, sessionStorage) => {
      // Apply localStorage
      window.localStorage.clear();
      for (const [key, value] of Object.entries(localStorage || {})) {
        window.localStorage.setItem(key, value);
      }
      
      // Apply sessionStorage
      window.sessionStorage.clear();
      for (const [key, value] of Object.entries(sessionStorage || {})) {
        window.sessionStorage.setItem(key, value);
      }
    })(${JSON.stringify(Object.fromEntries(localStorage || []))}, ${JSON.stringify(Object.fromEntries(sessionStorage || []))})
    `);
        // Restore selector registry if available
        if (state.extensions?.selectorRegistry) {
            try {
                await this.stagehand.importSelectorRegistry(state.extensions.selectorRegistry);
            }
            catch (error) {
                console.warn('Failed to restore selector registry:', error);
            }
        }
        // Restore form state if available
        if (state.extensions?.formState) {
            try {
                await this.stagehand.evaluate(`((formState) => {
          Object.entries(formState).forEach(([formId, fieldValues]) => {
            let form;
            if (formId.startsWith('form-')) {
              // Form was indexed by position
              const index = parseInt(formId.replace('form-', ''), 10);
              const forms = document.querySelectorAll('form');
              if (forms[index]) {
                form = forms[index];
              }
            } else {
              // Form has an ID or name
              form = document.getElementById(formId) || document.querySelector(\`form[name="\${formId}"]\`);
            }
            
            if (form) {
              Object.entries(fieldValues).forEach(([name, value]) => {
                const element = form.elements[name];
                if (element) {
                  if (element.type === 'checkbox' || element.type === 'radio') {
                    element.checked = value;
                  } else {
                    element.value = value;
                  }
                }
              });
            }
          });
        })(${JSON.stringify(state.extensions.formState)})
        `);
            }
            catch (error) {
                console.warn('Failed to restore form state:', error);
            }
        }
        // Refresh the page to apply all state
        await this.stagehand.refresh();
    }
    /**
     * Starts recording user interactions
     *
     * @param options Optional recording options
     */
    async startRecording(options) {
        if (!this.stagehand) {
            throw new Error('Not connected to a Stagehand instance');
        }
        // Initialize recording in the browser
        await this.stagehand.evaluate(`(() => {
      window._pspEvents = [];
      window._pspStartTime = Date.now();
      
      // Helper function to record events
      window._pspRecordEvent = (type, target, data) => {
        window._pspEvents.push({
          type,
          timestamp: Date.now() - window._pspStartTime,
          target,
          data
        });
      };
      
      // Record clicks
      document.addEventListener('click', (e) => {
        window._pspRecordEvent('click', {
          tag: e.target.tagName,
          id: e.target.id,
          className: e.target.className,
          text: e.target.innerText?.trim().substring(0, 100)
        }, {
          x: e.clientX,
          y: e.clientY
        });
      });
      
      // Record form interactions
      document.addEventListener('input', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
          window._pspRecordEvent('input', {
            tag: e.target.tagName,
            id: e.target.id,
            name: e.target.name,
            type: e.target.type
          }, {
            value: e.target.type === 'password' ? '********' : e.target.value
          });
        }
      });
      
      // Record form submissions
      document.addEventListener('submit', (e) => {
        window._pspRecordEvent('submit', {
          tag: 'FORM',
          id: e.target.id,
          action: e.target.action
        }, {});
      });
      
      // Record navigation
      const originalPushState = history.pushState;
      history.pushState = function() {
        window._pspRecordEvent('navigation', 'history', {
          url: arguments[2]
        });
        return originalPushState.apply(this, arguments);
      };
      
      window.addEventListener('popstate', () => {
        window._pspRecordEvent('navigation', 'popstate', {
          url: window.location.href
        });
      });
      
      return 'Recording started';
    })()`);
        // Also use Stagehand's built-in observer if available
        try {
            this.recordingObserver = await this.stagehand.observeInteractions();
        }
        catch (error) {
            // Observer not available, continue without it
            console.warn('Stagehand observer not available:', error);
        }
    }
    /**
     * Stops recording and returns the recorded events
     *
     * @returns The recorded events
     */
    async stopRecording() {
        if (!this.stagehand) {
            throw new Error('Not connected to a Stagehand instance');
        }
        // Get events recorded in the browser
        const browserEvents = await this.stagehand.evaluate(`(() => {
      const events = window._pspEvents || [];
      window._pspEvents = [];
      return events;
    })()`);
        // Get events from Stagehand observer if available
        let observerEvents = [];
        if (this.recordingObserver) {
            try {
                const stagehandEvents = await this.recordingObserver.getEvents();
                // Convert Stagehand events to PSP format
                observerEvents = stagehandEvents.map(event => ({
                    type: event.type,
                    timestamp: event.timestamp,
                    target: this.convertStagehandTarget(event.target),
                    data: event.data
                }));
                // Stop the observer
                await this.recordingObserver.stop();
                this.recordingObserver = null;
            }
            catch (error) {
                console.warn('Failed to get events from Stagehand observer:', error);
            }
        }
        // Combine and deduplicate events
        const allEvents = [...browserEvents, ...observerEvents];
        // Sort by timestamp
        return allEvents.sort((a, b) => a.timestamp - b.timestamp);
    }
    /**
     * Plays back recorded events
     *
     * @param events The events to play back
     * @param options Optional playback options
     */
    async playRecording(events, options) {
        if (!this.stagehand) {
            throw new Error('Not connected to a Stagehand instance');
        }
        const speed = options?.speed || 1;
        for (const event of events) {
            try {
                switch (event.type) {
                    case 'click': {
                        // Extract targeting information
                        const targetInfo = this.extractTargetInfo(event.target);
                        // Use Stagehand's reliable targeting
                        if (targetInfo.id) {
                            await this.stagehand.click(`#${targetInfo.id}`);
                        }
                        else if (targetInfo.text) {
                            await this.stagehand.clickOnText(targetInfo.text);
                        }
                        else if (targetInfo.className) {
                            await this.stagehand.click(`.${targetInfo.className.split(' ')[0]}`);
                        }
                        else if (targetInfo.tag) {
                            await this.stagehand.click(targetInfo.tag);
                        }
                        break;
                    }
                    case 'input': {
                        const targetInfo = this.extractTargetInfo(event.target);
                        const value = event.data?.value;
                        if (value !== undefined) {
                            if (targetInfo.id) {
                                await this.stagehand.fillField(`#${targetInfo.id}`, value);
                            }
                            else if (targetInfo.name) {
                                await this.stagehand.fillField(`[name="${targetInfo.name}"]`, value);
                            }
                            else if (targetInfo.tag && targetInfo.type) {
                                await this.stagehand.fillField(`${targetInfo.tag}[type="${targetInfo.type}"]`, value);
                            }
                        }
                        break;
                    }
                    case 'submit': {
                        const targetInfo = this.extractTargetInfo(event.target);
                        if (targetInfo.id) {
                            await this.stagehand.submitForm(`#${targetInfo.id}`);
                        }
                        else if (targetInfo.tag === 'FORM') {
                            await this.stagehand.submitForm('form');
                        }
                        break;
                    }
                    case 'navigation': {
                        const url = event.data?.url;
                        if (url) {
                            await this.stagehand.goto(url);
                        }
                        break;
                    }
                }
                // Add delay between events based on speed
                if (speed > 0) {
                    await new Promise(resolve => setTimeout(resolve, 100 / speed));
                }
            }
            catch (error) {
                console.warn(`Error during playback of ${event.type} event:`, error);
            }
        }
    }
    /**
     * Extracts target information from a target object or string
     *
     * @param target The target object or string
     * @returns Extracted target information
     */
    extractTargetInfo(target) {
        if (typeof target === 'string') {
            return { tag: target };
        }
        return {
            id: target.id,
            className: target.className,
            tag: target.tag,
            text: target.text,
            name: target.name,
            type: target.type
        };
    }
    /**
     * Converts a Stagehand target to PSP format
     *
     * @param target The Stagehand target
     * @returns PSP format target
     */
    convertStagehandTarget(target) {
        if (!target) {
            return '';
        }
        if (typeof target === 'string') {
            return target;
        }
        // Extract the most important identification information
        return {
            tag: target.element?.tagName || target.tagName,
            id: target.element?.id || target.id,
            className: target.element?.className || target.className,
            text: target.text || target.element?.innerText
        };
    }
    /**
     * Normalizes cookies to a common format
     *
     * @param cookies The cookies array from Stagehand
     * @returns Normalized cookies array
     */
    normalizeCookies(cookies) {
        return cookies.map(cookie => ({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path || '/',
            expires: cookie.expires ? new Date(cookie.expires).getTime() : undefined,
            httpOnly: cookie.httpOnly || false,
            secure: cookie.secure || false,
            sameSite: cookie.sameSite || 'Lax'
        }));
    }
    /**
     * Maps storage objects to the PSP storage format
     *
     * @param storageObj The storage object (localStorage or sessionStorage)
     * @param origin The origin for which the storage applies
     * @returns Mapped storage in PSP format
     */
    mapStorage(storageObj, origin) {
        const map = new Map();
        map.set(origin, new Map(Object.entries(storageObj || {})));
        return map;
    }
}
exports.StagehandAdapter = StagehandAdapter;
