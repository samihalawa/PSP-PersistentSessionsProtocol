# Quick Start

## Installation

### CLI Tool
Install the CLI globally to capture sessions from your local machine.

```bash
npm install -g @samihalawa/psp-cli
```

### Server (Docker)
The server stores sessions and hosts the remote browser instances.

```bash
# Create a docker-compose.yml
version: '3.8'
services:
  server:
    image: samihalawa/psp-server:latest # (Coming soon, build locally for now)
    build: packages/server
    ports:
      - "3000:3000"
```

```bash
docker-compose up -d
```

## Usage Flow

### 1. Capture a Session
Run the interactive CLI on your local machine. It will scan for Chrome profiles.

```bash
psp
```

Follow the prompts:
1.  Select "Default" (or your main profile).
2.  The CLI will launch Chrome, extract cookies/storage, and upload to the server.
3.  **Copy the Session ID** returned (e.g., `550e8400...`).

### 2. Connect via Python (Playwright)

```python
import asyncio
from playwright.async_api import async_playwright
from psp import PSPClient

async def main():
    client = PSPClient(api_url="http://localhost:3000")
    
    # 1. Get the connection endpoint
    connection = client.connect("YOUR_SESSION_ID")
    
    # 2. Connect Playwright
    async with async_playwright() as p:
        browser = await p.connect(connection['browserWSEndpoint'])
        page = await browser.new_page()
        
        await page.goto('https://gmail.com')
        # You are logged in!
```
