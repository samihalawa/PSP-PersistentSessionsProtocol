# PSP - Persistent Sessions Protocol

**The Universal Browser Session Protocol.**

PSP is an open standard and toolset for capturing, storing, and transporting browser sessions (cookies, local storage, headers, fingerprints) across different automation frameworks and environments.

## Core Vision
- **Capture Once, Run Anywhere**: Grab a session from your local Chrome. Use it in Playwright (Python), Selenium (Java), or Puppeteer (Node) without re-login.
- **Universal Compatibility**: Works with Browser-Use, Stagehand, Skyvern, and any tool that uses standard browser automation.
- **Zero Friction**: No more `user_data_dir` hell. Just `psp.connect(session_id)`.

## Architecture
1.  **PSP CLI**: Extracts sessions from local browsers (Chrome, Edge, Brave).
2.  **PSP Server**: Stores sessions and provides a "Remote Browser" endpoint (CDP).
3.  **PSP SDKs**: Client libraries to easily connect your code to PSP sessions.

## Quick Start

### 1. Install via NPM (Recommended)
```bash
# Install the CLI globally
npm install -g @samihalawa/psp-cli

# Run it
psp
```

### 2. Run Server (Docker)
```bash
docker-compose up -d
```

### 3. Developer Setup (From Source)
```bash
# Install dependencies
npm install

# Start Server
npm start --workspace=@samihalawa/psp-server

# Start CLI
npm start --workspace=@samihalawa/psp-cli
```
Select your profile (e.g., "Default"). It will be synced to the server, and you'll get a **Session ID** (e.g., `550e8400-e29b...`).

### 3. Use in Your Code (Python Example)

Compatible with **Browser-Use** and **Playwright**:

```python
import asyncio
from playwright.async_api import async_playwright
from psp import PSPClient

async def main():
    client = PSPClient(api_url="http://localhost:3000")
    
    # 1. Get the connection endpoint for your session
    session_id = "YOUR_SESSION_ID_HERE"
    connection = client.connect(session_id)
    ws_endpoint = connection['browserWSEndpoint']
    
    # 2. Connect Playwright to the remote PSP browser
    async with async_playwright() as p:
        browser = await p.connect(ws_endpoint)
        page = await browser.new_page()
        
        # You are now logged in!
        await page.goto('https://gmail.com')
        print(await page.title())
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
```

### 4. Use in Your Code (Node.js Example)

```typescript
import puppeteer from 'puppeteer-core';
import axios from 'axios';

const SESSION_ID = 'YOUR_SESSION_ID';

async function main() {
  // 1. Request connection
  const { data } = await axios.post(`http://localhost:3000/api/v1/sessions/${SESSION_ID}/connect`);
  
  // 2. Connect
  const browser = await puppeteer.connect({
    browserWSEndpoint: data.browserWSEndpoint
  });
  
  const page = await browser.newPage();
  await page.goto('https://github.com');
  // ...
}
```

## API Reference

### `POST /api/v1/sessions`
Creates a new session.
Payload: `{ name, cookies, localStorage, userAgent, viewport }`

### `GET /api/v1/sessions/:id`
Returns raw session data.

### `POST /api/v1/sessions/:id/connect`
Launches a browser with the session and returns `{ browserWSEndpoint }`.

## Roadmap
- [x] Chrome Profile Extraction
- [x] Basic Cookie Sync
- [x] Remote Browser Launching
- [ ] LocalStorage Injection (In-progress)
- [ ] Session Recording/Playback (RRWeb)
- [ ] Managed Cloud Hosting

## License
MIT
