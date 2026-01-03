# Browser Session Upload & Persistence Workflows

## Overview

This document describes various approaches for uploading, persisting, and restoring browser sessions across automation frameworks. These workflows serve as reference implementations for PSP.

---

## 1. Browser-Use Profile Upload (Official)

### Quick Start Command

```bash
export BROWSER_USE_API_KEY=bu_YOUR_API_KEY_HERE
curl -fsSL https://browser-use.com/profile.sh | sh
```

### How It Works

The `profile.sh` script:
1. Detects your OS (Linux, macOS, Windows) and architecture (x86_64, ARM64)
2. Downloads the `profile-use` binary from GitHub releases
3. Runs the binary with your API key to upload your Chrome profile

### Script Source

```bash
#!/bin/sh
set -e

REPO="browser-use/profile-use-releases"
BINARY_NAME="profile-use"
WORK_DIR="${TMPDIR:-$HOME/.cache/profile-use-installer}"

cleanup() {
    [ -f "$TMP_FILE" ] && rm -f "$TMP_FILE"
}
trap cleanup EXIT INT TERM

detect_os() {
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    case "$OS" in
        linux*)   OS='linux' ;;
        darwin*)  OS='darwin' ;;
        msys*|mingw*|cygwin*) OS='windows' ;;
    esac
}

detect_arch() {
    ARCH=$(uname -m)
    case "$ARCH" in
        x86_64|amd64) ARCH='amd64' ;;
        aarch64|arm64) ARCH='arm64' ;;
    esac
}

get_latest_version() {
    VERSION=$(curl -s "https://api.github.com/repos/$REPO/releases/latest" | \
              grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
}

download_and_run() {
    mkdir -p "$WORK_DIR"
    BINARY_URL="https://github.com/$REPO/releases/download/$VERSION/${BINARY_NAME}-${OS}-${ARCH}"
    TMP_FILE="$WORK_DIR/$BINARY_NAME"

    curl -fsSL --retry 3 -o "$TMP_FILE" "$BINARY_URL"
    chmod +x "$TMP_FILE"

    # Remove macOS quarantine
    [ "$OS" = "darwin" ] && xattr -d com.apple.quarantine "$TMP_FILE" 2>/dev/null || true

    # Pass API key and run
    [ -n "${BROWSER_USE_API_KEY:-}" ] && export BROWSER_USE_API_KEY
    "$TMP_FILE" </dev/tty
}

main() {
    detect_os
    detect_arch
    get_latest_version
    download_and_run
}
main
```

### What Gets Uploaded

The `profile-use` binary captures and uploads:
- Complete Chrome profile directory
- Cookies and session data
- localStorage and IndexedDB
- Extensions and settings
- Authentication state

### Using Uploaded Profile in Browser-Use

```python
from browser_use import Agent

# Agent automatically uses your uploaded profile
agent = Agent(
    task="Navigate to authenticated page",
    use_profile=True  # Uses profile linked to API key
)
await agent.run()
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `BROWSER_USE_API_KEY` | Your browser-use API key (required) |
| `PROFILE_USE_VERSION` | Override specific version (optional) |

### PSP Relevance

This is the cleanest example of profile upload workflow:
1. One-liner installation
2. Binary handles complexity
3. API key links profile to account
4. Seamless integration with automation framework

---

## 2. Browserbase Context Persistence

### Creating a Persistent Context

```bash
# Create a new context via API
curl -X POST https://api.browserbase.com/v1/contexts \
  -H "X-BB-API-Key: $BROWSERBASE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"projectId": "your-project-id"}'
```

Response:
```json
{
  "id": "ctx_abc123",
  "projectId": "proj_xyz",
  "createdAt": "2024-12-30T12:00:00Z",
  "status": "active"
}
```

### Using Context in Session

```javascript
import Browserbase from "@browserbasehq/sdk";

const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY });

// Create session with persistent context
const session = await bb.sessions.create({
  projectId: "your-project-id",
  browserSettings: {
    context: {
      id: "ctx_abc123",  // Reuse existing context
      persist: true       // Save changes after session
    }
  }
});

