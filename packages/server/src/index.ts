/**
 * PSP Cloud Server v2.0
 *
 * Universal browser session management server implementing PSP protocol.
 * Provides REST API for session CRUD, browser launch with session hydration,
 * and real-time session capture.
 */

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import puppeteer from 'puppeteer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs-extra';
import path from 'path';
import type {
  PSPSession,
  PSPSessionSummary,
  PSP_PROTOCOL_VERSION,
} from '@samihalawa/psp-types';
import {
  pspToCDP,
  captureFromCDP,
  restoreToCDP,
  getSessionDomains,
} from '@samihalawa/psp-adapters';
import {
  validateChecksum,
  addChecksum,
  isSessionExpired,
  removeExpiredCookies,
  createSessionSummary,
  getCookieStats,
  getLocalStorageStats,
} from '@samihalawa/psp-adapters';

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || './data';

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Ensure data directory exists
fs.ensureDirSync(DATA_DIR);
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');
fs.ensureDirSync(SESSIONS_DIR);

// In-memory cache of active browsers
interface ActiveBrowser {
  browser: puppeteer.Browser;
  sessionId: string;
  createdAt: Date;
}
const activeBrowsers = new Map<string, ActiveBrowser>();

// --- Health & Info ---

app.get('/', (_req, res) => {
  res.json({
    name: 'PSP Cloud Server',
    version: '2.0.0',
    protocol: '2.0.0',
    endpoints: {
      sessions: '/api/v2/sessions',
      browsers: '/api/v2/browsers',
      health: '/health',
    },
  });
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    activeBrowsers: activeBrowsers.size,
  });
});

// --- Session Management (v2 API) ---

/**
 * List all sessions
 * GET /api/v2/sessions
 */
