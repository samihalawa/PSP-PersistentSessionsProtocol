# Introduction

**PSP (Persistent Sessions Protocol)** is an open standard and toolset for capturing, storing, and transporting browser sessions across different automation frameworks and environments.

## The Problem

In modern browser automation and AI agent development, managing authentication state is a nightmare:
- **Cookie files are brittle**: `cookies.json` doesn't capture LocalStorage or SessionStorage.
- **Browser Profiles are heavy**: Moving gigabytes of Chrome User Data directories is slow and error-prone.
- **Incompatibility**: Playwright profiles don't work in Selenium; Puppeteer sessions break in other tools.

## The PSP Solution

PSP abstracts the session into a transportable, universal format.

1.  **Capture**: The PSP CLI connects to your running Chrome/Edge instance via CDP (Chrome DevTools Protocol) and extracts *everything*—Cookies, LocalStorage, Headers, Fingerprints.
2.  **Store**: The session is stored in a lightweight JSON format on the PSP Server.
3.  **Transport**: Any tool (Python, Node, Go) can request a session ID.
4.  **Restore**: The PSP Server launches a "Remote Browser" container, hydrates it with the session, and gives you a WebSocket endpoint (`ws://...`). You connect your automation tool to this endpoint, and **you are logged in**.
