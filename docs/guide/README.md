# Introduction

The PersistentSessionsProtocol (PSP) provides a standardized way to save, share, and restore browser sessions across different automation frameworks and environments. This guide will help you understand how PSP works and how to use it in your projects.

## What is PSP?

Today's browser automation tools handle session persistence in fundamentally different ways, creating interoperability problems for developers. PSP solves this by establishing a unified method for capturing, storing, and replaying browser sessions across tools like Playwright, Selenium, Skyvern, and more.

### Key Problems PSP Solves

1. **Authentication Friction**: Eliminate the need to repeatedly authenticate during testing or automation by persisting logged-in sessions.
2. **Cross-Framework Compatibility**: Use the same session across different automation tools.
3. **Environment Independence**: Capture a session on one machine and restore it on another, even with different operating systems.
4. **Testing Reliability**: Reduce flakiness in tests that depend on authentication or specific state.
5. **Developer Experience**: Simplify workflows that require persistent browser state.

## Core Components

PSP consists of several key components:

### Session Capture Layer

Extracts browser state using multiple mechanisms:
- Storage APIs (cookies, localStorage, sessionStorage)
- DOM state
- Navigation history
- User interactions

### Storage Layer

Persists session data with support for multiple backends:
- Local filesystem
- Redis
- Databases (SQL/NoSQL)
- Cloud object storage

### Replay Layer

Restores saved sessions across environments:
- Direct state application
- Event replay for user interactions
- Network simulation

### Adapters

Framework-specific adapters translate between PSP's standardized data structures and the framework's native capabilities:
- Playwright Adapter
- Selenium Adapter
- Additional adapters for other frameworks

## When to Use PSP

PSP is particularly valuable in these scenarios:

- **Automated Testing**: Skip login steps in your test suite by reusing authenticated sessions.
- **Test Development**: Quickly prototype tests without repeatedly navigating through authentication flows.
- **Cross-Browser Testing**: Capture a session in one browser and replay it in others.
- **AI Agents**: Allow AI-powered agents to maintain state between sessions.
- **Web Scraping**: Resume scrapers from where they left off, even after crashes or restarts.
- **Debugging**: Reproduce specific browser states for troubleshooting.

## Next Steps

- [Getting Started](./getting-started.md): Quick start guide and installation instructions
- [Installation](./installation.md): Detailed installation instructions for different environments
- [Configuration](./configuration.md): Configuration options and customization
- [Usage](./usage.md): Common usage patterns and recipes