app.get('/api/v2/sessions', async (_req, res) => {
  try {
    const files = await fs.readdir(SESSIONS_DIR);
    const sessions: PSPSessionSummary[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const session: PSPSession = await fs.readJson(
          path.join(SESSIONS_DIR, file)
        );
        sessions.push(createSessionSummary(session));
      }
    }

    res.json({
      count: sessions.length,
      sessions,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * Create new session
 * POST /api/v2/sessions
 */
app.post('/api/v2/sessions', async (req, res) => {
  try {
    const body = req.body;
    const now = new Date().toISOString();

    // Build PSP session from request
    const session: PSPSession = {
      $schema: 'https://psp.dev/schema/v2.json',
      protocolVersion: '2.0.0',
      id: uuidv4(),
      name: body.name || 'Untitled Session',
      description: body.description,
      tags: body.tags || [],
      cookies: body.cookies || [],
      origins: body.origins || [],
      indexedDB: body.indexedDB,
      serviceWorkers: body.serviceWorkers,
      browserContext: body.browserContext || {
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        viewport: { width: 1920, height: 1080 },
      },
      source: {
        type: body.source?.type || 'api',
        captureMethod: body.source?.captureMethod || 'manual',
        profileName: body.source?.profileName,
      },
      timestamps: {
        created: now,
        updated: now,
        captured: body.timestamps?.captured || now,
        expires: body.timestamps?.expires,
      },
    };

    // Add checksum for integrity
    const sessionWithChecksum = addChecksum(session);

    await fs.writeJson(
      path.join(SESSIONS_DIR, `${session.id}.json`),
      sessionWithChecksum,
      { spaces: 2 }
    );

    console.log(`[Session Created] ${session.name} (${session.id})`);
    res.status(201).json({
      id: session.id,
      status: 'created',
      session: sessionWithChecksum,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to create session:', message);
    res.status(500).json({ error: message });
  }
});

/**
 * Get session by ID
 * GET /api/v2/sessions/:id
 */
app.get('/api/v2/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const filePath = path.join(SESSIONS_DIR, `${id}.json`);

    if (!(await fs.pathExists(filePath))) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session: PSPSession = await fs.readJson(filePath);

    // Validate checksum if present
    if (session.checksum && !validateChecksum(session)) {
      return res.status(422).json({
        error: 'Session checksum validation failed',
        details: 'Session data may have been tampered with',
      });
    }

    // Check expiration
    if (isSessionExpired(session)) {
      return res.status(410).json({
        error: 'Session has expired',
        expired: session.timestamps.expires,
      });
    }

    res.json(session);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * Update session
 * PUT /api/v2/sessions/:id
 */
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

    // Merge updates
    const updatedSession: PSPSession = {
      ...existingSession,
      name: body.name ?? existingSession.name,
      description: body.description ?? existingSession.description,
      tags: body.tags ?? existingSession.tags,
      cookies: body.cookies ?? existingSession.cookies,
      origins: body.origins ?? existingSession.origins,
      indexedDB: body.indexedDB ?? existingSession.indexedDB,
      serviceWorkers: body.serviceWorkers ?? existingSession.serviceWorkers,
      browserContext: body.browserContext ?? existingSession.browserContext,
      timestamps: {
        ...existingSession.timestamps,
        updated: now,
      },
    };

    // Recalculate checksum
    const sessionWithChecksum = addChecksum(updatedSession);

    await fs.writeJson(filePath, sessionWithChecksum, { spaces: 2 });

    console.log(`[Session Updated] ${updatedSession.name} (${id})`);
    res.json({
      id,
      status: 'updated',
      session: sessionWithChecksum,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * Delete session
 * DELETE /api/v2/sessions/:id
 */
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

/**
 * Get session statistics
 * GET /api/v2/sessions/:id/stats
 */
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
      cookies: getCookieStats(session),
      localStorage: getLocalStorageStats(session),
      domains: getSessionDomains(session),
      expired: isSessionExpired(session),
      checksumValid: session.checksum ? validateChecksum(session) : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * Clean expired cookies from session
 * POST /api/v2/sessions/:id/clean
 */
app.post('/api/v2/sessions/:id/clean', async (req, res) => {
  try {
    const { id } = req.params;
    const filePath = path.join(SESSIONS_DIR, `${id}.json`);

    if (!(await fs.pathExists(filePath))) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session: PSPSession = await fs.readJson(filePath);
    const originalCount = session.cookies.length;

    const cleanedSession = removeExpiredCookies(session);
    const removedCount = originalCount - cleanedSession.cookies.length;

    const sessionWithChecksum = addChecksum(cleanedSession);
    await fs.writeJson(filePath, sessionWithChecksum, { spaces: 2 });

    res.json({
      id,
      status: 'cleaned',
      removedCookies: removedCount,
      remainingCookies: cleanedSession.cookies.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// --- Browser Management ---

/**
 * Connect/Launch browser with session hydration
 * POST /api/v2/sessions/:id/connect
 *
 * Returns a CDP WebSocket endpoint that any driver can connect to.
 */
app.post('/api/v2/sessions/:id/connect', async (req, res) => {
  try {
    const { id } = req.params;
    const { headless = true } = req.body;
    const filePath = path.join(SESSIONS_DIR, `${id}.json`);

    if (!(await fs.pathExists(filePath))) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session: PSPSession = await fs.readJson(filePath);

    // Validate session
    if (session.checksum && !validateChecksum(session)) {
      return res.status(422).json({
        error: 'Session checksum validation failed',
      });
    }

    if (isSessionExpired(session)) {
      return res.status(410).json({
        error: 'Session has expired',
      });
    }

    console.log(`[Launching] Starting browser for ${session.name}...`);

    const browser = await puppeteer.launch({
      headless: headless ? true : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--remote-debugging-address=0.0.0.0',
        '--remote-debugging-port=0',
      ],
    });

    const browserId = uuidv4();
    activeBrowsers.set(browserId, {
      browser,
      sessionId: id,
      createdAt: new Date(),
    });

    // Get CDP session and restore PSP session
    const page = await browser.newPage();
    const client = await page.createCDPSession();

    // Use adapter to restore session
    await restoreToCDP(client as any, session, false);

    // Set browser context options
    if (session.browserContext.userAgent) {
      await page.setUserAgent(session.browserContext.userAgent);
    }

    if (session.browserContext.viewport) {
      await page.setViewport({
        width: session.browserContext.viewport.width,
        height: session.browserContext.viewport.height,
      });
    }

    // Set geolocation if specified
    if (session.browserContext.geolocation) {
      await page.setGeolocation({
        latitude: session.browserContext.geolocation.latitude,
        longitude: session.browserContext.geolocation.longitude,
        accuracy: session.browserContext.geolocation.accuracy,
      });
    }

    const wsEndpoint = browser.wsEndpoint();
    console.log(`[Launched] ${session.name} -> ${wsEndpoint}`);

    res.json({
      browserId,
      browserWSEndpoint: wsEndpoint,
      sessionId: session.id,
      sessionName: session.name,
      domains: getSessionDomains(session),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to launch browser:', message);
    res.status(500).json({ error: message });
  }
});

/**
 * Capture current browser state to session
 * POST /api/v2/browsers/:id/capture
 */
app.post('/api/v2/browsers/:id/capture', async (req, res) => {
  try {
    const { id } = req.params;
    const { origins = [] } = req.body;
    const browserInfo = activeBrowsers.get(id);

    if (!browserInfo) {
      return res.status(404).json({ error: 'Browser not found' });
    }

    const pages = await browserInfo.browser.pages();
    if (pages.length === 0) {
      return res.status(400).json({ error: 'No pages in browser' });
    }

    const page = pages[0];
    const client = await page.createCDPSession();

    // Capture using adapter
    const capturedSession = await captureFromCDP(
      client as any,
      {
        name: `Captured at ${new Date().toISOString()}`,
        userAgent: await page.evaluate(() => navigator.userAgent),
        viewport: page.viewport() || undefined,
      },
      origins
    );

    // Update the original session if we have one
    if (browserInfo.sessionId) {
      const filePath = path.join(SESSIONS_DIR, `${browserInfo.sessionId}.json`);
      if (await fs.pathExists(filePath)) {
        const originalSession: PSPSession = await fs.readJson(filePath);
        const updatedSession: PSPSession = {
          ...originalSession,
          cookies: capturedSession.cookies,
          origins: capturedSession.origins,
          timestamps: {
            ...originalSession.timestamps,
            updated: new Date().toISOString(),
            captured: new Date().toISOString(),
          },
        };

        const sessionWithChecksum = addChecksum(updatedSession);
        await fs.writeJson(filePath, sessionWithChecksum, { spaces: 2 });

        console.log(`[Captured] Session ${browserInfo.sessionId} updated`);
        res.json({
          status: 'captured',
          sessionId: browserInfo.sessionId,
          cookieCount: capturedSession.cookies.length,
          originCount: capturedSession.origins.length,
        });
        return;
      }
    }

    // If no original session, return the captured data
    res.json({
      status: 'captured',
      session: addChecksum(capturedSession),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to capture session:', message);
    res.status(500).json({ error: message });
  }
});

/**
 * List active browsers
 * GET /api/v2/browsers
 */
app.get('/api/v2/browsers', (_req, res) => {
  const browsers = Array.from(activeBrowsers.entries()).map(([id, info]) => ({
    id,
    sessionId: info.sessionId,
    createdAt: info.createdAt.toISOString(),
    uptime: Math.floor((Date.now() - info.createdAt.getTime()) / 1000),
  }));

  res.json({
    count: browsers.length,
    browsers,
  });
});

/**
 * Stop browser
 * DELETE /api/v2/browsers/:id
 */
app.delete('/api/v2/browsers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const browserInfo = activeBrowsers.get(id);

    if (!browserInfo) {
      return res.status(404).json({ error: 'Browser not found' });
    }

    await browserInfo.browser.close();
    activeBrowsers.delete(id);

    console.log(`[Closed] Browser ${id}`);
    res.json({ id, status: 'closed' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// --- Legacy v1 API (backward compatibility) ---

app.post('/api/v1/sessions', async (req, res) => {
  // Redirect to v2 with transformation
  const { name, cookies, localStorage, userAgent, viewport } = req.body;

  const v2Body = {
    name,
    cookies: cookies || [],
    origins: localStorage
      ? [{ origin: 'legacy', localStorage: localStorage }]
      : [],
    browserContext: { userAgent, viewport },
    source: { type: 'api', captureMethod: 'legacy-v1' },
  };

  req.body = v2Body;
  const originalUrl = req.url;
  req.url = '/api/v2/sessions';

  // Forward to v2 handler
  app._router.handle(req, res, () => {
    req.url = originalUrl;
  });
});

app.get('/api/v1/sessions/:id', async (req, res) => {
  // Forward to v2
  req.url = req.url.replace('/v1/', '/v2/');
  app._router.handle(req, res, () => {});
});

// --- Error handling ---

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
    });
  }
);

// --- Graceful shutdown ---

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  for (const [id, info] of activeBrowsers) {
    console.log(`Closing browser ${id}...`);
    await info.browser.close();
  }
  process.exit(0);
});

// --- Start server ---

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    PSP Cloud Server v2.0                   ║
╠═══════════════════════════════════════════════════════════╣
║  Protocol Version: 2.0.0                                   ║
║  Port: ${String(PORT).padEnd(52)}║
║  Data Directory: ${DATA_DIR.padEnd(42)}║
╚═══════════════════════════════════════════════════════════╝
  `);
});
