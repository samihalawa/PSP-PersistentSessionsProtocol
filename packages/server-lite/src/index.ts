/**
 * PSP Lightweight Server v2.0
 *
 * API-only server for session management without browser automation.
 * Fast to build and deploy, perfect for Cloud Run.
 */

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 8080;
const DATA_DIR = process.env.DATA_DIR || './data';

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Ensure data directories exist
fs.ensureDirSync(DATA_DIR);
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');
fs.ensureDirSync(SESSIONS_DIR);

// Types
interface PSPCookie {
  name: string;
  value: string;
  domain: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

interface PSPOrigin {
  origin: string;
  localStorage?: Record<string, string>;
  sessionStorage?: Record<string, string>;
}

interface PSPSession {
  $schema?: string;
  protocolVersion: string;
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  cookies: PSPCookie[];
  origins: PSPOrigin[];
  browserContext?: {
    userAgent?: string;
    viewport?: { width: number; height: number };
  };
  source?: {
    type: string;
    captureMethod?: string;
  };
  timestamps: {
    created: string;
    updated: string;
    captured?: string;
    expires?: string;
  };
  checksum?: string;
}

// Utility functions
function calculateChecksum(session: PSPSession): string {
  const data = JSON.stringify({
    cookies: session.cookies,
    origins: session.origins,
  });
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 16);
}

function addChecksum(session: PSPSession): PSPSession {
  return { ...session, checksum: calculateChecksum(session) };
}

function validateChecksum(session: PSPSession): boolean {
  if (!session.checksum) return true;
  return session.checksum === calculateChecksum(session);
}

function isSessionExpired(session: PSPSession): boolean {
  if (!session.timestamps.expires) return false;
  return new Date(session.timestamps.expires) < new Date();
}

function getSessionDomains(session: PSPSession): string[] {
  const domains = new Set<string>();
  session.cookies.forEach(c => domains.add(c.domain.replace(/^\./, '')));
  session.origins.forEach(o => {
    try { domains.add(new URL(o.origin).hostname); } catch {}
  });
  return Array.from(domains);
}

// --- Health & Info ---

app.get('/', (_req, res) => {
  res.json({
    name: 'PSP Lite Server',
    version: '2.0.0',
    protocol: '2.0.0',
    endpoints: {
      sessions: '/api/v2/sessions',
      health: '/health',
    },
    note: 'Lightweight API server - browser automation disabled',
  });
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    mode: 'lite',
  });
});

// --- Session Management (v2 API) ---

app.get('/api/v2/sessions', async (_req, res) => {
  try {
    const files = await fs.readdir(SESSIONS_DIR);
    const sessions = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const session: PSPSession = await fs.readJson(path.join(SESSIONS_DIR, file));
        sessions.push({
          id: session.id,
          name: session.name,
          description: session.description,
          tags: session.tags || [],
          cookieCount: session.cookies.length,
          originCount: session.origins.length,
          domains: getSessionDomains(session),
          created: session.timestamps.created,
          updated: session.timestamps.updated,
          expired: isSessionExpired(session),
        });
      }
    }

    res.json({ count: sessions.length, sessions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

app.post('/api/v2/sessions', async (req, res) => {
  try {
    const body = req.body;
    const now = new Date().toISOString();

    const session: PSPSession = {
      $schema: 'https://psp.dev/schema/v2.json',
      protocolVersion: '2.0.0',
      id: uuidv4(),
      name: body.name || 'Untitled Session',
      description: body.description,
      tags: body.tags || [],
      cookies: body.cookies || [],
      origins: body.origins || [],
      browserContext: body.browserContext || {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        viewport: { width: 1920, height: 1080 },
      },
      source: {
        type: body.source?.type || 'api',
        captureMethod: body.source?.captureMethod || 'manual',
      },
      timestamps: {
        created: now,
        updated: now,
        captured: body.timestamps?.captured || now,
        expires: body.timestamps?.expires,
      },
    };

    const sessionWithChecksum = addChecksum(session);
    await fs.writeJson(path.join(SESSIONS_DIR, `${session.id}.json`), sessionWithChecksum, { spaces: 2 });

    console.log(`[Session Created] ${session.name} (${session.id})`);
    res.status(201).json({
      id: session.id,
      status: 'created',
      session: sessionWithChecksum,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

app.get('/api/v2/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const filePath = path.join(SESSIONS_DIR, `${id}.json`);

    if (!(await fs.pathExists(filePath))) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session: PSPSession = await fs.readJson(filePath);

    if (session.checksum && !validateChecksum(session)) {
      return res.status(422).json({ error: 'Session checksum validation failed' });
    }

    if (isSessionExpired(session)) {
      return res.status(410).json({ error: 'Session has expired' });
    }

    res.json(session);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

app.put('/api/v2/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const filePath = path.join(SESSIONS_DIR, `${id}.json`);

    if (!(await fs.pathExists(filePath))) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const existingSession: PSPSession = await fs.readJson(filePath);
    const body = req.body;
    const now = new Date().toISOString();

    const updatedSession: PSPSession = {
      ...existingSession,
      name: body.name ?? existingSession.name,
      description: body.description ?? existingSession.description,
      tags: body.tags ?? existingSession.tags,
      cookies: body.cookies ?? existingSession.cookies,
      origins: body.origins ?? existingSession.origins,
      browserContext: body.browserContext ?? existingSession.browserContext,
      timestamps: { ...existingSession.timestamps, updated: now },
    };

    const sessionWithChecksum = addChecksum(updatedSession);
    await fs.writeJson(filePath, sessionWithChecksum, { spaces: 2 });

    console.log(`[Session Updated] ${updatedSession.name} (${id})`);
    res.json({ id, status: 'updated', session: sessionWithChecksum });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

app.delete('/api/v2/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const filePath = path.join(SESSIONS_DIR, `${id}.json`);

    if (!(await fs.pathExists(filePath))) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await fs.remove(filePath);
    console.log(`[Session Deleted] ${id}`);
    res.json({ id, status: 'deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

app.get('/api/v2/sessions/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    const filePath = path.join(SESSIONS_DIR, `${id}.json`);

    if (!(await fs.pathExists(filePath))) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session: PSPSession = await fs.readJson(filePath);

    res.json({
      id: session.id,
      name: session.name,
      cookieCount: session.cookies.length,
      originCount: session.origins.length,
      domains: getSessionDomains(session),
      expired: isSessionExpired(session),
      checksumValid: session.checksum ? validateChecksum(session) : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// --- Browser stubs (not available in lite version) ---

app.post('/api/v2/sessions/:id/connect', (_req, res) => {
  res.status(501).json({
    error: 'Browser automation not available',
    message: 'This is the lite version. Use the full server for browser features.',
  });
});

app.get('/api/v2/browsers', (_req, res) => {
  res.json({
    count: 0,
    browsers: [],
    note: 'Browser automation not available in lite version',
  });
});

// --- Error handling ---

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// --- Start server ---

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                  PSP Lite Server v2.0                      ║
╠═══════════════════════════════════════════════════════════╣
║  Protocol Version: 2.0.0                                   ║
║  Mode: API Only (no browser automation)                    ║
║  Port: ${String(PORT).padEnd(52)}║
║  Data Directory: ${DATA_DIR.padEnd(42)}║
╚═══════════════════════════════════════════════════════════╝
  `);
});
