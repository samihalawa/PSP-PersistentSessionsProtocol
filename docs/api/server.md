# Server API Reference

The server exposes a REST API for session management.

## Base URL
Default: `http://localhost:3000`

## Endpoints

### `POST /api/v1/sessions`
Create or update a session.

**Body:**
```json
{
  "name": "My Profile",
  "cookies": [...],
  "localStorage": [...],
  "userAgent": "Mozilla/5.0..."
}
```

### `POST /api/v1/sessions/:id/connect`
Launch a browser instance for a specific session.

**Response:**
```json
{
  "browserId": "uuid",
  "browserWSEndpoint": "ws://server:port/devtools/browser/..."
}
```
**Usage:** Connect your automation tool (Playwright/Puppeteer) to `browserWSEndpoint`.

### `DELETE /api/v1/browsers/:id`
Stop a running browser instance.
