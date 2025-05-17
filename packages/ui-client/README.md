# PSP UI Client

React components and hooks for interacting with PSP session storage.

## Overview

This package provides React components and hooks for building user interfaces that interact with PSP session storage. It includes:

- API client for communicating with PSP storage backends
- React hooks for session management
- TypeScript types and interfaces

## Installation

```bash
npm install @psp/ui-client
```

## Usage

### API Client

The API client provides methods for interacting with PSP storage backends:

```typescript
import { SessionApi } from '@psp/ui-client';

// Create API client
const api = new SessionApi({
  endpoint: 'https://your-psp-worker.workers.dev',
  apiKey: 'your-api-key' // Optional
});

// Create a session
const sessionId = await api.createSession(
  { 
    storage: {
      cookies: [],
      localStorage: { /* ... */ },
      sessionStorage: { /* ... */ }
    }
  },
  {
    name: 'My Session',
    description: 'A test session'
  }
);

// Get a session
const session = await api.getSession(sessionId);

// List sessions
const { sessions, hasMore, cursor } = await api.listSessions({
  limit: 10
});

// Update a session
await api.updateSession(sessionId, newData, newMetadata);

// Delete a session
await api.deleteSession(sessionId);
```

### React Hooks

The package includes several React hooks for managing sessions:

#### useSession

For loading and manipulating a single session:

```tsx
import { useSession } from '@psp/ui-client';

function SessionDetail({ sessionId }) {
  const { 
    session,
    loading,
    error,
    refresh,
    updateSession,
    deleteSession
  } = useSession(api, sessionId);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!session) return <div>Session not found</div>;
  
  return (
    <div>
      <h2>{session.metadata?.name || 'Unnamed Session'}</h2>
      <p>{session.metadata?.description}</p>
      
      <button onClick={refresh}>Refresh</button>
      <button onClick={() => updateSession(newData)}>Update</button>
      <button onClick={deleteSession}>Delete</button>
      
      <pre>{JSON.stringify(session.data, null, 2)}</pre>
    </div>
  );
}
```

#### useSessions

For listing and managing multiple sessions:

```tsx
import { useSessions } from '@psp/ui-client';

function SessionList() {
  const {
    sessions,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    createSession,
    deleteSession
  } = useSessions(api, {
    limit: 10,
    refreshInterval: 30000 // Auto-refresh every 30 seconds
  });
  
  if (loading && sessions.length === 0) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <button onClick={() => createSession(newSessionData)}>
        Create Session
      </button>
      
      <ul>
        {sessions.map(session => (
          <li key={session.id}>
            {session.metadata?.name || session.id}
            <button onClick={() => deleteSession(session.id)}>Delete</button>
          </li>
        ))}
      </ul>
      
      {hasMore && (
        <button onClick={loadMore} disabled={loading}>
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

#### useSessionForm

For creating and editing sessions with forms:

```tsx
import { useSessionForm } from '@psp/ui-client';

function SessionForm() {
  const {
    formData,
    handleChange,
    isSaving,
    saveError,
    saveSession,
    resetForm
  } = useSessionForm(api);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const sessionId = await saveSession({
        name: formData.name,
        description: formData.description
      });
      
      console.log(`Session created with ID: ${sessionId}`);
      resetForm();
    } catch (err) {
      console.error('Failed to save session:', err);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {saveError && <div className="error">{saveError}</div>}
      
      <div>
        <label>
          Session Name:
          <input
            type="text"
            value={formData.name || ''}
            onChange={e => handleChange('name', e.target.value)}
          />
        </label>
      </div>
      
      <div>
        <label>
          Description:
          <textarea
            value={formData.description || ''}
            onChange={e => handleChange('description', e.target.value)}
          />
        </label>
      </div>
      
      <button type="submit" disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Session'}
      </button>
    </form>
  );
}
```

## Building a Complete UI

You can combine these components and hooks to build a complete UI for managing PSP sessions:

```tsx
import { 
  SessionApi, 
  useSession, 
  useSessions, 
  useSessionForm 
} from '@psp/ui-client';

// Create API client
const api = new SessionApi({
  endpoint: 'https://your-psp-worker.workers.dev',
  apiKey: 'your-api-key'
});

function App() {
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  
  // Handle session selection
  const handleSelectSession = (id) => {
    setSelectedSessionId(id);
  };
  
  return (
    <div className="app">
      <h1>PSP Session Manager</h1>
      
      <div className="layout">
        <div className="sidebar">
          <SessionList onSelectSession={handleSelectSession} />
        </div>
        
        <div className="main">
          {selectedSessionId ? (
            <SessionDetail 
              sessionId={selectedSessionId}
              onClose={() => setSelectedSessionId(null)}
            />
          ) : (
            <SessionForm />
          )}
        </div>
      </div>
    </div>
  );
}
```

## TypeScript Support

This package includes TypeScript types for all components and hooks:

```typescript
import { 
  SessionApi, 
  SessionApiOptions,
  Session,
  SessionMetadata,
  SessionList
} from '@psp/ui-client';
```

## Advanced Configuration

### Custom Fetch Implementation

You can provide a custom fetch implementation to the API client:

```typescript
const api = new SessionApi({
  endpoint: 'https://your-psp-worker.workers.dev',
  fetchFn: window.fetch.bind(window) // Example with bound fetch
});
```

### Auto-Retry and Timeouts

The API client supports automatic retries and timeouts:

```typescript
const api = new SessionApi({
  endpoint: 'https://your-psp-worker.workers.dev',
  autoRetry: true,
  maxRetries: 3,
  timeout: 10000 // 10 seconds
});
```