# PSP Storage Worker

A Cloudflare Worker for storing and managing Persistent Sessions Protocol (PSP) sessions.

## Features

- **REST API** for persistent browser sessions
- **Multiple Storage Options**:
  - Cloudflare KV for small sessions
  - Cloudflare R2 for large sessions
  - Durable Objects for transactional operations
- **Security**:
  - API key authentication
  - CORS configuration
  - Session expiration
- **Efficiency**:
  - Automatic selection of storage backend based on session size
  - Caching for faster responses
  - Scheduled cleanup for expired sessions

## Deployment

### Prerequisites

- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed
- Cloudflare account with Workers enabled
- KV namespace for session storage

### Configuration

1. Edit `wrangler.toml` with your KV namespace ID and other settings:

```toml
# Replace these values with your own KV namespace IDs
[[env.production.kv_namespaces]]
binding = "PSP_SESSIONS"
id = "your-production-kv-id"

[[env.development.kv_namespaces]]
binding = "PSP_SESSIONS"
id = "your-preview-kv-id"
```

2. (Optional) Add R2 bucket for large sessions:

```toml
[[env.production.r2_buckets]]
binding = "PSP_SESSIONS_BUCKET"
bucket_name = "psp-sessions"
```

3. Set API keys for secure access:

```bash
# Using the Wrangler CLI to set secrets (recommended)
wrangler secret put API_KEYS

# Enter comma-separated API keys when prompted
# Example: "key1,key2,key3"
```

### Deployment Steps

```bash
# Deploy to development environment
wrangler deploy -e development

# Deploy to production
wrangler deploy -e production
```

## Storage Options

This worker intelligently uses different storage backends based on your needs:

### KV Storage (default)

Cloudflare KV is used by default for storing sessions. It's ideal for:
- Small to medium-sized sessions (< 128KB by default, configurable)
- High read performance with global distribution
- Basic CRUD operations

### R2 Storage (optional)

For larger sessions, you can enable R2 storage:

1. Create an R2 bucket:
```bash
wrangler r2 bucket create psp-sessions
```

2. Configure the R2 bucket in `wrangler.toml`

The worker automatically:
- Uses KV for small sessions and metadata
- Uses R2 for larger sessions (>128KB by default)
- Maintains consistent APIs regardless of storage backend

### Durable Objects (optional)

For applications requiring transactional consistency:

1. Enable Durable Objects in `wrangler.toml`
2. Add the necessary migrations

Durable Objects provide:
- Strong consistency guarantees
- Transactional operations
- Complex session operations

## API Endpoints

### Session Management

- **GET /sessions** - List all sessions
  - Query parameters:
    - `prefix` - Filter by prefix
    - `limit` - Maximum number of results (default: 100)
    - `cursor` - Pagination cursor
  - Returns:
    ```json
    {
      "sessions": [
        { "id": "session1", "metadata": { "name": "Session 1", ... } },
        { "id": "session2", "metadata": { "name": "Session 2", ... } }
      ],
      "cursor": "next-cursor-id",
      "hasMore": true
    }
    ```

- **POST /sessions** - Create a new session
  - Body:
    ```json
    {
      "id": "optional-custom-id",
      "data": {
        "storage": {
          "cookies": [...],
          "localStorage": {...},
          "sessionStorage": {...}
        },
        "url": "https://example.com/page",
        "origin": "https://example.com"
      },
      "name": "My Session",
      "description": "Description of this session",
      "tags": ["tag1", "tag2"],
      "expireAfter": 86400
    }
    ```
  - Returns:
    ```json
    {
      "id": "generated-or-custom-id",
      "created": true,
      "size": 1024
    }
    ```

- **GET /sessions/:id** - Get a specific session
  - Returns the complete session data

- **PUT /sessions/:id** - Update a session
  - Body format is the same as for creating a session
  - Returns confirmation of update

- **DELETE /sessions/:id** - Delete a session
  - Returns confirmation of deletion

### Health Check

- **GET /health** or **GET /** - Check service status
  - Returns:
    ```json
    {
      "status": "ok",
      "version": "1.0.0"
    }
    ```

## Authentication

Authentication is highly recommended for production deployments:

### API Key Configuration

1. Set API keys using one of these methods:
   - Directly in `wrangler.toml` (development only):
     ```toml
     [vars]
     API_KEYS = "key1,key2,key3"
     ```
   - Using Wrangler secrets (recommended for production):
     ```bash
     wrangler secret put API_KEYS
     # Enter your comma-separated API keys
     ```

2. Include the API key in requests using either:
   - `Authorization: Bearer your-api-key` header
   - `X-API-Key: your-api-key` header

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_KEYS` | Comma-separated list of valid API keys | none |
| `MAX_KV_SIZE_KB` | Maximum size for KV storage before using R2 | `128` |
| `ENABLE_CORS` | Whether to enable CORS | `true` |
| `DEFAULT_EXPIRATION` | Default expiration time (seconds) | `0` (no expiration) |
| `DEBUG` | Enable debug logging | `false` |

## Client Integration

Using the worker with the PSP core library:

```javascript
import { createStorageProvider } from '@psp/core';

// Create a storage provider using the cloudflare type
const storage = createStorageProvider({
  type: 'cloudflare',
  endpoint: 'https://your-worker.workers.dev',
  apiKey: 'your-api-key'
});

// Use the storage provider with a PSP client
const psp = new PSPClient({
  storage
});

// Save a session
const sessionId = await psp.captureSession(page);

// Restore a session
await psp.restoreSession(page, sessionId);
```

## Advanced Configuration

### Custom Domain

For a professional deployment with a custom domain:

1. Configure your domain in Cloudflare:
   - Add a CNAME record pointing to `your-worker.workers.dev`
   - Enable Cloudflare proxy (orange cloud)

2. Update the `wrangler.toml` file:
   ```toml
   [env.production]
   routes = [
     { pattern = "api.yourdomain.com/*", zone_id = "your-zone-id" }
   ]
   ```

### Security Best Practices

1. **Always use API keys** in production
2. **Set appropriate CORS settings** to limit origins
3. **Use session expiration** for sensitive sessions
4. **Monitor usage** through Cloudflare Analytics
5. **Consider rate limiting** to prevent abuse

### High-Volume Deployments

For high-traffic applications:
- Use R2 for all session storage to reduce KV operations
- Enable caching with appropriate Cache-Control headers
- Consider a paid Workers plan for higher limits
- Implement request buffering for concurrent writes