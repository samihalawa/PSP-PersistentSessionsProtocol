# PSP - PersistentSessionsProtocol v0.1 🚀

> **Minimal working version** - Browser session persistence made simple

PSP allows you to capture, store, and restore browser sessions across different automation frameworks. This v0.1 focuses on **core functionality** with Playwright support.

## Quick Start (< 5 minutes)

### 1. Install Dependencies

```bash
# Clone and install
git clone <this-repo>
cd PSP-PersistentSessionsProtocol
pnpm install

# Build packages
pnpm build
```

### 2. Run the Demo

```bash
# Quick demo to see PSP in action
node examples/playwright-demo.js
```

### 3. Use in Your Code

```javascript
const { launchWithPSP } = require('@psp/adapter-playwright');

// Launch with new session
const { browser, context, session } = await launchWithPSP();

// Do your automation work...
const page = await context.newPage();
await page.goto('https://example.com');
// Login, interact, etc.

// Capture the session
await session.capture(context);
const sessionId = session.getId();

await browser.close();

// Later: Restore the session
const { browser2, context2 } = await launchWithPSP(sessionId);
// Your session (cookies, localStorage) is now restored!
```

### 4. CLI Usage

```bash
# Capture a session
psp capture /path/to/chrome/profile --name "My Session"

# List sessions
psp list

# Restore a session  
psp restore /path/to/chrome/profile <session-id>

# Run demo
psp demo
```

### 5. HTTP API

```bash
# Start the server
cd packages/server && npm start

# Capture session
curl -X POST http://localhost:3000/capture \
  -H "Content-Type: application/json" \
  -d '{"name": "API Session"}'

# List sessions
curl http://localhost:3000/sessions

# Restore session
curl -X POST http://localhost:3000/restore \
  -H "Content-Type: application/json" \
  -d '{"id": "<session-id>"}'
```

### 6. Web UI

Open `http://localhost:3000` in your browser for a simple web interface.

## What Works in v0.1

✅ **Core Features:**
- ✅ Capture & restore Chrome sessions (cookies + localStorage + sessionStorage)
- ✅ Playwright helper functions
- ✅ JSON file storage in `~/.psp/sessions/`
- ✅ CLI commands (`psp capture`, `psp restore`, `psp list`)
- ✅ HTTP API (`/capture`, `/restore`, `/sessions`)
- ✅ Simple web UI for testing

✅ **Session Data Captured:**
- Cookies (all attributes)
- localStorage (per origin)
- sessionStorage (per origin)
- Basic metadata (name, timestamps, tags)

## Example Output

```bash
$ psp demo
🚀 PSP Playwright Demo Starting...
📱 Step 1: Creating new session...
🌐 Navigating to test page...
✅ Session captured: sess_abc123...
🍪 Current cookies: demo=test; timestamp=1234567890

🔄 Step 2: Restoring session...
🍪 Restored cookies: demo=test; timestamp=1234567890
✅ Session restoration successful!
🎉 Demo completed successfully!
```

## File Structure

```
~/.psp/sessions/           # Session storage
├── ab/sess_abc123.json    # Session files (organized by prefix)
└── cd/sess_cdef456.json

packages/
├── core/                  # Core PSP logic
├── adapters/playwright/   # Playwright integration
├── cli/                   # Command line interface
└── server/               # HTTP API server
```

## What's NOT in v0.1

❌ **Skipped for minimal version:**
- Encryption/security
- Multi-browser support (Chrome only)
- Database storage
- Docker deployment
- Advanced CRDT merging
- Network capture/replay
- Complex UI features

These will come in later versions once the core concept is proven.

## Next Steps

1. **Try the demo**: `node examples/playwright-demo.js`
2. **Use in your projects**: `const { launchWithPSP } = require('@psp/adapter-playwright')`
3. **Report issues**: GitHub Issues for bugs/feedback
4. **Extend**: Fork and add your own adapters

---

**Need help?** Check the examples/ folder or run `psp --help`