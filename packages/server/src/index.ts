import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import puppeteer from 'puppeteer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs-extra';
import path from 'path';
import { SessionProfile } from '@samihalawa/psp-types';

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
const activeBrowsers = new Map<string, puppeteer.Browser>();

app.get('/', (req, res) => {
  res.send('PSP Cloud Server v2 (Protocol Ready)');
});

// --- Session Management ---

// 1. Create/Sync Session
app.post('/api/v1/sessions', async (req, res) => {
  const { name, cookies, localStorage, userAgent, viewport } = req.body;
  const id = uuidv4();
  
  const session: SessionProfile = {
    id,
    name,
    cookies: cookies || [],
    localStorage: localStorage || [],
    userAgent,
    viewport,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await fs.writeJson(path.join(SESSIONS_DIR, `${id}.json`), session);

  console.log(`[Session Created] ${name} (${id})`);
  res.json({ id, status: 'synced', session });
});

// 2. Get Session Data (Raw)
app.get('/api/v1/sessions/:id', async (req, res) => {
  const { id } = req.params;
  const filePath = path.join(SESSIONS_DIR, `${id}.json`);
  
  if (!await fs.pathExists(filePath)) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const session = await fs.readJson(filePath);
  res.json(session);
});

// 3. Connect/Launch (The "Universal Protocol" Endpoint)
// Returns a CDP Endpoint that *any* driver can connect to.
app.post('/api/v1/sessions/:id/connect', async (req, res) => {
  const { id } = req.params;
  const filePath = path.join(SESSIONS_DIR, `${id}.json`);

  if (!await fs.pathExists(filePath)) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const session: SessionProfile = await fs.readJson(filePath);

  try {
    // Check if we already have a running browser for this session?
    // For now, let's spawn a NEW one every time for isolation, or reuse if requested.
    // Simpler: Spawn new.
    
    console.log(`[Launching] Starting browser for ${session.name}...`);
    
    const browser = await puppeteer.launch({
      headless: true, // "new"
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--remote-debugging-address=0.0.0.0',
        '--remote-debugging-port=0' // Random port
      ]
    });

    const browserId = uuidv4();
    activeBrowsers.set(browserId, browser);

    // Hydrate Session
    const page = await browser.newPage();
    
    if (session.cookies.length > 0) {
      await page.setCookie(...session.cookies.map(c => ({
        ...c,
        // Puppeteer strictness fixes
        expires: c.expires || undefined,
        sameSite: c.sameSite as any
      })));
    }
    
    // Set User Agent
    if (session.userAgent) {
      await page.setUserAgent(session.userAgent);
    }

    if (session.viewport) {
      await page.setViewport(session.viewport);
    }

    // TODO: LocalStorage injection requires domain navigation.
    // We can expose a helper script that clients can run.

    const wsEndpoint = browser.wsEndpoint();
    
    // If running in Docker, we need to replace 127.0.0.1 with the public IP/Host
    // But since we are tunneling or exposing ports, we might need a proxy.
    // For local dev, 127.0.0.1 is fine.
    
    console.log(`[Launched] ${session.name} -> ${wsEndpoint}`);

    res.json({
      browserId,
      browserWSEndpoint: wsEndpoint,
      session // Return session meta so client knows what it connected to
    });

  } catch (error: any) {
    console.error('Failed to launch browser:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Stop Browser
app.delete('/api/v1/browsers/:id', async (req, res) => {
  const { id } = req.params;
  const browser = activeBrowsers.get(id);
  if (browser) {
    await browser.close();
    activeBrowsers.delete(id);
    res.json({ status: 'closed' });
  } else {
    res.status(404).json({ error: 'Browser not found' });
  }
});

app.listen(PORT, () => {
  console.log(`PSP Server listening on port ${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
});