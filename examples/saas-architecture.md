# PSP SaaS Architecture

## Overview
Here's a proposed architecture for offering PSP (Persistent Sessions Protocol) as a SaaS solution using Cloudflare Workers and Supabase.

## Architecture Components

1. **Frontend UI**
   - Next.js app hosted on Vercel/Cloudflare Pages
   - React-based dashboard for session management
   - Authentication via Supabase Auth

2. **Backend API**
   - Cloudflare Workers for serverless API endpoints
   - Handles session CRUD operations
   - Manages user permissions and quotas

3. **Storage**
   - Supabase PostgreSQL for user data and metadata
   - Cloudflare KV for session storage (fast retrieval)
   - Cloudflare R2 for large session blobs

4. **Authentication**
   - Supabase Auth with email/password
   - OAuth providers (GitHub, Google)
   - API key management for programmatic access

## Implementation Plan

### 1. Core API (Cloudflare Workers)

```js
// sessions.js - Cloudflare Worker
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Parse API key from request headers
  const apiKey = request.headers.get('X-API-Key')
  
  // Validate API key against Supabase
  const user = await validateApiKey(apiKey)
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  // Route requests
  const url = new URL(request.url)
  if (url.pathname === '/api/sessions' && request.method === 'POST') {
    return handleSaveSession(request, user)
  } else if (url.pathname.startsWith('/api/sessions/') && request.method === 'GET') {
    const sessionId = url.pathname.split('/').pop()
    return handleGetSession(sessionId, user)
  }
  
  return new Response('Not Found', { status: 404 })
}

async function handleSaveSession(request, user) {
  const session = await request.json()
  
  // Save to KV for fast access
  const sessionId = crypto.randomUUID()
  await PSP_SESSIONS.put(sessionId, JSON.stringify(session))
  
  // Save metadata to Supabase
  const metadata = {
    id: sessionId,
    user_id: user.id,
    name: session.name || 'Unnamed Session',
    origin: session.origin,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  await saveMetadataToSupabase(metadata)
  
  return new Response(JSON.stringify({ id: sessionId }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

async function handleGetSession(sessionId, user) {
  // Check if user has access to this session
  const hasAccess = await checkSessionAccess(sessionId, user.id)
  if (!hasAccess) {
    return new Response('Forbidden', { status: 403 })
  }
  
  // Get from KV
  const session = await PSP_SESSIONS.get(sessionId)
  if (!session) {
    return new Response('Session Not Found', { status: 404 })
  }
  
  return new Response(session, {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}
```

### 2. Supabase Setup

```sql
-- Create tables in Supabase SQL Editor

-- Users table is already managed by Supabase Auth

-- API Keys
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Session metadata (actual session data in KV/R2)
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  description TEXT,
  origin TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  size_bytes INTEGER
);

-- Access control for shared sessions
CREATE TABLE session_access (
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT CHECK (permission IN ('read', 'write', 'admin')),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id),
  PRIMARY KEY (session_id, user_id)
);

-- RLS Policies
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own sessions" ON sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Also allow viewing shared sessions
CREATE POLICY "Users can view sessions shared with them" ON sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM session_access 
      WHERE session_id = sessions.id AND user_id = auth.uid()
    )
  );
```

### 3. Frontend Dashboard

```jsx
// pages/dashboard.js
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import SessionCard from '../components/SessionCard'

export default function Dashboard() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchSessions()
  }, [])
  
  async function fetchSessions() {
    try {
      setLoading(true)
      
      // Get sessions from Supabase
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('updated_at', { ascending: false })
      
      if (error) throw error
      setSessions(data || [])
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Your Browser Sessions</h1>
      
      {loading ? (
        <p>Loading sessions...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map(session => (
            <SessionCard 
              key={session.id}
              session={session}
              onDelete={() => handleDeleteSession(session.id)}
            />
          ))}
          
          <div className="border border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50">
            <span className="text-3xl mb-2">+</span>
            <p>Import New Session</p>
          </div>
        </div>
      )}
    </div>
  )
}
```

### 4. Extension for Capture

For easy session capture, create a browser extension:

```javascript
// Browser Extension - background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'captureSession') {
    captureCurrentSession().then(sessionData => {
      saveSessionToCloud(sessionData).then(response => {
        sendResponse({ success: true, sessionId: response.id })
      })
    })
    return true // Indicate async response
  }
})

async function captureCurrentSession() {
  // Get active tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  const tab = tabs[0]
  
  // Execute content script to capture state
  const result = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: () => {
      // Capture localStorage
      const localStorage = {}
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i)
        localStorage[key] = window.localStorage.getItem(key)
      }
      
      // Capture sessionStorage
      const sessionStorage = {}
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i)
        sessionStorage[key] = window.sessionStorage.getItem(key)
      }
      
      return {
        url: window.location.href,
        origin: window.location.origin,
        title: document.title,
        localStorage,
        sessionStorage
      }
    }
  })
  
  // Get cookies
  const cookies = await chrome.cookies.getAll({ url: tab.url })
  
  // Combine all data
  return {
    version: '1.0.0',
    timestamp: Date.now(),
    origin: new URL(tab.url).origin,
    url: tab.url,
    title: tab.title,
    storage: {
      cookies,
      localStorage: result[0].result.localStorage,
      sessionStorage: result[0].result.sessionStorage
    }
  }
}

async function saveSessionToCloud(sessionData) {
  const apiKey = await getApiKey()
  const response = await fetch('https://psp-saas.workers.dev/api/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify(sessionData)
  })
  
  return response.json()
}
```

### 5. Client SDKs

Create SDKs for popular automation frameworks:

```typescript
// @psp/playwright
import { Page } from 'playwright'

export class PSPClient {
  private apiKey: string
  private baseUrl: string
  
  constructor(options: { apiKey: string, baseUrl?: string }) {
    this.apiKey = options.apiKey
    this.baseUrl = options.baseUrl || 'https://psp-saas.workers.dev'
  }
  
  async restoreSession(page: Page, sessionId: string): Promise<void> {
    // Fetch session from API
    const response = await fetch(`${this.baseUrl}/api/sessions/${sessionId}`, {
      headers: {
        'X-API-Key': this.apiKey
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch session: ${response.statusText}`)
    }
    
    const session = await response.json()
    
    // Navigate to the origin
    await page.goto(session.origin)
    
    // Set cookies
    await page.context().addCookies(session.storage.cookies)
    
    // Set localStorage and sessionStorage
    await page.evaluate((storage) => {
      // Clear existing storage
      localStorage.clear()
      sessionStorage.clear()
      
      // Set localStorage items
      for (const [key, value] of Object.entries(storage.localStorage)) {
        localStorage.setItem(key, value)
      }
      
      // Set sessionStorage items
      for (const [key, value] of Object.entries(storage.sessionStorage)) {
        sessionStorage.setItem(key, value)
      }
    }, session.storage)
    
    // Navigate to the saved URL if different from origin
    if (session.url && session.url !== session.origin) {
      await page.goto(session.url)
    }
  }
}
```

## Pricing Model

Create a tiered pricing model:

1. **Free Tier**
   - 10 sessions stored
   - 7-day retention
   - Public sessions only

2. **Pro Tier ($9/month)**
   - 100 sessions stored
   - 30-day retention
   - Private sessions
   - Team sharing (up to 3 members)

3. **Team Tier ($29/month)**
   - 500 sessions stored
   - 90-day retention
   - Advanced security controls
   - Team sharing (up to 10 members)
   - API access with higher rate limits

4. **Enterprise Tier (Custom)**
   - Unlimited sessions
   - Custom retention policies
   - SSO integration
   - Dedicated support
   - Custom security policies

## Deployment Steps

1. **Supabase Setup**
   - Create a new Supabase project
   - Set up tables and RLS policies
   - Configure authentication providers

2. **Cloudflare Workers**
   - Create a new Cloudflare Workers project
   - Set up KV namespace for sessions
   - Create R2 bucket for large sessions
   - Deploy API endpoints

3. **Frontend**
   - Create Next.js project
   - Set up authentication flow with Supabase
   - Build dashboard UI
   - Deploy to Vercel or Cloudflare Pages

4. **Browser Extension**
   - Create Chrome/Firefox extension
   - Implement capture logic
   - Add authentication and API integration
   - Publish to extension stores

5. **Client SDKs**
   - Create and publish SDKs for:
     - Playwright
     - Selenium
     - Puppeteer
     - Browser-Use
     - Computer-Use

## Launch Timeline

1. **Week 1-2**: Setup core infrastructure (Supabase, Cloudflare)
2. **Week 3-4**: Develop basic API and storage functionality
3. **Week 5-6**: Build dashboard UI and authentication
4. **Week 7-8**: Create browser extension
5. **Week 9-10**: Develop and test client SDKs
6. **Week 11**: Beta testing with limited users
7. **Week 12**: Official launch