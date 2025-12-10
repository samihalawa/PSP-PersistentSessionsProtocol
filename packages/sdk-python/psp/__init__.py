import requests
import os
from typing import Optional, Dict, Any

class PSPClient:
    def __init__(self, api_url: str = "http://localhost:3000", api_key: Optional[str] = None):
        self.api_url = api_url.rstrip("/")
        self.api_key = api_key
        self.headers = {}
        if api_key:
            self.headers["Authorization"] = f"Bearer {api_key}"

    def get_session(self, session_id: str) -> Dict[str, Any]:
        """Retrieves raw session data (cookies, storage)."""
        resp = requests.get(f"{self.api_url}/api/v1/sessions/{session_id}", headers=self.headers)
        resp.raise_for_status()
        return resp.json()

    def connect(self, session_id: str) -> Dict[str, Any]:
        """
        Launches a remote browser with the session and returns connection details.
        Returns: { 'browserWSEndpoint': str, 'browserId': str, 'session': dict }
        """
        resp = requests.post(f"{self.api_url}/api/v1/sessions/{session_id}/connect", headers=self.headers)
        resp.raise_for_status()
        return resp.json()

    def stop_browser(self, browser_id: str):
        requests.delete(f"{self.api_url}/api/v1/browsers/{browser_id}", headers=self.headers)

# --- Adapters ---

class PlaywrightAdapter:
    """Helper to connect Playwright to PSP"""
    @staticmethod
    def connect_args(connection_info: Dict[str, Any]) -> str:
        return connection_info['browserWSEndpoint']