// Session inherits cookies, localStorage, IndexedDB from context
```

### Context State Components

| Component | Persisted | Notes |
|-----------|-----------|-------|
| Cookies | ✅ | All attributes preserved |
| localStorage | ✅ | Full key-value store |
| sessionStorage | ❌ | Ephemeral by design |
| IndexedDB | ✅ | All databases |
| Service Workers | ✅ | Registrations only |
| Browser History | ❌ | Not captured |

---

## 2. Chrome Profile Upload Script

### Profile Zip and Upload Pattern

```bash
#!/bin/bash
# chrome-profile-upload.sh

# Configuration
CHROME_PROFILE_DIR="$HOME/Library/Application Support/Google/Chrome/Default"
UPLOAD_ENDPOINT="https://your-session-api.com/upload"
API_KEY="${SESSION_API_KEY}"

# Create temporary directory
TEMP_DIR=$(mktemp -d)
ZIP_FILE="$TEMP_DIR/chrome-profile.zip"

# Select which components to include
echo "Creating profile archive..."

# Core session data (always include)
SESSION_DIRS=(
  "Cookies"
  "Local Storage"
  "Session Storage"
  "IndexedDB"
  "Service Worker"
)

# Create zip with selected directories
cd "$CHROME_PROFILE_DIR"
zip -r "$ZIP_FILE" "${SESSION_DIRS[@]}" 2>/dev/null

# Calculate hash for integrity
HASH=$(shasum -a 256 "$ZIP_FILE" | cut -d' ' -f1)

# Upload to session service
echo "Uploading profile ($(du -h "$ZIP_FILE" | cut -f1))..."
curl -X POST "$UPLOAD_ENDPOINT" \
  -H "Authorization: Bearer $API_KEY" \
  -H "X-Profile-Hash: $HASH" \
  -F "profile=@$ZIP_FILE" \
  -F "metadata={\"source\":\"chrome-default\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"

# Cleanup
rm -rf "$TEMP_DIR"

echo "Profile uploaded successfully"
```

### Profile Download and Restore

```bash
#!/bin/bash
# chrome-profile-restore.sh

DOWNLOAD_ENDPOINT="https://your-session-api.com/download"
PROFILE_ID="${1:-latest}"
TARGET_DIR="${2:-/tmp/chrome-restored-profile}"

# Create target directory
mkdir -p "$TARGET_DIR"

# Download profile
echo "Downloading profile $PROFILE_ID..."
curl -X GET "$DOWNLOAD_ENDPOINT/$PROFILE_ID" \
  -H "Authorization: Bearer $API_KEY" \
  -o "$TARGET_DIR/profile.zip"

# Extract
cd "$TARGET_DIR"
unzip -o profile.zip

# Start Chrome with restored profile
echo "Starting Chrome with restored profile..."
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --user-data-dir="$TARGET_DIR" \
  --remote-debugging-port=9222
```

---

## 3. Playwright Storage State Workflow

### Capture and Save

```typescript
import { chromium, BrowserContext } from 'playwright';

async function captureSession(context: BrowserContext, outputPath: string) {
  // Native storage state capture
  const storageState = await context.storageState();

  // Save to file
  await fs.promises.writeFile(
    outputPath,
    JSON.stringify(storageState, null, 2)
  );

  console.log(`Session saved to ${outputPath}`);
}

// Usage
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

// ... perform login actions ...

await captureSession(context, './auth-session.json');
```

### Restore and Use

```typescript
async function restoreSession(sessionPath: string) {
  const browser = await chromium.launch();

  const context = await browser.newContext({
    storageState: sessionPath
  });

  // Context now has restored cookies and localStorage
  return context;
}
```

### Storage State Format

```json
{
  "cookies": [
    {
      "name": "session_id",
      "value": "abc123...",
      "domain": ".example.com",
      "path": "/",
      "expires": 1735689600,
      "httpOnly": true,
      "secure": true,
      "sameSite": "Lax"
    }
  ],
  "origins": [
    {
      "origin": "https://example.com",
      "localStorage": [
        {
          "name": "user_preferences",
          "value": "{\"theme\":\"dark\"}"
        }
      ]
    }
  ]
}
```

---

## 4. Anchor Browser Profile API

### Profile Creation

```typescript
import { AnchorBrowser } from 'anchor-browser-sdk';

const anchor = new AnchorBrowser({ apiKey: process.env.ANCHOR_API_KEY });

