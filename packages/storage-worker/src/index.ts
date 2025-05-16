/**
 * Cloudflare Worker for PSP Session Storage
 * 
 * This worker provides a REST API for storing and retrieving browser sessions
 * using Cloudflare Workers KV, R2, or Durable Objects.
 * 
 * It allows for programmatic session management without the need for a UI.
 */

// Interface for the stored session object
interface StoredSession {
  id: string;
  version: string;
  timestamp: number;
  data: any;
  metadata?: {
    name?: string;
    description?: string;
    origin?: string;
    createdAt?: string;
    createdBy?: string;
    expireAt?: string;
    tags?: string[];
    framework?: string;
    [key: string]: any;
  };
}

// Interface for the environment bindings
interface Env {
  // KV Namespace
  PSP_SESSIONS: KVNamespace;
  
  // R2 Bucket (optional)
  PSP_SESSIONS_BUCKET?: R2Bucket;
  
  // Durable Object Namespace (optional)
  PSP_SESSIONS_DO?: DurableObjectNamespace;
  
  // Configuration
  API_KEYS?: string; // Comma-separated list of API keys
}

// Request handler for all incoming requests
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // CORS setup for cross-origin requests
    if (request.method === 'OPTIONS') {
      return handleCORS(request);
    }
    
    // Add CORS headers to all responses
    const corsHeaders = getCORSHeaders(request);
    
    try {
      // Validate API key if configured
      if (env.API_KEYS) {
        const authHeader = request.headers.get('Authorization');
        const apiKey = authHeader?.startsWith('Bearer ') 
          ? authHeader.substring(7)
          : request.headers.get('X-API-Key');
        
        if (!apiKey || !isValidApiKey(apiKey, env.API_KEYS)) {
          return new Response('Unauthorized', { 
            status: 401,
            headers: corsHeaders
          });
        }
      }
      
      // Route requests
      const url = new URL(request.url);
      const path = url.pathname;
      
      // Base sessions endpoint
      if (path === '/sessions' || path === '/sessions/') {
        if (request.method === 'GET') {
          return await handleListSessions(request, env, corsHeaders);
        } else if (request.method === 'POST') {
          return await handleCreateSession(request, env, corsHeaders);
        }
      } 
      // Individual session endpoint
      else if (path.startsWith('/sessions/')) {
        const sessionId = path.substring('/sessions/'.length);
        if (!sessionId) {
          return new Response('Invalid session ID', { 
            status: 400,
            headers: corsHeaders
          });
        }
        
        if (request.method === 'GET') {
          return await handleGetSession(sessionId, env, corsHeaders);
        } else if (request.method === 'PUT') {
          return await handleUpdateSession(sessionId, request, env, corsHeaders);
        } else if (request.method === 'DELETE') {
          return await handleDeleteSession(sessionId, env, corsHeaders);
        }
      }
      
      // Health check endpoint
      if (path === '/health' || path === '/') {
        return new Response(JSON.stringify({ 
          status: 'ok',
          version: '1.0.0'
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      // Unknown endpoint
      return new Response('Not Found', {
        status: 404,
        headers: corsHeaders
      });
    } catch (error: any) {
      // Global error handler
      console.error('Error processing request:', error);
      
      return new Response(JSON.stringify({
        error: error.message || 'Internal server error'
      }), {
        status: error.status || 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }
};

/**
 * Handle CORS preflight requests
 */
function handleCORS(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: getCORSHeaders(request)
  });
}

/**
 * Get CORS headers for the response
 */
function getCORSHeaders(request: Request): HeadersInit {
  return {
    'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Validate API key against configured keys
 */
function isValidApiKey(apiKey: string, configuredKeys: string): boolean {
  const keys = configuredKeys.split(',').map(key => key.trim());
  return keys.includes(apiKey);
}

/**
 * Handle listing all sessions
 */
async function handleListSessions(request: Request, env: Env, corsHeaders: HeadersInit): Promise<Response> {
  const url = new URL(request.url);
  const prefix = url.searchParams.get('prefix') || '';
  const limit = parseInt(url.searchParams.get('limit') || '100');
  const cursor = url.searchParams.get('cursor') || '';
  
  // Get sessions from KV
  const result = await env.PSP_SESSIONS.list({
    prefix,
    limit,
    cursor
  });
  
  // Format response
  const sessions = result.keys.map(key => ({
    id: key.name,
    metadata: key.metadata
  }));
  
  return new Response(JSON.stringify({
    sessions,
    cursor: result.cursor,
    hasMore: !result.list_complete
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

/**
 * Handle creating a new session
 */
async function handleCreateSession(request: Request, env: Env, corsHeaders: HeadersInit): Promise<Response> {
  // Parse request body
  const body = await request.json() as any;
  
  // Generate session ID if not provided
  const sessionId = body.id || crypto.randomUUID();
  
  // Create session object
  const session: StoredSession = {
    id: sessionId,
    version: body.version || '1.0.0',
    timestamp: Date.now(),
    data: body.data || {},
    metadata: {
      name: body.name || `Session ${sessionId}`,
      description: body.description,
      origin: body.origin,
      createdAt: new Date().toISOString(),
      expireAt: body.expireAt,
      tags: body.tags || [],
      framework: body.framework,
      createdBy: body.createdBy
    }
  };
  
  // Store in KV with metadata for listing
  await env.PSP_SESSIONS.put(
    sessionId, 
    JSON.stringify(session),
    {
      metadata: {
        name: session.metadata?.name,
        origin: session.metadata?.origin,
        createdAt: session.metadata?.createdAt,
        expireAt: session.metadata?.expireAt,
        size: JSON.stringify(session).length
      },
      expirationTtl: body.expireAfter ? parseInt(body.expireAfter) : undefined
    }
  );
  
  // Store large sessions in R2 if available and session is large
  const sessionSize = JSON.stringify(session).length;
  if (env.PSP_SESSIONS_BUCKET && sessionSize > 128000) { // > 128KB
    await env.PSP_SESSIONS_BUCKET.put(
      `sessions/${sessionId}.json`, 
      JSON.stringify(session), 
      {
        httpMetadata: {
          contentType: 'application/json',
        }
      }
    );
  }
  
  return new Response(JSON.stringify({
    id: sessionId,
    created: true,
    size: sessionSize
  }), {
    status: 201,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

/**
 * Handle getting a session by ID
 */
async function handleGetSession(sessionId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
  // Check KV first
  let session: any = await env.PSP_SESSIONS.get(sessionId, 'json');
  
  // If not in KV but R2 is available, check R2
  if (!session && env.PSP_SESSIONS_BUCKET) {
    const r2Object = await env.PSP_SESSIONS_BUCKET.get(`sessions/${sessionId}.json`);
    if (r2Object) {
      const text = await r2Object.text();
      session = JSON.parse(text);
    }
  }
  
  // Session not found
  if (!session) {
    return new Response(JSON.stringify({
      error: 'Session not found'
    }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
  
  return new Response(JSON.stringify(session), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

/**
 * Handle updating a session
 */
async function handleUpdateSession(sessionId: string, request: Request, env: Env, corsHeaders: HeadersInit): Promise<Response> {
  // Check if session exists
  const existingSession = await env.PSP_SESSIONS.get(sessionId, 'json');
  if (!existingSession) {
    return new Response(JSON.stringify({
      error: 'Session not found'
    }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
  
  // Parse request body
  const body = await request.json() as any;
  
  // Update session
  const session: StoredSession = {
    ...existingSession,
    timestamp: Date.now(),
    data: body.data || existingSession.data,
    metadata: {
      ...existingSession.metadata,
      ...body.metadata,
      updatedAt: new Date().toISOString()
    }
  };
  
  // Store in KV
  await env.PSP_SESSIONS.put(
    sessionId, 
    JSON.stringify(session),
    {
      metadata: {
        name: session.metadata?.name,
        origin: session.metadata?.origin,
        createdAt: session.metadata?.createdAt,
        updatedAt: session.metadata?.updatedAt,
        expireAt: session.metadata?.expireAt,
        size: JSON.stringify(session).length
      },
      expirationTtl: body.expireAfter ? parseInt(body.expireAfter) : undefined
    }
  );
  
  // Update in R2 if available and session is large
  const sessionSize = JSON.stringify(session).length;
  if (env.PSP_SESSIONS_BUCKET && sessionSize > 128000) {
    await env.PSP_SESSIONS_BUCKET.put(
      `sessions/${sessionId}.json`, 
      JSON.stringify(session), 
      {
        httpMetadata: {
          contentType: 'application/json',
        }
      }
    );
  }
  
  return new Response(JSON.stringify({
    id: sessionId,
    updated: true,
    size: sessionSize
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

/**
 * Handle deleting a session
 */
async function handleDeleteSession(sessionId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
  // Delete from KV
  await env.PSP_SESSIONS.delete(sessionId);
  
  // Delete from R2 if available
  if (env.PSP_SESSIONS_BUCKET) {
    await env.PSP_SESSIONS_BUCKET.delete(`sessions/${sessionId}.json`);
  }
  
  return new Response(JSON.stringify({
    id: sessionId,
    deleted: true
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

/**
 * Durable Object implementation for session storage
 * 
 * This is used when you need transactional consistency or
 * more complex session management logic.
 */
export class SessionObject {
  private state: DurableObjectState;
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'GET') {
      // Get session data
      const value = await this.state.storage.get('data');
      return new Response(JSON.stringify(value || {}), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else if (request.method === 'PUT' || request.method === 'POST') {
      // Update session data
      const json = await request.json() as any;
      
      await this.state.storage.put('data', json);
      await this.state.storage.put('lastUpdated', Date.now());
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else if (request.method === 'DELETE') {
      // Delete session data
      await this.state.storage.deleteAll();
      
      return new Response(JSON.stringify({ deleted: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Method not allowed', { status: 405 });
  }
}