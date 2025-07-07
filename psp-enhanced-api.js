const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');
const WebSocket = require('ws');
const express = require('express');
const { v4: uuidv4 } = require('uuid');

class PSPEnhancedAPI {
  constructor(options = {}) {
    this.sessionsDir = options.sessionsDir || './sessions';
    this.profilesDir = options.profilesDir || './profiles';
    this.activeSessions = new Map();
    this.activeProfiles = new Map();
    this.app = express();
    this.server = null;
    this.wsServer = null;
    
    this.defaultSessionConfig = {
      stealth: true,
      timeout: 300, // 5 minutes default
      proxy: null,
      locale: 'en-US',
      timezone: 'America/New_York',
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      acceptCookies: true,
      blockAds: false,
      solveCaptcha: false,
      recordSession: false
    };

    this.setupRoutes();
  }

  setupRoutes() {
    this.app.use(express.json());

    // Profile Management Routes (HyperBrowser pattern)
    this.app.post('/api/profiles', this.createProfile.bind(this));
    this.app.get('/api/profiles', this.listProfiles.bind(this));
    this.app.get('/api/profiles/:id', this.getProfile.bind(this));
    this.app.delete('/api/profiles/:id', this.deleteProfile.bind(this));

    // Session Management Routes (Enhanced with both patterns)
    this.app.post('/api/sessions', this.createSession.bind(this));
    this.app.get('/api/sessions', this.listSessions.bind(this));
    this.app.get('/api/sessions/:id', this.getSession.bind(this));
    this.app.post('/api/sessions/:id/reconnect', this.reconnectSession.bind(this));
    this.app.delete('/api/sessions/:id', this.stopSession.bind(this));

    // Session Actions
    this.app.post('/api/sessions/:id/navigate', this.navigateSession.bind(this));
    this.app.post('/api/sessions/:id/screenshot', this.screenshotSession.bind(this));
    this.app.post('/api/sessions/:id/execute', this.executeInSession.bind(this));
    this.app.get('/api/sessions/:id/state', this.getSessionState.bind(this));
    this.app.post('/api/sessions/:id/state', this.setSessionState.bind(this));

    // Browserless-style User Data Directory
    this.app.post('/api/sessions/:id/userdata', this.manageUserData.bind(this));
    
    // Live Session Monitoring
    this.app.get('/api/sessions/:id/live', this.getLiveSession.bind(this));
  }

  async startServer(port = 3000) {
    await fs.mkdir(this.sessionsDir, { recursive: true });
    await fs.mkdir(this.profilesDir, { recursive: true });

    this.server = this.app.listen(port, () => {
      console.log(`🚀 PSP Enhanced API Server running on port ${port}`);
    });

    // WebSocket server for live session monitoring
    this.wsServer = new WebSocket.Server({ port: port + 1 });
    this.wsServer.on('connection', this.handleWebSocketConnection.bind(this));

    console.log(`🔌 WebSocket server running on port ${port + 1}`);
  }

  handleWebSocketConnection(ws, req) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const sessionId = url.searchParams.get('sessionId');
    
