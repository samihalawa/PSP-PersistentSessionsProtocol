# PSP Playwright Demo

This is a demonstration of the Persistent Sessions Protocol (PSP) with Playwright, showing how browser sessions can be captured and restored across different pages and contexts.

## Quick Start

1. **Install Dependencies**:

```bash
npm install
# Install Playwright browsers if needed
npx playwright install
```

2. **Capture a Session**:

```bash
# Capture a generic session
npm run capture https://example.com

# Capture a login session (replace with your credentials)
npm run capture https://github.com/login username password
```

3. **View Available Sessions**:

```bash
npm run list
```

4. **Restore a Session**:

```bash
npm run restore <session-id>
```

5. **Verify Session Integrity**:

```bash
npm run verify <session-id>
```

## Detailed Usage

### Session Demo

The main file `session-demo.js` provides a complete implementation that demonstrates core PSP functionality:

```bash
# Basic commands
node session-demo.js                         # Show help
node session-demo.js list                    # List all saved sessions
node session-demo.js capture [url]           # Capture a new session
node session-demo.js restore <session-id>    # Restore a saved session

# Examples
node session-demo.js capture https://example.com                      # Capture example.com state
node session-demo.js capture https://github.com/login username pass   # Capture authenticated state
```

### Session Verification

The `verify-session.js` script validates that a captured session can be correctly restored:

```bash
node verify-session.js <session-id> [storage-path]
```

This tool checks that:
- localStorage values are properly restored
- sessionStorage values are properly restored
- Cookies are properly restored (where possible)

## How It Works

### Session Capture Process

1. Navigate to a URL in a fresh browser instance
2. Optionally perform user actions (login, interaction, etc.)
3. Extract browser state:
   - cookies
   - localStorage
   - sessionStorage
   - URL and origin
4. Serialize the state to JSON
5. Store the session data locally (with a unique ID)

### Session Restoration Process

1. Create a fresh browser instance
2. Load the saved session data
3. Navigate to the origin URL
4. Apply the saved browser state:
   - Set cookies
   - Populate localStorage
   - Populate sessionStorage
5. Navigate to the final URL

## Configuration

Edit `config.js` to customize how sessions are stored and managed.

## Remote Storage Support

You can configure remote storage in `config.js` to use:

- Cloudflare Workers (KV, R2, Durable Objects)
- S3-compatible storage (AWS S3, MinIO, etc.)
- Supabase Storage

To enable remote storage, update the relevant section in `config.js` and set `enabled: true`.

## Real-World Applications

PSP enables several powerful workflows:

1. **Testing Acceleration**:
   - Skip repetitive setup/login steps in automated tests
   - Reuse authentication across test runs

2. **Debugging and Reproduction**:
   - Capture problematic browser states for debugging
   - Share session states between developer environments

3. **Multi-Environment Development**:
   - Move sessions between devices or browsers
   - Preserve complex application states

4. **Continuous Integration**:
   - Pre-populate test environments with authenticated sessions
   - Reduce flakiness in CI/CD pipelines

## Example Output

Here's sample output from the demo:

```
$ node session-demo.js capture https://example.com
🌐 Navigating to https://example.com
💾 Set demo localStorage values
📸 Capturing session: example.com-session (a1b2c3d4)
✅ Session saved: a1b2c3d4
📋 Session ID: a1b2c3d4

✨ To restore this session, run:
node session-demo.js restore a1b2c3d4
```

Example verification output:

```
$ node verify-session.js a1b2c3d4
🔍 Session Verification
=====================
Session ID: a1b2c3d4
Name: example.com-session
Origin: https://example.com
Captured: 5/16/2025, 10:15:30 AM
=====================
🌐 Navigated to https://example.com

📦 TESTING LOCAL STORAGE RESTORATION
Verification Results:
  ✅ psp-demo-value1: This is a test value == This is a test value
  ✅ psp-demo-value2: Another test value == Another test value
  ✅ psp-timestamp: 1747418568956 == 1747418568956
  ✅ psp-random: 0.12345678 == 0.12345678

🗄️ TESTING SESSION STORAGE RESTORATION
  ℹ️ No sessionStorage items to verify

🍪 TESTING COOKIE RESTORATION
  ℹ️ No domain-specific cookies to verify

📝 VERIFICATION SUMMARY:
  • Local Storage: ✅ All values match
  • Session Storage: ✅ All values match
  • Cookies: ℹ️ Not tested

🏁 FINAL RESULT:
  ✅ PASS - All tests passed!
```

## What's Next?

This demonstration covers the basic principles of PSP. A full implementation would include:

1. **More Storage Backends**: Support for all popular cloud storage options
2. **More Frameworks**: Support for Selenium, Puppeteer, Cypress, and others
3. **Enhanced State Capture**: Support for IndexedDB, WebSQL, FileSystem API, etc.
4. **User Interaction Recording**: Capture and replay user actions
5. **Security Features**: Encryption and access controls for sensitive session data
6. **Cloud Service**: Hosted API service for managing persistent sessions

## Contributing

Contributions are welcome! The PSP project is designed to be extended for:
- New browser automation frameworks
- Additional storage providers
- Enhanced state capture techniques
- Security improvements

For more information on the Persistent Sessions Protocol, visit the [main repository](https://github.com/samihalawa/PSP-PersistentSessionsProtocol).