// Create named profile
const profile = await anchor.profiles.create({
  name: "my-authenticated-profile",
  description: "Profile with logged-in state for app.example.com"
});

// Use profile in automation
const browser = await anchor.launch({
  profileId: profile.id
});
```

### Profile Persistence Model

```
┌─────────────────────────────────────────────┐
│              Anchor Browser API              │
├─────────────────────────────────────────────┤
│  Profile Storage (Cloud)                     │
│  ├── Cookies                                 │
│  ├── localStorage                            │
│  ├── IndexedDB                               │
│  └── Browser Extensions                      │
├─────────────────────────────────────────────┤
│  Linked to: datingAccounts.browserProfileName│
│  (App stores only profile reference)         │
└─────────────────────────────────────────────┘
```

---

## 5. GoLogin Profile Export/Import

### Export Profile

```python
from gologin import GoLogin

gl = GoLogin({
    "token": os.environ["GOLOGIN_TOKEN"]
})

# Export profile to local file
profile_data = gl.profile.get("profile_id_here")
with open("profile_export.json", "w") as f:
    json.dump(profile_data, f)

# Download profile files (cookies, storage, etc.)
gl.profile.download("profile_id_here", "./profile_files/")
```

### Import Profile

```python
# Upload profile files
gl.profile.upload("new_profile_id", "./profile_files/")

# Or create from exported data
new_profile = gl.profile.create({
    "name": "Imported Profile",
    "os": "win",
    "navigator": profile_data["navigator"],
    "proxy": profile_data.get("proxy"),
    # ... other settings
})
```

---

## 6. Generic Session Capture Script

### Universal Browser Session Capture

```javascript
// run in browser console or via Puppeteer/Playwright
async function captureSessionState() {
  const sessionState = {
    version: "1.0",
    timestamp: new Date().toISOString(),
    url: window.location.href,

    // Cookies (requires document.cookie access)
    cookies: document.cookie.split(';').map(c => {
      const [name, value] = c.trim().split('=');
      return { name, value };
    }),

    // localStorage
    localStorage: Object.fromEntries(
      Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])
    ),

    // sessionStorage
    sessionStorage: Object.fromEntries(
      Object.keys(sessionStorage).map(key => [key, sessionStorage.getItem(key)])
    ),

    // IndexedDB databases list
    indexedDBDatabases: await indexedDB.databases?.() || []
  };

  return sessionState;
}

// Export as JSON
const state = await captureSessionState();
console.log(JSON.stringify(state, null, 2));
```

### Session Restore Script

```javascript
async function restoreSessionState(sessionState) {
  // Restore localStorage
  if (sessionState.localStorage) {
    Object.entries(sessionState.localStorage).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
  }

  // Restore sessionStorage
  if (sessionState.sessionStorage) {
    Object.entries(sessionState.sessionStorage).forEach(([key, value]) => {
      sessionStorage.setItem(key, value);
    });
  }

  // Note: Cookies must be set via browser automation API
  // document.cookie only has limited access

  console.log('Session state restored');
}
```

---

## 7. PSP Integration Targets

Based on these workflows, PSP should support:

### Input Formats
- Playwright storage state JSON
- Chrome profile directory
- Browserbase context export
- GoLogin profile format
- Raw session capture JSON

### Output Formats
- PSP native format (JSON)
- Playwright compatible
- Puppeteer cookie array
- Chrome profile structure

### API Patterns
```typescript
// PSP Session API (proposed)
import { PSPClient } from '@psp/client';

const psp = new PSPClient({ storage: 'local' });

// Save current session
await psp.sessions.save({
  name: "my-session",
  source: "playwright",
  context: playwrightContext
});

// List sessions
const sessions = await psp.sessions.list();

// Restore session
const restoredContext = await psp.sessions.restore({
  name: "my-session",
  target: "puppeteer"
});
```

---

## References

- Browserbase Contexts API: https://docs.browserbase.com/features/sessions/contexts
- Playwright Auth: https://playwright.dev/docs/auth
- GoLogin API: https://api.gologin.com/docs
- Chrome User Data Dir: https://chromium.googlesource.com/chromium/src/+/HEAD/docs/user_data_dir.md

---

*Last Updated: 2025-12-30*
