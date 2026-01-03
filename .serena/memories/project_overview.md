# PSP - Persistent Sessions Protocol

## Purpose
A standardized protocol for browser automation tools to save, share, and restore session data across different frameworks and machines. Provides framework-agnostic persistence of browser state.

## Tech Stack
- **Language**: TypeScript (ES2022, NodeNext modules)
- **Package Manager**: npm with workspaces (monorepo)
- **Runtime**: Node.js
- **Additional**: Python SDK available

## Monorepo Structure
```
packages/
├── types/       - Shared TypeScript types
├── adapters/    - Framework adapters (Playwright, Puppeteer, CDP)
├── server/      - REST/WebSocket server
├── cli/         - Command-line interface
├── mcp-server/  - MCP server integration
├── sdk-node/    - Node.js SDK
└── sdk-python/  - Python SDK
```

## Key Concepts
- **Session Capture Layer** - Extracts state via browser-specific adapters
- **Serialization Layer** - Data encoding/transport
- **Storage Layer** - Persistent session storage
- **Replay Layer** - Session restoration across environments
