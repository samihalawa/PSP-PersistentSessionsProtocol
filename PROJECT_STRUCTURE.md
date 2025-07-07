# PSP Project Structure

This document provides a comprehensive overview of the PersistentSessionsProtocol (PSP) project structure.

## Directory Overview

```
PSP-PersistentSessionsProtocol/
├── demos/                      # Demonstrations and examples
│   ├── chrome-profiles/        # Chrome profile persistence demos
│   ├── testing/               # Test scripts and experiments
│   └── README.md              # Demo documentation
├── docs/                      # Project documentation
│   ├── examples/              # Usage examples
│   ├── guide/                 # User guides
│   ├── protocol/              # Protocol specification
│   ├── articletouseasreferenceandhelp.md  # Complete reference
│   └── README.md              # Documentation index
├── examples/                  # Additional examples
├── ops/                       # Operations and project management
├── packages/                  # Core packages and modules
│   ├── adapters/              # Framework adapters
│   ├── cli/                   # Command-line interface
│   ├── core/                  # Core PSP functionality
│   ├── server/                # PSP server implementation
│   └── ...                    # Additional packages
├── scripts/                   # Utility scripts
├── src/                       # Legacy source code
└── tests/                     # Test files
```

## Core Components

### 1. Demos (`demos/`)

**Purpose**: Comprehensive demonstrations of PSP functionality

#### Chrome Profiles (`demos/chrome-profiles/`)
- `demo-psp-working.js` - Complete working PSP implementation
- `capture-current-chrome-session.js` - Real-time session capture
- `chrome-profile-demo.js` - Basic Chrome profile demonstration
- `demo-psp-final.js` - Final implementation showcase
- `demo-chrome-headless.js` - Headless Chrome examples
- `demo-chrome-psp.js` - PSP-specific Chrome integration
- `demo-simple.js` - Minimal implementation example

#### Testing (`demos/testing/`)
- Various experimental scripts and test implementations
- CDP (Chrome DevTools Protocol) experiments
- Profile management tests
- Session validation scripts

### 2. Documentation (`docs/`)

**Purpose**: Comprehensive project documentation

#### Structure
- `README.md` - Main documentation index
- `articletouseasreferenceandhelp.md` - Complete implementation reference
- `examples/` - Usage examples for different frameworks
- `guide/` - User guides and tutorials
- `protocol/` - Technical protocol specification

#### Key Documents
- **Protocol Specification** (`protocol/README.md`) - Technical details
- **Getting Started Guide** (`guide/getting-started.md`) - Quick start
- **Reference Article** (`articletouseasreferenceandhelp.md`) - Complete guide
- **Examples** (`examples/playwright.md`) - Framework-specific examples

### 3. Packages (`packages/`)

**Purpose**: Modular PSP implementation

#### Core Packages
- **`core/`** - Core PSP functionality and types
- **`adapters/`** - Framework-specific adapters
  - `playwright/` - Playwright integration
  - `selenium/` - Selenium integration
  - `puppeteer/` - Puppeteer integration
- **`cli/`** - Command-line interface
- **`server/`** - PSP server implementation
- **`client-js/`** - JavaScript client library
- **`client-python/`** - Python client library

### 4. Scripts (`scripts/`)

**Purpose**: Utility scripts for project maintenance

#### Available Scripts
- `cleanup-sessions.js` - Session cleanup utility
- `README.md` - Script documentation

### 5. Operations (`ops/`)

**Purpose**: Project management and operations

#### Contents
- Project setup documentation
- Task management
- GitHub project configuration
- Master plan and roadmap

## Package Scripts

### Development
```bash
npm run build          # Build all packages
npm run test           # Run tests
npm run lint           # Lint code
npm run format         # Format code
```

### PSP Operations
```bash
npm run psp:demo       # Run complete PSP demo
npm run psp:capture    # Capture current Chrome session
npm run psp:list       # List all sessions
npm run psp:cleanup    # Clean up old sessions
npm run psp:sessions   # Show session details
```

### Documentation
```bash
npm run docs:dev       # Start documentation server
npm run docs:build     # Build documentation
```

## Session Storage Structure

PSP sessions are stored in the user's home directory:

```
~/.psp/
├── sessions/          # Session metadata files
│   ├── session-1.json # Session metadata
│   └── session-2.json
└── profiles/          # Chrome profile directories
    ├── session-1/     # Complete Chrome user data
    │   └── Default/   # Chrome profile contents
    └── session-2/
        └── Default/
```

## Key Features by Directory

### Demos
- ✅ Complete working examples
- ✅ Real-time session capture
- ✅ Chrome profile persistence
- ✅ Session management CLI
- ✅ Cross-site data capture

### Documentation
- ✅ Protocol specification
- ✅ Implementation guides
- ✅ Framework examples
- ✅ Best practices
- ✅ Troubleshooting

### Packages
- ✅ Modular architecture
- ✅ Framework adapters
- ✅ Core functionality
- ✅ Server implementation
- ✅ Client libraries

### Scripts
- ✅ Session cleanup
- ✅ Maintenance utilities
- ✅ Automation tools

## Development Workflow

### 1. Getting Started
```bash
# Clone repository
git clone <repository-url>
cd PSP-PersistentSessionsProtocol

# Install dependencies
npm run install:all

# Run demo
npm run psp:demo
```

### 2. Development
```bash
# Build packages
npm run build

# Run tests
npm run test

# Start development server
npm run dev:server
```

### 3. Session Management
```bash
# Capture current Chrome session
npm run psp:capture

# List all sessions
npm run psp:list

# Clean up old sessions
npm run psp:cleanup
```

## Integration Points

### Framework Adapters
- **Playwright**: `packages/adapters/playwright/`
- **Selenium**: `packages/adapters/selenium/`
- **Puppeteer**: `packages/adapters/puppeteer/`

### Storage Backends
- **Local**: File system storage
- **Redis**: In-memory database
- **Database**: SQL/NoSQL support
- **Cloud**: Object storage

### APIs
- **REST**: HTTP API for session management
- **WebSocket**: Real-time session updates
- **CLI**: Command-line interface
- **SDK**: Client libraries

## Best Practices

### File Organization
1. **Demos**: Place working examples in `demos/`
2. **Documentation**: Keep docs updated in `docs/`
3. **Packages**: Modular code in `packages/`
4. **Scripts**: Utilities in `scripts/`

### Development
1. **Testing**: Write tests for new features
2. **Documentation**: Update docs with changes
3. **Examples**: Provide working examples
4. **Error Handling**: Comprehensive error handling

### Session Management
1. **Naming**: Use descriptive session names
2. **Cleanup**: Regular session cleanup
3. **Security**: Protect sensitive session data
4. **Monitoring**: Track session sizes and usage

## Contributing

### Adding New Features
1. Create implementation in appropriate `packages/` directory
2. Add demo in `demos/` directory
3. Update documentation in `docs/`
4. Add utility scripts if needed
5. Update this structure document

### File Naming Conventions
- **Demos**: `demo-*.js` or descriptive names
- **Tests**: `test-*.js` or `*.test.js`
- **Scripts**: Descriptive names with `.js` extension
- **Documentation**: `.md` files with clear names

## Related Files

- [Main README](README.md) - Project overview
- [Demo Documentation](demos/README.md) - Demo usage
- [Script Documentation](scripts/README.md) - Utility scripts
- [Protocol Specification](docs/protocol/README.md) - Technical details
