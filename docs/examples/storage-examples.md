# Storage Provider Examples

The PersistentSessionsProtocol includes several storage providers that can be used to persistently store browser sessions. This document shows how to configure and use each of them.

## Local Storage Provider

The simplest storage provider that stores sessions on the local filesystem.

```typescript
import { LocalStorageProvider } from 'psp';

// Create a local storage provider
const storage = new LocalStorageProvider({
  directory: '/path/to/sessions' // Optional, defaults to ~/.psp/sessions
});

// Now you can use storage.save(), storage.load(), etc.
```

## S3 Storage Provider

For storing sessions in Amazon S3 or S3-compatible services (like MinIO, DigitalOcean Spaces, etc.)

```typescript
import { S3StorageProvider } from 'psp';

// Create an S3 storage provider
const storage = new S3StorageProvider({
  region: 'us-east-1',
  bucket: 'my-session-bucket',
  prefix: 'sessions/', // Optional prefix
  accessKeyId: 'YOUR_ACCESS_KEY', // Optional if using IAM roles
  secretAccessKey: 'YOUR_SECRET_KEY', // Optional if using IAM roles
  
  // For S3-compatible services
  endpoint: 'https://play.min.io', // Optional custom endpoint
  forcePathStyle: true // Optional, use path style for S3-compatible services
});
```

## Cloudflare Storage Provider

For storing sessions using Cloudflare's various storage options (KV, R2, Durable Objects).

```typescript
import { CloudflareStorageProvider } from 'psp';

// Create a Cloudflare KV storage provider
const kvStorage = new CloudflareStorageProvider({
  type: 'kv',
  accountId: 'YOUR_ACCOUNT_ID',
  token: 'YOUR_API_TOKEN',
  container: 'YOUR_KV_NAMESPACE_ID'
});

// Create a Cloudflare R2 storage provider
const r2Storage = new CloudflareStorageProvider({
  type: 'r2',
  accountId: 'YOUR_ACCOUNT_ID',
  token: 'YOUR_API_TOKEN',
  container: 'YOUR_BUCKET_NAME'
});

// Create a Cloudflare Durable Objects storage provider
const doStorage = new CloudflareStorageProvider({
  type: 'do',
  accountId: 'YOUR_ACCOUNT_ID',
  token: 'YOUR_API_TOKEN',
  container: 'YOUR_DURABLE_OBJECT_CLASS'
});
```

## Supabase Storage Provider

For storing sessions using Supabase Storage and optionally using the database for metadata.

```typescript
import { SupabaseStorageProvider } from 'psp';

// Create a Supabase storage provider
const storage = new SupabaseStorageProvider({
  url: 'https://your-project.supabase.co',
  apiKey: 'YOUR_SUPABASE_API_KEY',
  bucket: 'sessions', // Optional, defaults to 'psp-sessions'
  prefix: 'browser-sessions/', // Optional prefix
  useDatabase: true, // Optional, store metadata in database for more efficient querying
  tableName: 'psp_sessions' // Optional, custom table name for metadata
});
```

## Cloud Storage Provider

For storing sessions in major cloud storage services (AWS, GCP, Azure).

```typescript
import { CloudStorageProvider } from 'psp';

// Create an AWS S3 cloud storage provider
const awsStorage = new CloudStorageProvider({
  provider: 'aws',
  aws: {
    region: 'us-east-1',
    bucket: 'my-sessions-bucket',
    prefix: 'sessions/',
    credentials: {
      accessKeyId: 'YOUR_ACCESS_KEY',
      secretAccessKey: 'YOUR_SECRET_KEY'
    }
  },
  compress: true, // Optional, compress data before storage
  encryptionKey: 'YOUR_ENCRYPTION_KEY' // Optional, encrypt data
});

// Create a Google Cloud Storage provider
const gcpStorage = new CloudStorageProvider({
  provider: 'gcp',
  gcp: {
    projectId: 'YOUR_PROJECT_ID',
    bucket: 'my-sessions-bucket',
    prefix: 'sessions/',
    keyFile: '/path/to/service-account-key.json' // or key contents as JSON string
  }
});

// Create an Azure Blob Storage provider
const azureStorage = new CloudStorageProvider({
  provider: 'azure',
  azure: {
    accountName: 'YOUR_STORAGE_ACCOUNT',
    containerName: 'sessions',
    prefix: 'browser-sessions/',
    connectionString: 'YOUR_CONNECTION_STRING' // Or use accountKey instead
  }
});
```

## Storage Orchestrator

For advanced use cases, you can use the StorageOrchestrator to combine multiple storage providers with caching, replication, and fallback support.

