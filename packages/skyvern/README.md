# PSP Skyvern Adapter

This package provides a Skyvern adapter for the Persistent Sessions Protocol. It allows you to capture, store, and restore browser sessions when using the Skyvern vision-based automation framework.

## Installation

```bash
pip install psp-skyvern
```

## Usage

```python
from skyvern import SkyvernBrowser
from psp.skyvern import SkyvernAdapter
import asyncio

async def skyvern_example():
    # Initialize Skyvern
    browser = SkyvernBrowser()
    
    # Create PSP adapter
    adapter = SkyvernAdapter()
    
    # Create a session
    session = await adapter.create_session(browser, 
        name="skyvern-session",
        description="Skyvern authenticated session"
    )
    
    # Navigate to a login page
    await browser.goto("https://example.com/login")
    
    # Use Skyvern's vision-based interaction
    await browser.click_on_text("Username")
    await browser.type("user@example.com")
    
    await browser.click_on_text("Password")
    await browser.type("password123")
    
    await browser.click_on_text("Sign In")
    
    # Wait for login to complete
    await browser.wait_for_navigation()
    
    # Capture the session
    await session.capture()
    
    # Export the session ID
    session_id = session.get_id()
    print(f"Session saved with ID: {session_id}")
    
    # Later, in another process or machine
    
    # Create a new browser instance
    new_browser = SkyvernBrowser()
    
    # Load the saved session
    saved_session = await adapter.load_session(session_id)
    
    # Restore the session
    await saved_session.restore(new_browser)
    
    # Navigate to a protected page - no login required
    await new_browser.goto("https://example.com/dashboard")
    
    # Skyvern can now interact with the authenticated page
    dashboard_elements = await new_browser.get_page_elements()
    print(f"Found {len(dashboard_elements)} elements on dashboard")

# Run the example
asyncio.run(skyvern_example())
```

## Features

- **Vision-Based Session Persistence**: Works with Skyvern's vision-based automation.
- **Screenshot Comparison**: Optionally verify visual state during session restoration.
- **Event Recording & Playback**: Record user interactions and play them back.
- **Custom Storage Providers**: Use any PSP storage provider for session data.

## License

MIT