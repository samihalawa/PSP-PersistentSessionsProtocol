"""
PSP SDK for Python - Persistent Sessions Protocol

This package provides Python bindings for the Persistent Sessions Protocol,
enabling browser session persistence across different automation frameworks.
"""

from .client import PSPClient
from .session import PSPSession
from .adapters import PlaywrightAdapter, SeleniumAdapter
from .exceptions import PSPError, SessionNotFoundError, AdapterError

__version__ = "0.1.0"
__author__ = "PSP Contributors"
__email__ = "contact@psp-protocol.org"

__all__ = [
    "PSPClient",
    "PSPSession", 
    "PlaywrightAdapter",
    "SeleniumAdapter",
    "PSPError",
    "SessionNotFoundError",
    "AdapterError",
]