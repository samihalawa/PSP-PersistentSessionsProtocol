#!/usr/bin/env node
/**
 * PSP MCP Server v2.0
 *
 * Model Context Protocol server for browser session management.
 * Enables AI agents to interact with PSP sessions.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { PSPSession, PSPCookie, PSPOrigin } from '@samihalawa/psp-types';
import {
  addChecksum,
  validateChecksum,
  getCookieStats,
  getLocalStorageStats,
  getSessionDomains,
  createSessionSummary,
  isSessionExpired,
} from '@samihalawa/psp-adapters';

// Configuration
const PSP_SERVER_URL = process.env.PSP_SERVER_URL || 'http://localhost:3000';
const PSP_LOCAL_DIR = process.env.PSP_LOCAL_DIR || path.join(process.cwd(), '.psp-sessions');

// Ensure local directory exists
fs.ensureDirSync(PSP_LOCAL_DIR);

// Create MCP server
const server = new Server(
  {
    name: 'psp-mcp-server',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
    },
  }
);

// Tool definitions
const TOOLS = [
  {
    name: 'psp_list_sessions',
    description:
      'List all available PSP sessions from the server or local storage. Returns session summaries with IDs, names, and statistics.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        source: {
          type: 'string',
          enum: ['server', 'local', 'both'],
          description: 'Where to list sessions from (default: both)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of sessions to return (default: 50)',
        },
      },
    },
  },
  {
    name: 'psp_get_session',
    description:
      'Get detailed information about a specific PSP session including cookies, localStorage, and browser context.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'The session ID to retrieve',
        },
        source: {
          type: 'string',
          enum: ['server', 'local'],
          description: 'Where to retrieve the session from (default: server)',
        },
        includeValues: {
          type: 'boolean',
          description: 'Whether to include cookie/localStorage values (default: false for security)',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'psp_create_session',
    description:
      'Create a new PSP session with the provided cookies and localStorage data.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: 'Name for the session',
        },
        description: {
          type: 'string',
          description: 'Description of the session',
        },
        cookies: {
          type: 'array',
          description: 'Array of cookies to include in the session',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              value: { type: 'string' },
              domain: { type: 'string' },
              path: { type: 'string' },
              expires: { type: 'number' },
              httpOnly: { type: 'boolean' },
              secure: { type: 'boolean' },
              sameSite: { type: 'string', enum: ['Strict', 'Lax', 'None'] },
            },
            required: ['name', 'value', 'domain'],
          },
        },
        origins: {
          type: 'array',
          description: 'Array of origins with localStorage data',
          items: {
            type: 'object',
            properties: {
              origin: { type: 'string' },
              localStorage: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    key: { type: 'string' },
                    value: { type: 'string' },
                  },
                },
              },
            },
            required: ['origin'],
          },
        },
        saveLocal: {
          type: 'boolean',
          description: 'Save to local storage instead of server (default: false)',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'psp_launch_browser',
    description:
      'Launch a browser instance with a PSP session loaded. Returns connection details for further automation.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'The session ID to load into the browser',
        },
        headless: {
          type: 'boolean',
          description: 'Run browser in headless mode (default: false)',
        },
        url: {
          type: 'string',
          description: 'Initial URL to navigate to after loading session',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'psp_capture_session',
    description:
      'Capture the current browser state from a running browser instance and save as a PSP session.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        browserId: {
          type: 'string',
          description: 'The browser ID to capture from',
        },
        name: {
          type: 'string',
          description: 'Name for the captured session',
        },
        origins: {
          type: 'array',
          description: 'Origins to capture localStorage from',
          items: { type: 'string' },
        },
        updateExisting: {
          type: 'string',
          description: 'If provided, update this existing session ID instead of creating new',
        },
      },
      required: ['browserId', 'name'],
    },
  },
  {
    name: 'psp_delete_session',
    description: 'Delete a PSP session from the server or local storage.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'The session ID to delete',
        },
        source: {
          type: 'string',
          enum: ['server', 'local'],
          description: 'Where to delete the session from (default: server)',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'psp_stop_browser',
    description: 'Stop a running browser instance.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        browserId: {
          type: 'string',
          description: 'The browser ID to stop',
        },
      },
      required: ['browserId'],
    },
  },
  {
    name: 'psp_list_browsers',
    description: 'List all currently running browser instances managed by PSP.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'psp_session_stats',
    description: 'Get detailed statistics about a PSP session.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'The session ID to get stats for',
        },
        source: {
          type: 'string',
          enum: ['server', 'local'],
          description: 'Where to retrieve the session from (default: server)',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'psp_merge_sessions',
    description: 'Merge two PSP sessions together, combining their cookies and localStorage.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        baseSessionId: {
          type: 'string',
          description: 'The base session ID',
        },
        overlaySessionId: {
          type: 'string',
          description: 'The overlay session ID (takes precedence)',
        },
        newName: {
          type: 'string',
          description: 'Name for the merged session',
        },
      },
      required: ['baseSessionId', 'overlaySessionId', 'newName'],
    },
  },
];

// Prompt definitions
const PROMPTS = [
  {
    name: 'extract_session',
    description:
      'Guide for extracting browser session data from a Chrome profile',
    arguments: [
      {
        name: 'profile_name',
        description: 'Name of the Chrome profile to extract from',
        required: false,
      },
    ],
  },
  {
    name: 'session_workflow',
    description:
      'Workflow for managing browser sessions: list, select, launch, and interact',
    arguments: [
      {
        name: 'target_site',
        description: 'The website you want to automate',
        required: false,
      },
    ],
  },
  {
    name: 'session_debugging',
    description:
      'Debug session issues: expired cookies, missing localStorage, authentication problems',
    arguments: [
      {
        name: 'session_id',
        description: 'Session ID to debug',
        required: false,
      },
    ],
  },
];

// Tool handlers
async function handleListSessions(args: {
  source?: string;
  limit?: number;
}): Promise<string> {
  const source = args.source || 'both';
  const limit = args.limit || 50;
  const sessions: Array<{
    id: string;
    name: string;
    source: string;
    cookies: number;
    origins: number;
    created: string;
  }> = [];

  // Get from server
  if (source === 'server' || source === 'both') {
    try {
      const resp = await axios.get(`${PSP_SERVER_URL}/api/v2/sessions`, {
        params: { limit },
      });
      for (const session of resp.data.sessions || []) {
        sessions.push({
          id: session.id,
          name: session.name,
          source: 'server',
          cookies: session.cookies?.length || 0,
          origins: session.origins?.length || 0,
          created: session.timestamps?.created || 'unknown',
        });
      }
    } catch (err: any) {
      if (source === 'server') {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to list sessions from server: ${err.message}`
        );
      }
      // If both, continue with local
    }
  }

  // Get from local
  if (source === 'local' || source === 'both') {
    try {
      const files = await fs.readdir(PSP_LOCAL_DIR);
      for (const file of files) {
        if (file.endsWith('.psp.json')) {
          const filePath = path.join(PSP_LOCAL_DIR, file);
          const session: PSPSession = await fs.readJson(filePath);
          sessions.push({
            id: session.id,
            name: session.name,
            source: 'local',
            cookies: session.cookies?.length || 0,
            origins: session.origins?.length || 0,
            created: session.timestamps?.created || 'unknown',
          });
        }
      }
    } catch (err: any) {
      if (source === 'local') {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to list local sessions: ${err.message}`
        );
      }
    }
  }

  // Sort by created date
  sessions.sort(
    (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
  );

  // Limit results
  const limited = sessions.slice(0, limit);

  return JSON.stringify(
    {
      count: limited.length,
      total: sessions.length,
      sessions: limited,
    },
    null,
    2
  );
}

async function handleGetSession(args: {
  sessionId: string;
  source?: string;
  includeValues?: boolean;
}): Promise<string> {
  const source = args.source || 'server';
  const includeValues = args.includeValues || false;

  let session: PSPSession;

  if (source === 'server') {
    try {
      const resp = await axios.get(
        `${PSP_SERVER_URL}/api/v2/sessions/${args.sessionId}`
      );
      session = resp.data;
    } catch (err: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get session from server: ${err.response?.data?.error || err.message}`
      );
    }
  } else {
    const filePath = path.join(PSP_LOCAL_DIR, `${args.sessionId}.psp.json`);
    if (!(await fs.pathExists(filePath))) {
      throw new McpError(ErrorCode.InvalidParams, `Session not found: ${args.sessionId}`);
    }
    session = await fs.readJson(filePath);
  }

  // Validate checksum
  const checksumValid = validateChecksum(session);

  // Check expiration
  const expired = isSessionExpired(session);

  // Get stats
  const cookieStats = getCookieStats(session);
  const localStorageStats = getLocalStorageStats(session);
  const domains = getSessionDomains(session);

  // Sanitize values if not requested
  let sanitizedSession = session;
  if (!includeValues) {
    sanitizedSession = {
      ...session,
      cookies: session.cookies.map((c) => ({
        ...c,
        value: '[REDACTED]',
      })),
      origins: session.origins.map((o) => ({
        ...o,
        localStorage: o.localStorage?.map((l) => ({
          ...l,
          value: '[REDACTED]',
        })),
      })),
    };
  }

  return JSON.stringify(
    {
      session: sanitizedSession,
      validation: {
        checksumValid,
        expired,
      },
      stats: {
        cookies: cookieStats,
        localStorage: localStorageStats,
        domains,
      },
    },
    null,
    2
  );
}

async function handleCreateSession(args: {
  name: string;
  description?: string;
  cookies?: PSPCookie[];
  origins?: PSPOrigin[];
  saveLocal?: boolean;
}): Promise<string> {
  const now = new Date().toISOString();

  const session: PSPSession = {
    $schema: 'https://psp.dev/schema/v2.json',
    protocolVersion: '2.0.0',
    id: uuidv4(),
    name: args.name,
    description: args.description,
    cookies: (args.cookies || []).map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path || '/',
      expires: c.expires,
      httpOnly: c.httpOnly ?? false,
      secure: c.secure ?? true,
      sameSite: c.sameSite || 'Lax',
    })),
    origins: (args.origins || []).map((o) => ({
      origin: o.origin,
      localStorage: o.localStorage || [],
    })),
    browserContext: {
      userAgent: '',
    },
    source: {
      type: 'mcp',
      captureMethod: 'manual',
    },
    timestamps: {
      created: now,
      updated: now,
      captured: now,
    },
  };

  const sessionWithChecksum = addChecksum(session);

  if (args.saveLocal) {
    const filePath = path.join(PSP_LOCAL_DIR, `${session.id}.psp.json`);
    await fs.writeJson(filePath, sessionWithChecksum, { spaces: 2 });
    return JSON.stringify({
      id: session.id,
      status: 'created',
      location: 'local',
      path: filePath,
    });
  } else {
    try {
      const resp = await axios.post(
        `${PSP_SERVER_URL}/api/v2/sessions`,
        sessionWithChecksum
      );
      return JSON.stringify({
        id: resp.data.id,
        status: 'created',
        location: 'server',
      });
    } catch (err: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create session on server: ${err.response?.data?.error || err.message}`
      );
    }
  }
}

async function handleLaunchBrowser(args: {
  sessionId: string;
  headless?: boolean;
  url?: string;
}): Promise<string> {
  try {
    const resp = await axios.post(
      `${PSP_SERVER_URL}/api/v2/sessions/${args.sessionId}/connect`,
      {
        headless: args.headless ?? false,
        url: args.url,
      }
    );

    return JSON.stringify({
      browserId: resp.data.browserId,
      browserWSEndpoint: resp.data.browserWSEndpoint,
      sessionId: args.sessionId,
      domains: resp.data.domains,
      status: 'launched',
    });
  } catch (err: any) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to launch browser: ${err.response?.data?.error || err.message}`
    );
  }
}

async function handleCaptureSession(args: {
  browserId: string;
  name: string;
  origins?: string[];
  updateExisting?: string;
}): Promise<string> {
  try {
    const resp = await axios.post(
      `${PSP_SERVER_URL}/api/v2/browsers/${args.browserId}/capture`,
      {
        name: args.name,
        origins: args.origins || [],
        updateSessionId: args.updateExisting,
      }
    );

    return JSON.stringify({
      sessionId: resp.data.sessionId,
      status: args.updateExisting ? 'updated' : 'created',
      stats: resp.data.stats,
    });
  } catch (err: any) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to capture session: ${err.response?.data?.error || err.message}`
    );
  }
}

async function handleDeleteSession(args: {
  sessionId: string;
  source?: string;
}): Promise<string> {
  const source = args.source || 'server';

  if (source === 'server') {
    try {
      await axios.delete(`${PSP_SERVER_URL}/api/v2/sessions/${args.sessionId}`);
      return JSON.stringify({
        sessionId: args.sessionId,
        status: 'deleted',
        source: 'server',
      });
    } catch (err: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to delete session from server: ${err.response?.data?.error || err.message}`
      );
    }
  } else {
    const filePath = path.join(PSP_LOCAL_DIR, `${args.sessionId}.psp.json`);
    if (!(await fs.pathExists(filePath))) {
      throw new McpError(ErrorCode.InvalidParams, `Session not found: ${args.sessionId}`);
    }
    await fs.remove(filePath);
    return JSON.stringify({
      sessionId: args.sessionId,
      status: 'deleted',
      source: 'local',
    });
  }
}

async function handleStopBrowser(args: { browserId: string }): Promise<string> {
  try {
    await axios.delete(`${PSP_SERVER_URL}/api/v2/browsers/${args.browserId}`);
    return JSON.stringify({
      browserId: args.browserId,
      status: 'stopped',
    });
  } catch (err: any) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to stop browser: ${err.response?.data?.error || err.message}`
    );
  }
}

async function handleListBrowsers(): Promise<string> {
  try {
    const resp = await axios.get(`${PSP_SERVER_URL}/api/v2/browsers`);
    return JSON.stringify(resp.data, null, 2);
  } catch (err: any) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to list browsers: ${err.response?.data?.error || err.message}`
    );
  }
}

async function handleSessionStats(args: {
  sessionId: string;
  source?: string;
}): Promise<string> {
  const source = args.source || 'server';

  if (source === 'server') {
    try {
      const resp = await axios.get(
        `${PSP_SERVER_URL}/api/v2/sessions/${args.sessionId}/stats`
      );
      return JSON.stringify(resp.data, null, 2);
    } catch (err: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get session stats: ${err.response?.data?.error || err.message}`
      );
    }
  } else {
    const filePath = path.join(PSP_LOCAL_DIR, `${args.sessionId}.psp.json`);
    if (!(await fs.pathExists(filePath))) {
      throw new McpError(ErrorCode.InvalidParams, `Session not found: ${args.sessionId}`);
    }
    const session: PSPSession = await fs.readJson(filePath);
    const cookieStats = getCookieStats(session);
    const localStorageStats = getLocalStorageStats(session);
    const domains = getSessionDomains(session);

    return JSON.stringify(
      {
        sessionId: session.id,
        name: session.name,
        cookies: cookieStats,
        localStorage: localStorageStats,
        domains,
        checksumValid: validateChecksum(session),
        expired: isSessionExpired(session),
      },
      null,
      2
    );
  }
}

async function handleMergeSessions(args: {
  baseSessionId: string;
  overlaySessionId: string;
  newName: string;
}): Promise<string> {
  try {
    // Get both sessions from server
    const [baseResp, overlayResp] = await Promise.all([
      axios.get(`${PSP_SERVER_URL}/api/v2/sessions/${args.baseSessionId}`),
      axios.get(`${PSP_SERVER_URL}/api/v2/sessions/${args.overlaySessionId}`),
    ]);

    const baseSession: PSPSession = baseResp.data;
    const overlaySession: PSPSession = overlayResp.data;

    // Merge cookies (overlay takes precedence)
    const cookieMap = new Map<string, PSPCookie>();
    for (const cookie of baseSession.cookies) {
      const key = `${cookie.domain}|${cookie.path}|${cookie.name}`;
      cookieMap.set(key, cookie);
    }
    for (const cookie of overlaySession.cookies) {
      const key = `${cookie.domain}|${cookie.path}|${cookie.name}`;
      cookieMap.set(key, cookie);
    }

    // Merge origins
    const originMap = new Map<string, PSPOrigin>();
    for (const origin of baseSession.origins) {
      originMap.set(origin.origin, { ...origin });
    }
    for (const origin of overlaySession.origins) {
      const existing = originMap.get(origin.origin);
      if (existing) {
        // Merge localStorage entries
        const lsMap = new Map<string, { key: string; value: string }>();
        for (const item of existing.localStorage || []) {
          lsMap.set(item.key, item);
        }
        for (const item of origin.localStorage || []) {
          lsMap.set(item.key, item);
        }
        existing.localStorage = Array.from(lsMap.values());
      } else {
        originMap.set(origin.origin, { ...origin });
      }
    }

    const now = new Date().toISOString();
    const mergedSession: PSPSession = {
      $schema: 'https://psp.dev/schema/v2.json',
      protocolVersion: '2.0.0',
      id: uuidv4(),
      name: args.newName,
      description: `Merged from ${baseSession.name} and ${overlaySession.name}`,
      cookies: Array.from(cookieMap.values()),
      origins: Array.from(originMap.values()),
      browserContext: overlaySession.browserContext || baseSession.browserContext,
      source: {
        type: 'merge',
        captureMethod: 'merge',
        mergedFrom: [args.baseSessionId, args.overlaySessionId],
      },
      timestamps: {
        created: now,
        updated: now,
        captured: now,
      },
    };

    const sessionWithChecksum = addChecksum(mergedSession);

    // Save to server
    const createResp = await axios.post(
      `${PSP_SERVER_URL}/api/v2/sessions`,
      sessionWithChecksum
    );

    return JSON.stringify({
      id: createResp.data.id,
      status: 'merged',
      mergedFrom: [args.baseSessionId, args.overlaySessionId],
      stats: {
        cookies: mergedSession.cookies.length,
        origins: mergedSession.origins.length,
      },
    });
  } catch (err: any) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to merge sessions: ${err.response?.data?.error || err.message}`
    );
  }
}

// Prompt handlers
function getExtractSessionPrompt(profileName?: string): string {
  return `# Browser Session Extraction Guide

## Overview
This guide helps you extract browser session data from a Chrome profile using PSP.

## Steps

1. **List available Chrome profiles**
   Run the PSP CLI to scan for profiles:
   \`\`\`bash
   psp
   \`\`\`

2. **Select the profile${profileName ? ` (looking for: ${profileName})` : ''}**
   Use arrow keys to navigate and Enter to select.

3. **Wait for extraction**
   PSP will:
   - Launch Chrome with the profile in headless mode
   - Connect via Chrome DevTools Protocol
   - Extract all cookies and localStorage data
   - Create a PSP session with checksum

4. **Verify the session**
   Use the \`psp_get_session\` tool to verify the extracted session.

## Using MCP Tools

Once extracted, you can:
- \`psp_list_sessions\` - Find your session
- \`psp_get_session\` - View session details
- \`psp_launch_browser\` - Launch browser with session
- \`psp_capture_session\` - Update session after changes

## Tips
- Close Chrome before extracting to avoid profile lock issues
- Use \`includeValues: true\` only when you need to see actual values
- Sessions are validated with SHA-256 checksums automatically
`;
}

function getSessionWorkflowPrompt(targetSite?: string): string {
  return `# PSP Session Workflow

## Goal
Manage browser sessions for automation${targetSite ? ` targeting ${targetSite}` : ''}.

## Workflow Steps

### 1. Find Available Sessions
\`\`\`
Use psp_list_sessions with source: "both"
\`\`\`

### 2. Select or Create Session
If you have an existing session with valid authentication:
\`\`\`
Use psp_get_session with the session ID
Check: checksumValid = true, expired = false
\`\`\`

If you need a new session:
\`\`\`
Use psp_create_session with cookies from browser DevTools
\`\`\`

### 3. Launch Browser
\`\`\`
Use psp_launch_browser with:
- sessionId: your session ID
- headless: false (for debugging) or true (for automation)
${targetSite ? `- url: "${targetSite}"` : ''}
\`\`\`

### 4. Perform Actions
The browser is now running with your session loaded.
Connect to it using the browserWSEndpoint for Puppeteer/Playwright automation.

### 5. Capture Updated Session
After making changes (logging in, updating settings):
\`\`\`
Use psp_capture_session with:
- browserId: from launch response
- name: descriptive name
- origins: URLs where localStorage was modified
\`\`\`

### 6. Cleanup
\`\`\`
Use psp_stop_browser to close the browser
\`\`\`

## Common Patterns

### Re-authenticate Expired Session
1. Launch browser with expired session
2. Manually or automatically re-authenticate
3. Capture new session
4. Delete old session

### Merge Sessions
If you have partial sessions (e.g., one with auth cookies, one with preferences):
\`\`\`
Use psp_merge_sessions with both session IDs
\`\`\`
`;
}

function getSessionDebuggingPrompt(sessionId?: string): string {
  return `# PSP Session Debugging Guide

## Debugging Session: ${sessionId || '(specify session ID)'}

## Common Issues

### 1. Session Not Found
**Symptoms**: psp_get_session returns "Session not found"
**Causes**:
- Wrong session ID
- Session was deleted
- Looking in wrong source (server vs local)
**Solution**:
\`\`\`
Use psp_list_sessions with source: "both" to find all sessions
\`\`\`

### 2. Checksum Validation Failed
**Symptoms**: checksumValid = false
**Causes**:
- Session file was modified externally
- Data corruption during transfer
**Solution**:
1. Re-extract the session from Chrome profile
2. Or use psp_capture_session to get fresh data

### 3. Session Expired
**Symptoms**: expired = true, or authentication fails when using session
**Causes**:
- Session cookies have expired
- Session expiration timestamp passed
**Solution**:
1. Launch browser with session
2. Re-authenticate
3. Capture new session

### 4. Missing Cookies
**Symptoms**: Site doesn't recognize session, authentication lost
**Causes**:
- httpOnly cookies not captured
- Cookies filtered by domain
- Secure cookies on non-HTTPS
**Solution**:
\`\`\`
Use psp_session_stats to see cookie breakdown
Check httpOnly and secure counts
\`\`\`

### 5. Missing localStorage
**Symptoms**: Site state not restored (preferences, cart, etc.)
**Causes**:
- Origins not specified during capture
- localStorage cleared by site
**Solution**:
\`\`\`
When using psp_capture_session, specify all relevant origins
Example: origins: ["https://example.com", "https://api.example.com"]
\`\`\`

### 6. Browser Launch Fails
**Symptoms**: psp_launch_browser returns error
**Causes**:
- PSP server not running
- Port conflicts
- Chrome not installed
**Solution**:
1. Check PSP server: curl http://localhost:3000/health
2. Check for Chrome: which chromium || which google-chrome
3. Restart PSP server

## Diagnostic Commands

1. **List all sessions**:
   psp_list_sessions with source: "both"

2. **Get detailed stats**:
   psp_session_stats with sessionId

3. **Check session validity**:
   psp_get_session with includeValues: false

4. **List running browsers**:
   psp_list_browsers
`;
}

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: string;

    switch (name) {
      case 'psp_list_sessions':
        result = await handleListSessions(args as any);
        break;
      case 'psp_get_session':
        result = await handleGetSession(args as any);
        break;
      case 'psp_create_session':
        result = await handleCreateSession(args as any);
        break;
      case 'psp_launch_browser':
        result = await handleLaunchBrowser(args as any);
        break;
      case 'psp_capture_session':
        result = await handleCaptureSession(args as any);
        break;
      case 'psp_delete_session':
        result = await handleDeleteSession(args as any);
        break;
      case 'psp_stop_browser':
        result = await handleStopBrowser(args as any);
        break;
      case 'psp_list_browsers':
        result = await handleListBrowsers();
        break;
      case 'psp_session_stats':
        result = await handleSessionStats(args as any);
        break;
      case 'psp_merge_sessions':
        result = await handleMergeSessions(args as any);
        break;
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }

    return {
      content: [{ type: 'text', text: result }],
    };
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${(error as Error).message}`
    );
  }
});

// Register prompt handlers
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return { prompts: PROMPTS };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'extract_session':
      return {
        description: 'Guide for extracting browser session data',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: getExtractSessionPrompt(args?.profile_name),
            },
          },
        ],
      };
    case 'session_workflow':
      return {
        description: 'Workflow for managing browser sessions',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: getSessionWorkflowPrompt(args?.target_site),
            },
          },
        ],
      };
    case 'session_debugging':
      return {
        description: 'Debug session issues',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: getSessionDebuggingPrompt(args?.session_id),
            },
          },
        ],
      };
    default:
      throw new McpError(ErrorCode.InvalidParams, `Unknown prompt: ${name}`);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('PSP MCP Server v2.0 running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
