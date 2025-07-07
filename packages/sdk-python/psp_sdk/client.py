"""PSP Client for Python - Main client interface"""

import json
import asyncio
import aiohttp
import websockets
from typing import Dict, List, Optional, Any, Union
from datetime import datetime

from .session import PSPSession
from .exceptions import PSPError, SessionNotFoundError


class PSPClient:
    """Main PSP client for managing sessions and adapters"""
    
    def __init__(
        self,
        server_url: str = "http://localhost:3000",
        api_key: Optional[str] = None,
        timeout: int = 30
    ):
        self.server_url = server_url.rstrip('/')
        self.api_key = api_key
        self.timeout = timeout
        self.session = None
        self._sessions: Dict[str, PSPSession] = {}
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=self.timeout)
        )
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
            
    def _get_headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers
        
    async def _request(
        self, 
        method: str, 
        endpoint: str, 
        data: Optional[Dict] = None
    ) -> Dict:
        """Make HTTP request to PSP server"""
        if not self.session:
            raise PSPError("Client not initialized. Use async with PSPClient():")
            
        url = f"{self.server_url}/api{endpoint}"
        
        try:
            async with self.session.request(
                method,
                url,
                json=data,
                headers=self._get_headers()
            ) as response:
                result = await response.json()
                
                if response.status >= 400:
                    raise PSPError(f"API Error {response.status}: {result.get('error', 'Unknown error')}")
                    
                return result
        except aiohttp.ClientError as e:
            raise PSPError(f"Request failed: {str(e)}")
            
    async def health_check(self) -> Dict[str, Any]:
        """Check server health status"""
        try:
            async with self.session.get(f"{self.server_url}/health") as response:
                return await response.json()
        except Exception as e:
            raise PSPError(f"Health check failed: {str(e)}")
            
    async def create_session(
        self,
        name: str,
        adapter: str = "playwright",
        description: Optional[str] = None,
        config: Optional[Dict] = None
    ) -> PSPSession:
        """Create a new PSP session"""
        data = {
            "name": name,
            "adapter": adapter,
            "description": description or f"Python SDK session - {name}",
            "config": config or {}
        }
        
        result = await self._request("POST", "/sessions", data)
        
        session = PSPSession(
            session_id=result["sessionId"],
            metadata=result["metadata"],
            adapter=result["adapter"],
            client=self
        )
        
        self._sessions[session.session_id] = session
        return session
        
    async def get_session(self, session_id: str) -> PSPSession:
        """Get existing session by ID"""
        if session_id in self._sessions:
            return self._sessions[session_id]
            
        try:
            result = await self._request("GET", f"/sessions/{session_id}")
            
            session = PSPSession(
                session_id=result["id"],
                metadata=result["metadata"],
                adapter=result["adapter"],
                client=self
            )
            
            self._sessions[session_id] = session
            return session
            
        except PSPError as e:
            if "not found" in str(e).lower():
                raise SessionNotFoundError(f"Session {session_id} not found")
            raise
            
    async def list_sessions(self) -> List[Dict[str, Any]]:
        """List all active sessions"""
        result = await self._request("GET", "/sessions")
        return result.get("sessions", [])
        
    async def delete_session(self, session_id: str) -> bool:
        """Delete a session"""
        try:
            await self._request("DELETE", f"/sessions/{session_id}")
            if session_id in self._sessions:
                del self._sessions[session_id]
            return True
        except PSPError:
            return False
            
    async def capture_session(self, session_id: str) -> Dict[str, Any]:
        """Capture session state"""
        return await self._request("POST", f"/sessions/{session_id}/capture")
        
    async def restore_session(
        self, 
        session_id: str, 
        session_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Restore session from captured data"""
        data = {"sessionData": session_data}
        return await self._request("POST", f"/sessions/{session_id}/restore", data)
        
    async def execute_workflow(
        self, 
        session_id: str, 
        workflow: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute workflow on session"""
        data = {"workflow": workflow}
        return await self._request("POST", f"/sessions/{session_id}/workflow", data)
        
    # Browser automation methods
    async def navigate(self, session_id: str, url: str) -> Dict[str, Any]:
        """Navigate to URL"""
        data = {"url": url}
        return await self._request("POST", f"/sessions/{session_id}/navigate", data)
        
    async def click(self, session_id: str, selector: str) -> Dict[str, Any]:
        """Click element by selector"""
        data = {"selector": selector}
        return await self._request("POST", f"/sessions/{session_id}/click", data)
        
    async def fill(
        self, 
        session_id: str, 
        selector: str, 
        value: str
    ) -> Dict[str, Any]:
        """Fill input field"""
        data = {"selector": selector, "value": value}
        return await self._request("POST", f"/sessions/{session_id}/fill", data)
        
    async def screenshot(self, session_id: str) -> bytes:
        """Take screenshot"""
        if not self.session:
            raise PSPError("Client not initialized")
            
        url = f"{self.server_url}/api/sessions/{session_id}/screenshot"
        
        async with self.session.get(url, headers=self._get_headers()) as response:
            if response.status >= 400:
                error_data = await response.json()
                raise PSPError(f"Screenshot failed: {error_data.get('error')}")
            return await response.read()
            
    # WebSocket connection for real-time events
    async def connect_websocket(self, session_id: Optional[str] = None):
        """Connect to PSP WebSocket for real-time events"""
        ws_url = self.server_url.replace('http', 'ws')
        
        async with websockets.connect(f"{ws_url}/ws") as websocket:
            # Subscribe to session events
            if session_id:
                subscribe_msg = {
                    "type": "subscribe",
                    "sessionId": session_id
                }
                await websocket.send(json.dumps(subscribe_msg))
                
            async for message in websocket:
                try:
                    data = json.loads(message)
                    yield data
                except json.JSONDecodeError:
                    continue
                    
    # Utility methods
    def create_workflow(self) -> "WorkflowBuilder":
        """Create workflow builder"""
        return WorkflowBuilder()
        
    async def wait_for_session(
        self, 
        session_id: str, 
        timeout: int = 60
    ) -> PSPSession:
        """Wait for session to become ready"""
        for _ in range(timeout):
            try:
                session = await self.get_session(session_id)
                return session
            except SessionNotFoundError:
                await asyncio.sleep(1)
                
        raise PSPError(f"Session {session_id} not ready after {timeout} seconds")


class WorkflowBuilder:
    """Builder for creating PSP workflows"""
    
    def __init__(self):
        self.steps = []
        
    def navigate(self, url: str) -> "WorkflowBuilder":
        """Add navigation step"""
        self.steps.append({
            "type": "navigate",
            "url": url,
            "description": f"Navigate to {url}"
        })
        return self
        
    def click(self, selector: str, description: str = None) -> "WorkflowBuilder":
        """Add click step"""
        self.steps.append({
            "type": "click",
            "selector": selector,
            "description": description or f"Click {selector}"
        })
        return self
        
    def fill(
        self, 
        selector: str, 
        value: str, 
        description: str = None
    ) -> "WorkflowBuilder":
        """Add fill step"""
        self.steps.append({
            "type": "fill",
            "selector": selector,
            "value": value,
            "description": description or f"Fill {selector} with {value}"
        })
        return self
        
    def wait(self, duration: int, description: str = None) -> "WorkflowBuilder":
        """Add wait step"""
        self.steps.append({
            "type": "wait",
            "duration": duration,
            "description": description or f"Wait {duration}ms"
        })
        return self
        
    def extract(
        self, 
        selector: str, 
        description: str = None
    ) -> "WorkflowBuilder":
        """Add extraction step"""
        self.steps.append({
            "type": "extract",
            "selector": selector,
            "description": description or f"Extract data from {selector}"
        })
        return self
        
    def screenshot(self, description: str = None) -> "WorkflowBuilder":
        """Add screenshot step"""
        self.steps.append({
            "type": "screenshot",
            "description": description or "Take screenshot"
        })
        return self
        
    def custom_step(
        self, 
        step_type: str, 
        **kwargs
    ) -> "WorkflowBuilder":
        """Add custom step"""
        step = {"type": step_type, **kwargs}
        self.steps.append(step)
        return self
        
    def build(self) -> Dict[str, Any]:
        """Build workflow definition"""
        return {
            "steps": self.steps,
            "metadata": {
                "created_at": datetime.now().isoformat(),
                "step_count": len(self.steps)
            }
        }