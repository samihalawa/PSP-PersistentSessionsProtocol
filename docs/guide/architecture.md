# Architecture

PSP consists of three main components:

## 1. The Protocol (JSON Schema)
A standardized JSON format for representing a browser session.

```typescript
interface SessionProfile {
  id: string;
  cookies: Cookie[];
  localStorage: StorageEntry[];
  userAgent: string;
  viewport: { width: number, height: number };
}
```

## 2. The Server
A Node.js/Express application that:
- Acts as a **Registry** for sessions.
- Acts as a **Browser Host** (using Puppeteer/Docker).
- Exposes a **CDP (Chrome DevTools Protocol)** WebSocket proxy.

## 3. The Adapters (CLI & SDKs)
- **CLI**: Uses `chrome-launcher` and raw CDP to extract data from local browsers.
- **SDKs**: Wrappers for `axios` to talk to the PSP Server API.

## Diagram

```mermaid
graph LR
    A[Local Chrome] -->|PSP CLI| B(PSP Server)
    B -->|Storage| C[JSON/DB]
    D[AI Agent / Script] -->|SDK| B
    B -->|Launches| E[Remote Browser Container]
    D -.->|WebSocket (CDP)| E
```
