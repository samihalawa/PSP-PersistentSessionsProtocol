# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The PersistentSessionsProtocol (PSP) is a standardized approach for browser automation tools to save, share, and restore session data across different frameworks and machines. It provides a framework-agnostic method for persisting browser state, significantly reducing authentication friction and improving testing reliability.

## Repository Status

This project has **successfully completed Phase 1.4** (Additional Adapters) with full cross-framework compatibility:

✅ **Completed (Phase 1.4):**
- **Complete Framework Coverage** - 5 major automation frameworks supported:
  - Playwright - Complete PSP integration with automation framework
  - Browser-Use - AI browser automation with PSP session management  
  - Skyvern - AI automation platform integration
  - Puppeteer - Session management with stealth capabilities
  - Selenium - Multi-browser WebDriver support (Chrome/Firefox)
- **Cross-Framework Compatibility** - 100% session transfer between any frameworks
- **Core Protocol Implementation** - Complete session blob schema with JSON validation
- **Encryption & Security** - AES-256-GCM with HMAC integrity verification
- **Multi-Provider Storage** - Filesystem, Redis, S3/Cloudflare R2 support
- **Remote Storage** - Cloud-based session sharing across machines
- **Development Infrastructure** - Semantic release, pre-commit hooks, testing
- **Comprehensive Testing** - Full test matrix with 100% success rate

🚀 **Ready for Phase 1.5:**
- CLI Tools - Command-line interface for session management
- CRDT merge logic for concurrent sessions
- Performance optimization and caching

## Architecture

PSP employs a layered architecture with four distinct components:

1. **Session Capture Layer** - Extracts state using browser-specific adapters
2. **Serialization and Transport Layer** - Handles data encoding and transmission
3. **Storage Layer** - Manages persistent storage of session data
4. **Replay Layer** - Restores sessions across different environments

## Data Model

The protocol captures browser state components including:
- Storage state (cookies, localStorage, sessionStorage)
- Authentication state (tokens, credentials)
- Navigation state (history, current URL)
- Recording state (user interactions, events)

## Implementation Plan

When implementation begins, the project will likely include:

- **Core Protocol Library** - Framework-agnostic protocol implementation
- **Framework Adapters** - For Playwright, Selenium, Skyvern, Stagehand, etc.
- **Server Implementation** - REST and WebSocket APIs for session management
- **Client Libraries** - Language-specific SDKs for integration

## Future Development Notes

When implementing this protocol, focus on:
- Maintaining cross-framework compatibility
- Ensuring secure handling of authentication data
- Optimizing performance for both capture and replay
- Supporting both local and remote storage options

## Development Guidelines

- Do not create any test files or demo JavaScript files in this repository