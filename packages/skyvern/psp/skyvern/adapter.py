"""
Skyvern adapter for PSP.
"""

import json
import time
from typing import Any, Dict, List, Optional, Union, cast
from urllib.parse import urlparse

from psp.core import Adapter, BrowserSessionState, StorageProvider
from psp.core.types import Cookie, Event, PlaybackOptions, RecordingOptions


class SkyvernAdapter(Adapter):
    """
    Adapter implementation for Skyvern framework.
    
    This adapter enables persistent sessions for the vision-based
    Skyvern automation framework.
    """
    
    def __init__(self, 
                 storage_provider: Optional[StorageProvider] = None,
                 visual_comparison: bool = False,
                 screenshot_on_capture: bool = False):
        """
        Initialize a new Skyvern adapter.
        
        Args:
            storage_provider: Optional storage provider for session data
            visual_comparison: Whether to enable visual comparison for session verification
            screenshot_on_capture: Whether to capture screenshots with session data
        """
        super().__init__(adapter_type="skyvern", storage_provider=storage_provider)
        self.browser = None
        self.visual_comparison = visual_comparison
        self.screenshot_on_capture = screenshot_on_capture
        self._recording_events = []
        self._recording_start_time = 0
    
    async def connect(self, browser: Any) -> None:
        """
        Connect to a Skyvern browser instance.
        
        Args:
            browser: Skyvern browser instance
        """
        self.browser = browser
        await super().connect(browser)
    
    async def capture_state(self) -> BrowserSessionState:
        """
        Capture the current browser state.
        
        Returns:
            BrowserSessionState: The captured session state
        """
        if not self.browser:
            raise RuntimeError("Not connected to a browser")
        
        # Get current URL and title
        url = await self.browser.get_current_url()
        title = await self.browser.get_title()
        origin = urlparse(url).netloc
        
        # Capture cookies
        cookies = await self.browser.get_cookies()
        
        # Capture localStorage and sessionStorage
        storage_script = """
        () => {
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
        }
        """
        storage_result = await self.browser.evaluate(storage_script)
        
        # If requested, capture a screenshot
        screenshot = None
        if self.screenshot_on_capture:
            screenshot = await self.browser.screenshot()
        
        # Build localStorage and sessionStorage maps
        local_storage_map = {}
        local_storage_map[origin] = storage_result.get("localStorage", {})
        
        session_storage_map = {}
        session_storage_map[origin] = storage_result.get("sessionStorage", {})
        
        # Convert Skyvern cookies to PSP format
        normalized_cookies = self._normalize_cookies(cookies)
        
        # Build extensions data if needed
        extensions = {}
        if screenshot:
            extensions["screenshot"] = {
                "data": screenshot,
                "timestamp": int(time.time() * 1000),
                "format": "png"
            }
        
        if hasattr(self.browser, "vision_state") and self.visual_comparison:
            try:
                vision_state = await self.browser.get_vision_state()
                extensions["visionState"] = vision_state
            except Exception as e:
                print(f"Warning: Failed to capture vision state: {e}")
        
        # Build the session state
        session_state = {
            "version": "1.0.0",
            "timestamp": int(time.time() * 1000),
            "origin": origin,
            "storage": {
                "cookies": normalized_cookies,
                "localStorage": local_storage_map,
                "sessionStorage": session_storage_map
            },
            "history": {
                "currentUrl": url,
                "entries": [
                    {
                        "url": url,
                        "title": title,
                        "timestamp": int(time.time() * 1000)
                    }
                ],
                "currentIndex": 0
            }
        }
        
        if extensions:
            session_state["extensions"] = extensions
        
        return session_state
    
    async def apply_state(self, state: BrowserSessionState, verify_visual_state: bool = False, 
                          visual_similarity_threshold: float = 0.9) -> None:
        """
        Apply a previously captured state to the browser.
        
        Args:
            state: The browser session state to apply
            verify_visual_state: Whether to verify visual state after restoration
            visual_similarity_threshold: Threshold for visual similarity verification (0.0-1.0)
        """
        if not self.browser:
            raise RuntimeError("Not connected to a browser")
        
        # Navigate to the URL from the session
        if "history" in state and "currentUrl" in state["history"]:
            await self.browser.goto(state["history"]["currentUrl"])
        
        # Apply cookies
        if "storage" in state and "cookies" in state["storage"]:
            for cookie in state["storage"]["cookies"]:
                await self.browser.add_cookie(self._reverse_cookie_mapping(cookie))
        
        # Get current origin
        url = await self.browser.get_current_url()
        origin = urlparse(url).netloc
        
        # Apply localStorage and sessionStorage if available for this origin
        storage_script = """
        (localStorage, sessionStorage) => {
            // Apply localStorage
            window.localStorage.clear();
            for (const key in localStorage) {
                window.localStorage.setItem(key, localStorage[key]);
            }
            
            // Apply sessionStorage
            window.sessionStorage.clear();
            for (const key in sessionStorage) {
                window.sessionStorage.setItem(key, sessionStorage[key]);
            }
        }
        """
        
        local_storage = state.get("storage", {}).get("localStorage", {}).get(origin, {})
        session_storage = state.get("storage", {}).get("sessionStorage", {}).get(origin, {})
        
        await self.browser.evaluate(
            storage_script, 
            local_storage, 
            session_storage
        )
        
        # Refresh the page to apply all state
        await self.browser.goto(url)
        
        # Verify visual state if requested
        if verify_visual_state and "extensions" in state and "screenshot" in state["extensions"]:
            reference_screenshot = state["extensions"]["screenshot"]["data"]
            current_screenshot = await self.browser.screenshot()
            
            # Compare screenshots
            similarity = await self._compare_screenshots(reference_screenshot, current_screenshot)
            
            if similarity < visual_similarity_threshold:
                raise ValueError(
                    f"Visual state verification failed: similarity {similarity} is below threshold {visual_similarity_threshold}"
                )
    
    async def start_recording(self, options: Optional[RecordingOptions] = None) -> None:
        """
        Start recording user interactions.
        
        Args:
            options: Recording options
        """
        if not self.browser:
            raise RuntimeError("Not connected to a browser")
        
        # Reset recording state
        self._recording_events = []
        self._recording_start_time = int(time.time() * 1000)
        
        # Inject recording script
        recording_script = """
        () => {
            window._pspEvents = [];
            window._pspStartTime = Date.now();
            
            function recordEvent(type, target, data) {
                window._pspEvents.push({
                    type: type,
                    timestamp: Date.now() - window._pspStartTime,
                    target: target,
                    data: data
                });
            }
            
            // Record clicks
            document.addEventListener('click', (e) => {
                let target = e.target.tagName;
                if (e.target.id) target += '#' + e.target.id;
                else if (e.target.className) target += '.' + e.target.className.replace(/\\s+/g, '.');
                
                recordEvent('click', target, {
                    x: e.clientX,
                    y: e.clientY,
                    text: e.target.innerText?.trim().substring(0, 50)
                });
            });
            
            // Record form inputs
            document.addEventListener('input', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                    let target = e.target.tagName;
                    if (e.target.id) target += '#' + e.target.id;
                    else if (e.target.className) target += '.' + e.target.className.replace(/\\s+/g, '.');
                    
                    recordEvent('input', target, {
                        value: e.target.value,
                        type: e.target.type
                    });
                }
            });
            
            // Record navigation
            const originalPushState = history.pushState;
            history.pushState = function() {
                recordEvent('navigation', 'history.pushState', {
                    url: arguments[2]
                });
                return originalPushState.apply(this, arguments);
            };
            
            window.addEventListener('popstate', () => {
                recordEvent('navigation', 'popstate', {
                    url: window.location.href
                });
            });
            
            return "Recording started";
        }
        """
        
        await self.browser.evaluate(recording_script)
    
    async def stop_recording(self) -> List[Event]:
        """
        Stop recording and get the recorded events.
        
        Returns:
            List of recorded events
        """
        if not self.browser:
            raise RuntimeError("Not connected to a browser")
        
        # Retrieve recorded events
        get_events_script = """
        () => {
            const events = window._pspEvents || [];
            window._pspEvents = [];
            return events;
        }
        """
        
        browser_events = await self.browser.evaluate(get_events_script)
        events = []
        
        # Convert browser events to PSP events
        for event in browser_events:
            events.append({
                "type": event["type"],
                "timestamp": event["timestamp"],
                "target": event["target"],
                "data": event["data"]
            })
        
        # Store events locally
        self._recording_events.extend(events)
        return self._recording_events
    
    async def play_recording(self, events: List[Event], options: Optional[PlaybackOptions] = None) -> None:
        """
        Play back recorded events.
        
        Args:
            events: List of events to play back
            options: Playback options
        """
        if not self.browser:
            raise RuntimeError("Not connected to a browser")
        
        speed = options.get("speed", 1.0) if options else 1.0
        
        for event in events:
            try:
                event_type = event["type"]
                
                if event_type == "click":
                    # Handle clicks based on target
                    target = event["target"]
                    if "#" in target:
                        # If we have an ID, use it
                        element_id = target.split("#")[1].split(".")[0]
                        await self.browser.click_by_id(element_id)
                    elif "." in target:
                        # If we have a class, use it
                        class_name = target.split(".")[1]
                        await self.browser.click_by_class(class_name)
                    elif "text" in event["data"]:
                        # If we have text, use it (Skyvern speciality)
                        await self.browser.click_on_text(event["data"]["text"])
                    else:
                        # Just click by tag
                        tag = target.split(".")[0].split("#")[0]
                        await self.browser.click_by_tag(tag)
                
                elif event_type == "input":
                    target = event["target"]
                    value = event["data"]["value"]
                    
                    if "#" in target:
                        element_id = target.split("#")[1].split(".")[0]
                        await self.browser.fill_by_id(element_id, value)
                    elif "." in target:
                        class_name = target.split(".")[1]
                        await self.browser.fill_by_class(class_name, value)
                    else:
                        tag = target.split(".")[0].split("#")[0]
                        # Skyvern has good label detection for forms
                        await self.browser.fill_by_label(tag, value)
                
                elif event_type == "navigation":
                    if "url" in event["data"]:
                        await self.browser.goto(event["data"]["url"])
                
                # Add delay between events based on speed
                if speed > 0:
                    await asyncio.sleep(0.5 / speed)
                    
            except Exception as e:
                print(f"Warning: Failed to replay event {event_type}: {e}")
    
    async def _compare_screenshots(self, reference: bytes, current: bytes) -> float:
        """
        Compare two screenshots and return a similarity score.
        
        Args:
            reference: Reference screenshot data
            current: Current screenshot data
            
        Returns:
            Similarity score between 0.0 and 1.0
        """
        try:
            from PIL import Image
            import io
            import numpy as np
            
            # Load images
            ref_img = Image.open(io.BytesIO(reference))
            cur_img = Image.open(io.BytesIO(current))
            
            # Resize to same dimensions
            cur_img = cur_img.resize(ref_img.size)
            
            # Convert to arrays and calculate similarity
            ref_arr = np.array(ref_img)
            cur_arr = np.array(cur_img)
            
            # Calculate mean squared error
            mse = np.mean((ref_arr - cur_arr) ** 2)
            if mse == 0:
                return 1.0
            
            # Convert to a similarity score between 0 and 1
            # The smaller the MSE, the more similar the images
            max_mse = 255 ** 2  # Maximum possible MSE for 8-bit images
            similarity = 1.0 - (mse / max_mse)
            return similarity
            
        except ImportError:
            print("Warning: PIL or numpy not available for screenshot comparison")
            return 0.0  # Return minimum similarity if we can't compare
        except Exception as e:
            print(f"Warning: Failed to compare screenshots: {e}")
            return 0.0
    
    def _normalize_cookies(self, cookies: List[Dict[str, Any]]) -> List[Cookie]:
        """
        Convert Skyvern cookies to PSP cookie format.
        
        Args:
            cookies: List of Skyvern cookies
            
        Returns:
            List of normalized PSP cookies
        """
        normalized = []
        for cookie in cookies:
            normalized.append({
                "name": cookie["name"],
                "value": cookie["value"],
                "domain": cookie.get("domain", ""),
                "path": cookie.get("path", "/"),
                "expires": cookie.get("expires"),
                "httpOnly": cookie.get("httpOnly", False),
                "secure": cookie.get("secure", False),
                "sameSite": cookie.get("sameSite", "Lax")
            })
        return normalized
    
    def _reverse_cookie_mapping(self, cookie: Cookie) -> Dict[str, Any]:
        """
        Convert PSP cookie to Skyvern cookie format.
        
        Args:
            cookie: PSP cookie
            
        Returns:
            Skyvern cookie
        """
        return {
            "name": cookie["name"],
            "value": cookie["value"],
            "domain": cookie.get("domain"),
            "path": cookie.get("path", "/"),
            "expires": cookie.get("expires"),
            "httpOnly": cookie.get("httpOnly", False),
            "secure": cookie.get("secure", False),
            "sameSite": cookie.get("sameSite", "Lax")
        }