```typescript
import { 
  StorageOrchestrator, 
  LocalStorageProvider, 
  S3StorageProvider 
} from 'psp';

// Create a storage orchestrator with local storage as primary
// and S3 as secondary (for backup)
const orchestrator = new StorageOrchestrator({
  primary: new LocalStorageProvider(),
  secondary: [
    new S3StorageProvider({
      region: 'us-east-1',
      bucket: 'session-backups'
    })
  ],
  useCache: true, // Enable in-memory caching
  cacheTtl: 300, // Cache TTL in seconds (5 minutes)
  cacheCapacity: 100, // Maximum number of cached sessions
  replicate: true, // Replicate operations to all providers
  strictConsistency: false // Don't fail if secondary operations fail
});

// Usage is the same as any other storage provider:
// orchestrator.save(), orchestrator.load(), etc.

// You can also perform manual synchronization:
await orchestrator.syncAll();

// Or clear the cache:
orchestrator.clearCache();
orchestrator.clearExpiredCache();

// Get stats:
const stats = orchestrator.getStats();
console.log(stats);
```

## Using the Factory Function

The PersistentSessionsProtocol also provides a factory function to create storage providers based on configuration.

```typescript
import { createStorageProvider } from 'psp';

// Create a local storage provider
const localStorage = createStorageProvider({
  type: 'local',
  directory: '/path/to/sessions'
});

// Create an S3 storage provider
const s3Storage = createStorageProvider({
  type: 's3',
  region: 'us-east-1',
  bucket: 'my-sessions'
});

// Create a Cloudflare storage provider
const cfStorage = createStorageProvider({
  type: 'cloudflare',
  type: 'kv',
  accountId: 'YOUR_ACCOUNT_ID',
  token: 'YOUR_API_TOKEN',
  container: 'YOUR_KV_NAMESPACE_ID'
});

// Create a Supabase storage provider
const supabaseStorage = createStorageProvider({
  type: 'supabase',
  url: 'https://your-project.supabase.co',
  apiKey: 'YOUR_SUPABASE_API_KEY'
});

// Create an orchestrator with multiple providers
const orchestratorStorage = createStorageProvider({
  type: 'orchestrator',
  // Primary provider can be a provider instance or a configuration object
  primary: {
    type: 'local',
    directory: '/path/to/sessions'
  },
  // Secondary providers for redundancy
  secondary: [
    {
      type: 's3',
      region: 'us-east-1',
      bucket: 'session-backups'
    }
  ],
  // Enable caching for performance
  useCache: true,
  cacheTtl: 300, // 5 minutes
  cacheCapacity: 100
});

// Create a custom storage provider
class MyCustomProvider {
  // Implement the StorageProvider interface
}

const customStorage = createStorageProvider({
  type: 'custom',
  provider: new MyCustomProvider()
});
```

## Session Management with Storage Providers

Here's a complete example of using a storage provider to save and restore a browser session:

```typescript
import { Session, LocalStorageProvider } from 'psp';
import { chromium } from 'playwright';

// Create a storage provider
const storage = new LocalStorageProvider();

// Create a new session
const session = new Session({
  name: 'My Test Session',
  description: 'A session for testing',
  tags: ['test', 'example'],
  storage: 'local'
});

// Capture the current browser state
async function captureSession() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Navigate to a website and interact with it
  await page.goto('https://example.com');
  await page.fill('#username', 'testuser');
  await page.fill('#password', 'password123');
  await page.click('#login');
  
  // Wait for login to complete
  await page.waitForSelector('#welcome');
  
  // Capture the session state
  await session.capture(page);
  
  // Save the session
  await storage.save(session);
  
  console.log(`Session captured and saved with ID: ${session.id}`);
  
  await browser.close();
}

// Restore a previously saved session
async function restoreSession(id) {
  // Load the session from storage
  const savedSession = await storage.load(id);
  
  // Launch a new browser
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Restore the session state
  await savedSession.restore(page);
  
  // The page should now be in the logged-in state
  console.log(`Session ${id} restored successfully`);
  
  return { browser, page };
}

// List all available sessions
async function listSessions() {
  const sessions = await storage.list({
    tags: ['test'],
    limit: 10,
    offset: 0
  });
  
  console.log(`Found ${sessions.length} sessions:`);
  sessions.forEach(meta => {
    console.log(`- ${meta.id}: ${meta.name} (${meta.tags.join(', ')})`);
  });
}
```

This demonstrates the complete workflow for capturing, storing, and restoring browser sessions using the PersistentSessionsProtocol.