    if (sessionId && this.activeSessions.has(sessionId)) {
      const session = this.activeSessions.get(sessionId);
      session.websockets = session.websockets || [];
      session.websockets.push(ws);
      
      ws.on('close', () => {
        if (session.websockets) {
          session.websockets = session.websockets.filter(socket => socket !== ws);
        }
      });
      
      console.log(`🔌 WebSocket connected for session ${sessionId}`);
    }
  }

  // Profile Management (HyperBrowser pattern)
  async createProfile(req, res) {
    try {
      const { name } = req.body;
      const profileId = uuidv4();
      const profilePath = path.join(this.profilesDir, profileId);
      
      await fs.mkdir(profilePath, { recursive: true });

      const profile = {
        id: profileId,
        name: name || `Profile_${profileId.slice(0, 8)}`,
        createdAt: new Date().toISOString(),
        lastUsed: null,
        sessionCount: 0,
        path: profilePath
      };

      await fs.writeFile(
        path.join(profilePath, 'metadata.json'),
        JSON.stringify(profile, null, 2)
      );

      this.activeProfiles.set(profileId, profile);
      
      res.json({
        success: true,
        profile: {
          id: profile.id,
          name: profile.name,
          createdAt: profile.createdAt
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async listProfiles(req, res) {
    try {
      const { page = 1, limit = 10, name } = req.query;
      const profiles = await fs.readdir(this.profilesDir);
      
      const profileList = [];
      for (const profileId of profiles) {
        try {
          const metadataPath = path.join(this.profilesDir, profileId, 'metadata.json');
          const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
          
          if (!name || metadata.name.includes(name)) {
            profileList.push(metadata);
          }
        } catch (error) {
          console.warn(`Failed to read profile ${profileId}:`, error.message);
        }
      }

      const startIndex = (page - 1) * limit;
      const paginatedProfiles = profileList.slice(startIndex, startIndex + parseInt(limit));

      res.json({
        success: true,
        profiles: paginatedProfiles,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: profileList.length
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getProfile(req, res) {
    try {
      const { id } = req.params;
      const metadataPath = path.join(this.profilesDir, id, 'metadata.json');
      
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
      
      res.json({
        success: true,
        profile: metadata
      });
    } catch (error) {
      res.status(404).json({ error: 'Profile not found' });
    }
  }

  async deleteProfile(req, res) {
    try {
      const { id } = req.params;
      const profilePath = path.join(this.profilesDir, id);
      
      await fs.rm(profilePath, { recursive: true, force: true });
      this.activeProfiles.delete(id);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Session Management (Enhanced with both patterns)
  async createSession(req, res) {
    try {
      const {
        profile,
        stealth = true,
        timeout = 300,
        proxy,
        locale = 'en-US',
        timezone,
        viewport,
        userAgent,
        persistChanges = false,
        ...otherOptions
      } = req.body;

      const sessionId = uuidv4();
      const sessionPath = path.join(this.sessionsDir, sessionId);
      await fs.mkdir(sessionPath, { recursive: true });

      // Determine user data directory
      let userDataDir = sessionPath;
      if (profile?.id) {
        const profilePath = path.join(this.profilesDir, profile.id);
        if (await this.pathExists(profilePath)) {
          userDataDir = profilePath;
        }
      }

      const sessionConfig = {
        ...this.defaultSessionConfig,
        stealth,
        timeout,
        proxy,
        locale,
        timezone,
        viewport,
        userAgent,
        ...otherOptions
      };

      const launchOptions = this.buildLaunchOptions(sessionConfig, userDataDir);
      const context = await chromium.launchPersistentContext(userDataDir, launchOptions);

      // Setup stealth mode if enabled
      if (sessionConfig.stealth) {
        await this.setupStealthMode(context);
      }

      const session = {
        id: sessionId,
        profileId: profile?.id || null,
        persistChanges: persistChanges,
        config: sessionConfig,
        status: 'active',
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        reconnectUrl: `/api/sessions/${sessionId}/reconnect`,
        liveUrl: `/api/sessions/${sessionId}/live`,
        wsEndpoint: `ws://localhost:${this.wsServer.options.port}?sessionId=${sessionId}`,
        context: context,
        userDataDir: userDataDir,
        websockets: []
      };

      // Set timeout
      session.timeoutId = setTimeout(() => {
        this.stopSessionById(sessionId);
      }, sessionConfig.timeout * 1000);

      this.activeSessions.set(sessionId, session);

      // Update profile if specified
      if (profile?.id && persistChanges) {
        await this.updateProfileUsage(profile.id);
      }

      res.json({
        success: true,
        session: {
          id: session.id,
          status: session.status,
          createdAt: session.createdAt,
          reconnectUrl: session.reconnectUrl,
          liveUrl: session.liveUrl,
          wsEndpoint: session.wsEndpoint,
          config: sessionConfig
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  buildLaunchOptions(config, userDataDir) {
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      `--window-size=${config.viewport.width},${config.viewport.height}`,
      `--lang=${config.locale}`
    ];

    if (config.stealth) {
      args.push(
        '--disable-blink-features=AutomationControlled',
        '--exclude-switches=enable-automation',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-first-run',
        '--no-default-browser-check'
      );
    }

    if (config.timezone) {
      args.push(`--timezone=${config.timezone}`);
    }

    const launchOptions = {
      args,
      ignoreDefaultArgs: config.stealth ? ['--enable-automation'] : [],
      ignoreHTTPSErrors: true,
      acceptDownloads: true,
      locale: config.locale,
      viewport: config.viewport
    };

    if (config.proxy) {
      launchOptions.proxy = config.proxy;
    }

    return launchOptions;
  }

  async setupStealthMode(context) {
    const page = context.pages()[0] || await context.newPage();
    
    await page.addInitScript(() => {
      // Hide webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Mock chrome property
      window.chrome = {
        runtime: {},
        loadTimes: function() {},
        csi: function() {},
        app: {}
      };

      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );

      // Spoof plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // Spoof languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
    });
  }

  // Browserless-style reconnection
  async reconnectSession(req, res) {
    try {
      const { id } = req.params;
      const session = this.activeSessions.get(id);
      
      if (!session || session.status !== 'active') {
        return res.status(404).json({ error: 'Session not found or inactive' });
      }

      // Extend timeout
      if (session.timeoutId) {
        clearTimeout(session.timeoutId);
      }
      
      session.timeoutId = setTimeout(() => {
        this.stopSessionById(id);
      }, session.config.timeout * 1000);

      session.lastActivity = new Date().toISOString();

      // Generate new reconnect URL with token
      const reconnectToken = uuidv4();
      session.reconnectToken = reconnectToken;
      
      res.json({
        success: true,
        sessionId: id,
        reconnectUrl: `/api/sessions/${id}/reconnect?token=${reconnectToken}`,
        expiresAt: new Date(Date.now() + session.config.timeout * 1000).toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async navigateSession(req, res) {
    try {
      const { id } = req.params;
      const { url } = req.body;
      const session = this.activeSessions.get(id);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const page = session.context.pages()[0] || await session.context.newPage();
      await page.goto(url);
      
      session.lastActivity = new Date().toISOString();
      
      // Broadcast to WebSocket clients
      this.broadcastToSession(id, {
        type: 'navigation',
        url: url,
        timestamp: session.lastActivity
      });

      res.json({
        success: true,
        url: page.url(),
        title: await page.title()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async screenshotSession(req, res) {
    try {
      const { id } = req.params;
      const { fullPage = false, format = 'png' } = req.body;
      const session = this.activeSessions.get(id);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const page = session.context.pages()[0];
      if (!page) {
        return res.status(400).json({ error: 'No active page in session' });
      }

      const screenshot = await page.screenshot({ 
        fullPage, 
        type: format 
      });
      
      const screenshotPath = path.join(this.sessionsDir, id, `screenshot-${Date.now()}.${format}`);
      await fs.writeFile(screenshotPath, screenshot);
      
      session.lastActivity = new Date().toISOString();

      res.json({
        success: true,
        screenshotPath: screenshotPath,
        size: screenshot.length,
        format: format
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getSessionState(req, res) {
    try {
      const { id } = req.params;
      const session = this.activeSessions.get(id);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const page = session.context.pages()[0];
      const state = {
        cookies: await session.context.cookies(),
        url: page ? page.url() : null,
        title: page ? await page.title() : null,
        viewport: page ? page.viewportSize() : null,
        userAgent: page ? await page.evaluate(() => navigator.userAgent) : null,
        localStorage: page ? await page.evaluate(() => JSON.stringify(localStorage)) : '{}',
        sessionStorage: page ? await page.evaluate(() => JSON.stringify(sessionStorage)) : '{}'
      };

      res.json({
        success: true,
        state: state,
        sessionId: id,
        lastActivity: session.lastActivity
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async setSessionState(req, res) {
    try {
      const { id } = req.params;
      const { cookies, localStorage: localStorageData, sessionStorage: sessionStorageData } = req.body;
      const session = this.activeSessions.get(id);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const page = session.context.pages()[0] || await session.context.newPage();

      if (cookies) {
        await session.context.addCookies(cookies);
      }

      if (localStorageData) {
        await page.evaluate((data) => {
          const parsed = JSON.parse(data);
          for (const [key, value] of Object.entries(parsed)) {
            localStorage.setItem(key, value);
          }
        }, localStorageData);
      }

      if (sessionStorageData) {
        await page.evaluate((data) => {
          const parsed = JSON.parse(data);
          for (const [key, value] of Object.entries(parsed)) {
            sessionStorage.setItem(key, value);
          }
        }, sessionStorageData);
      }

      session.lastActivity = new Date().toISOString();

      res.json({
        success: true,
        message: 'Session state updated successfully'
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async stopSession(req, res) {
    try {
      const { id } = req.params;
      const session = this.activeSessions.get(id);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      await this.stopSessionById(id);
      
      res.json({
        success: true,
        message: 'Session stopped successfully'
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async stopSessionById(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    try {
      // Save final state if persistChanges is enabled
      if (session.persistChanges && session.profileId) {
        await this.updateProfileUsage(session.profileId);
      }

      // Close context
      await session.context.close();
      
      // Clear timeout
      if (session.timeoutId) {
        clearTimeout(session.timeoutId);
      }

      // Close WebSocket connections
      if (session.websockets) {
        session.websockets.forEach(ws => ws.close());
      }

      session.status = 'closed';
      this.activeSessions.delete(sessionId);
      
      console.log(`🔒 Session ${sessionId} stopped`);
    } catch (error) {
      console.error(`Error stopping session ${sessionId}:`, error);
    }
  }

  broadcastToSession(sessionId, message) {
    const session = this.activeSessions.get(sessionId);
    if (session && session.websockets) {
      session.websockets.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
        }
      });
    }
  }

  async updateProfileUsage(profileId) {
    try {
      const metadataPath = path.join(this.profilesDir, profileId, 'metadata.json');
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
      
      metadata.lastUsed = new Date().toISOString();
      metadata.sessionCount = (metadata.sessionCount || 0) + 1;
      
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.warn(`Failed to update profile ${profileId}:`, error.message);
    }
  }

  async pathExists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async listSessions(req, res) {
    try {
      const sessions = Array.from(this.activeSessions.values()).map(session => ({
        id: session.id,
        profileId: session.profileId,
        status: session.status,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        reconnectUrl: session.reconnectUrl,
        liveUrl: session.liveUrl,
        config: session.config
      }));

      res.json({
        success: true,
        sessions: sessions,
        activeCount: sessions.length
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getSession(req, res) {
    try {
      const { id } = req.params;
      const session = this.activeSessions.get(id);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      res.json({
        success: true,
        session: {
          id: session.id,
          profileId: session.profileId,
          status: session.status,
          createdAt: session.createdAt,
          lastActivity: session.lastActivity,
          reconnectUrl: session.reconnectUrl,
          liveUrl: session.liveUrl,
          wsEndpoint: session.wsEndpoint,
          config: session.config
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async shutdown() {
    console.log('🔄 Shutting down PSP Enhanced API...');
    
    // Stop all active sessions
    for (const sessionId of this.activeSessions.keys()) {
      await this.stopSessionById(sessionId);
    }

    // Close servers
    if (this.wsServer) {
      this.wsServer.close();
    }
    
    if (this.server) {
      this.server.close();
    }

    console.log('✅ PSP Enhanced API shutdown complete');
  }
}

// Demo function
async function demonstratePSPEnhancedAPI() {
  console.log('🌟 PSP Enhanced API Demo');
  console.log('Incorporating patterns from Browserless and HyperBrowser');
  console.log('================================');

  const api = new PSPEnhancedAPI();
  await api.startServer(3000);

  // Create a profile (HyperBrowser pattern)
  console.log('\n📋 Creating profile...');
  const profileResponse = await fetch('http://localhost:3000/api/profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Demo Profile' })
  });
  const profile = await profileResponse.json();
  console.log('✅ Profile created:', profile.profile.id);

  // Create session with profile (Enhanced pattern)
  console.log('\n🚀 Creating session with profile...');
  const sessionResponse = await fetch('http://localhost:3000/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profile: { id: profile.profile.id, persistChanges: true },
      stealth: true,
      timeout: 600
    })
  });
  const session = await sessionResponse.json();
  console.log('✅ Session created:', session.session.id);

  // Navigate session
  console.log('\n🌐 Navigating to Gmail...');
  await fetch(`http://localhost:3000/api/sessions/${session.session.id}/navigate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://gmail.com' })
  });

  // Take screenshot
  console.log('\n📸 Taking screenshot...');
  await fetch(`http://localhost:3000/api/sessions/${session.session.id}/screenshot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullPage: false })
  });

  // Get session state
  console.log('\n📊 Getting session state...');
  const stateResponse = await fetch(`http://localhost:3000/api/sessions/${session.session.id}/state`);
  const state = await stateResponse.json();
  console.log('✅ State retrieved:', state.state.url);

  // Test reconnection (Browserless pattern)
  console.log('\n🔄 Testing session reconnection...');
  const reconnectResponse = await fetch(`http://localhost:3000/api/sessions/${session.session.id}/reconnect`, {
    method: 'POST'
  });
  const reconnect = await reconnectResponse.json();
  console.log('✅ Reconnect URL generated:', reconnect.reconnectUrl);

  console.log('\n⏱️ Waiting 10 seconds for demonstration...');
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Clean up
  console.log('\n🧹 Cleaning up...');
  await api.shutdown();
  
  console.log('\n✅ PSP Enhanced API demonstration completed!');
  console.log('🎯 Features demonstrated:');
  console.log('   - HyperBrowser-style profiles with state persistence');
  console.log('   - Browserless-style session reconnection');
  console.log('   - Advanced stealth mode configuration');
  console.log('   - Real-time WebSocket monitoring');
  console.log('   - RESTful API for all operations');
  console.log('   - Session state management and restoration');
}

if (require.main === module) {
  demonstratePSPEnhancedAPI().catch(console.error);
}

module.exports = { PSPEnhancedAPI, demonstratePSPEnhancedAPI };