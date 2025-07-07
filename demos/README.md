# PSP Demos and Examples

This directory contains comprehensive demonstrations and examples of the PersistentSessionsProtocol (PSP) implementation.

## Directory Structure

```
demos/
├── chrome-profiles/     # Chrome profile persistence demos
├── testing/            # Test scripts and experimental code
└── README.md          # This file
```

## Chrome Profile Demos

### Core Demos

- **`demo-psp-working.js`** - Complete working PSP implementation
  - Full session capture and restore
  - Chrome profile persistence
  - Session management CLI
  - Production-ready example

- **`capture-current-chrome-session.js`** - Real-time session capture
  - Captures current Chrome session state
  - Multi-site data collection
  - Comprehensive verification
  - Command-line interface

- **`chrome-profile-demo.js`** - Basic Chrome profile demonstration
  - Simple session creation
  - Profile-based persistence
  - Educational example

### Specialized Demos

- **`demo-psp-final.js`** - Final implementation showcase
- **`demo-chrome-headless.js`** - Headless Chrome examples
- **`demo-chrome-psp.js`** - PSP-specific Chrome integration
- **`demo-simple.js`** - Minimal implementation example

## Usage Examples

### Run Complete Demo

```bash
# Full workflow demonstration
node demos/chrome-profiles/demo-psp-working.js

# List existing sessions
node demos/chrome-profiles/demo-psp-working.js list

# Load specific session
node demos/chrome-profiles/demo-psp-working.js load <session-id>
```

### Capture Current Chrome Session

```bash
# Capture current session
node demos/chrome-profiles/capture-current-chrome-session.js capture

# Run full capture and restore demo
node demos/chrome-profiles/capture-current-chrome-session.js

# List captured sessions
node demos/chrome-profiles/capture-current-chrome-session.js list
```

### Basic Chrome Profile Demo

```bash
# Simple profile demonstration
node demos/chrome-profiles/chrome-profile-demo.js
```

## Key Features Demonstrated

### Session Persistence
- ✅ Chrome profile-based persistence
- ✅ localStorage preservation
- ✅ Cookie management
- ✅ sessionStorage handling
- ✅ Browser state continuity

### Cross-Session Compatibility
- ✅ Session restoration after browser restart
- ✅ Profile isolation
- ✅ Multi-site data capture
- ✅ Authentication state preservation

### Management Features
- ✅ Session listing and metadata
- ✅ Session cleanup and organization
- ✅ Command-line interface
- ✅ Error handling and recovery

## Session Storage

All demos use the PSP session storage structure:

```
~/.psp/
├── sessions/           # Session metadata files
│   ├── session-1.json
│   └── session-2.json
└── profiles/           # Chrome profile directories
    ├── session-1/      # Complete Chrome user data
    └── session-2/
```

## Testing Directory

The `testing/` directory contains experimental scripts and test implementations:

- Various Chrome automation approaches
- CDP (Chrome DevTools Protocol) experiments
- Profile management tests
- Session validation scripts

## Integration Examples

### With Testing Frameworks

```javascript
// Jest integration example
beforeAll(async () => {
  const { launchWithPSP } = require('./demos/chrome-profiles/demo-psp-working');
  const { context, session } = await launchWithPSP();
  // Setup authenticated session
});
```

### With CI/CD

```yaml
# GitHub Actions example
- name: Setup PSP Session
  run: node demos/chrome-profiles/demo-psp-working.js
```

## Best Practices

1. **Session Naming**: Use descriptive names for easy identification
2. **Profile Cleanup**: Regularly clean up old sessions
3. **Error Handling**: Always handle session load failures gracefully
4. **Resource Management**: Close contexts properly to free resources
5. **Security**: Don't commit session files with sensitive data

## Troubleshooting

### Common Issues

1. **Profile Lock**: Chrome profile locked by another process
   - Solution: Close all Chrome instances before running demos

2. **Permission Errors**: Cannot access profile directory
   - Solution: Check file permissions on ~/.psp directory

3. **Session Not Found**: Session ID doesn't exist
   - Solution: Use `list` command to see available sessions

### Debug Mode

Run demos with debug output:

```bash
DEBUG=psp:* node demos/chrome-profiles/demo-psp-working.js
```

## Contributing

When adding new demos:

1. Place Chrome-specific demos in `chrome-profiles/`
2. Place experimental code in `testing/`
3. Update this README with new examples
4. Include comprehensive error handling
5. Add CLI interface where appropriate

## Related Documentation

- [Main README](../README.md) - Project overview
- [Protocol Documentation](../docs/protocol/README.md) - Technical specification
- [Getting Started Guide](../docs/guide/getting-started.md) - Usage instructions
- [Reference Article](../docs/articletouseasreferenceandhelp.md) - Complete implementation guide
