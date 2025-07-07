import express from 'express';
import cors from 'cors';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { chromium } from 'playwright';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

/**
 * Simple session management for server
 */
class ServerSession {
  constructor(private metadata: any, private userDataDir: string) {}

  getId(): string {
    return this.metadata.id;
  }

  getMetadata(): any {
    return this.metadata;
  }

  getUserDataDir(): string {
    return this.userDataDir;
  }

  toJSON(): any {
    return {
      id: this.getId(),
      metadata: this.getMetadata(),
      userDataDir: this.getUserDataDir()
    };
  }

  async save(): Promise<void> {
    const sessionDir = path.join(os.homedir(), '.psp', 'sessions');
    const sessionFile = path.join(sessionDir, `${this.metadata.id}.json`);
    
    fs.mkdirSync(sessionDir, { recursive: true });
    
    fs.writeFileSync(sessionFile, JSON.stringify({
      metadata: this.metadata,
      userDataDir: this.userDataDir
    }, null, 2));
  }

  static async load(sessionId: string): Promise<ServerSession> {
    const sessionDir = path.join(os.homedir(), '.psp', 'sessions');
    const sessionFile = path.join(sessionDir, `${sessionId}.json`);
    
    if (!fs.existsSync(sessionFile)) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    const data = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
    return new ServerSession(data.metadata, data.userDataDir);
  }

  static async create(name: string, userDataDir?: string): Promise<ServerSession> {
    const id = crypto.randomUUID();
    const now = Date.now();
    
    const profileDir = userDataDir || path.join(os.homedir(), '.psp', 'profiles', id);
    fs.mkdirSync(profileDir, { recursive: true });
    
    const metadata = {
      id,
      name,
      createdAt: now,
      updatedAt: now,
      source: 'server'
    };
    
    const session = new ServerSession(metadata, profileDir);
    await session.save();
    
    return session;
  }

  static async list(): Promise<ServerSession[]> {
    const sessionDir = path.join(os.homedir(), '.psp', 'sessions');
    
    if (!fs.existsSync(sessionDir)) {
      return [];
    }
    
    const files = fs.readdirSync(sessionDir).filter(f => f.endsWith('.json'));
    const sessions: ServerSession[] = [];
    
    for (const file of files) {
      try {
        const sessionId = path.basename(file, '.json');
        const session = await ServerSession.load(sessionId);
        sessions.push(session);
      } catch (error) {
        console.warn(`Failed to load session from ${file}`);
      }
    }
    
    return sessions;
  }

  async delete(): Promise<void> {
    const sessionDir = path.join(os.homedir(), '.psp', 'sessions');
    const sessionFile = path.join(sessionDir, `${this.metadata.id}.json`);
    
    if (fs.existsSync(sessionFile)) {
      fs.unlinkSync(sessionFile);
    }
  }
}

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'PSP Server v0.1', 
    version: '0.1.0',
    features: ['chrome-profiles', 'session-management'],
    timestamp: new Date().toISOString()
  });
});

/**
 * Get server info
 */
app.get('/', (req, res) => {
  res.json({
    name: 'PersistentSessionsProtocol Server',
    version: '0.1.0',
    description: 'Chrome Profile Session Management Server',
    endpoints: {
      'GET /health': 'Health check',
      'GET /sessions': 'List all sessions',
      'POST /sessions': 'Create new session',
      'GET /sessions/:id': 'Get session details',
      'DELETE /sessions/:id': 'Delete session',
      'POST /sessions/:id/launch': 'Launch session in browser',
      'POST /demo': 'Run server demo'
    }
  });
});

/**
 * List all sessions
 */
app.get('/sessions', async (req, res) => {
  try {
    const sessions = await ServerSession.list();
    res.json({ 
      count: sessions.length,
      sessions: sessions.map(s => s.toJSON())
    });
  } catch (error) {
    console.error('Error listing sessions:', error);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

/**
 * Create a new session
 */
app.post('/sessions', async (req, res) => {
  try {
    const { name, userDataDir } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Session name is required' });
    }
    
    const session = await ServerSession.create(name, userDataDir);
    
    res.status(201).json({
      message: 'Session created successfully',
      session: session.toJSON()
    });
    
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

/**
 * Get a specific session
 */
app.get('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const session = await ServerSession.load(id);
    
    res.json({ session: session.toJSON() });
    
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: 'Session not found' });
    } else {
      console.error('Error getting session:', error);
      res.status(500).json({ error: 'Failed to get session' });
    }
  }
});

/**
 * Delete a session
 */
app.delete('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const session = await ServerSession.load(id);
    
    await session.delete();
    
    res.json({ 
      message: 'Session deleted successfully',
      id: id
    });
    
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: 'Session not found' });
    } else {
      console.error('Error deleting session:', error);
      res.status(500).json({ error: 'Failed to delete session' });
    }
  }
});

/**
 * Launch a session in browser (for demonstration)
 */
app.post('/sessions/:id/launch', async (req, res) => {
  try {
    const { id } = req.params;
    const { headless = true, url = 'https://www.google.com' } = req.body;
    
    const session = await ServerSession.load(id);
    const userDataDir = session.getUserDataDir();
    
    // Launch Chrome with the session's profile
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: headless
    });
    
    const page = await context.newPage();
    await page.goto(url);
    
    // Demonstrate session persistence by setting some data
    await page.evaluate(() => {
      localStorage.setItem('server-launch', 'success');
      localStorage.setItem('launch-time', Date.now().toString());
    });
    
    // For headless mode, close immediately after demonstration
    if (headless) {
      const data = await page.evaluate(() => {
        return {
          serverLaunch: localStorage.getItem('server-launch'),
          launchTime: localStorage.getItem('launch-time'),
          url: window.location.href
        };
      });
      
      await context.close();
      
      res.json({
        message: 'Session launched and closed successfully',
        session: session.toJSON(),
        demonstration: data
      });
    } else {
      res.json({
        message: 'Session launched in browser',
        session: session.toJSON(),
        note: 'Browser will remain open'
      });
    }
    
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: 'Session not found' });
    } else {
      console.error('Error launching session:', error);
      res.status(500).json({ error: 'Failed to launch session' });
    }
  }
});

/**
 * Import current Chrome session endpoint
 */
app.post('/import', async (req, res) => {
  try {
    const { name } = req.body;
    
    // Import from the most active Chrome profile
    const chromeDir = path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome');
    const activeProfile = findMostActiveProfile(chromeDir);
    
    if (!activeProfile) {
      return res.status(400).json({ error: 'No active Chrome profile found. Make sure Chrome has been run at least once.' });
    }
    
    // Create a new PSP session
    const session = await ServerSession.create(name || `Imported Chrome Session ${new Date().toISOString()}`);
    const targetDir = session.getUserDataDir();
    
    console.log(`📋 Importing Chrome session from: ${activeProfile}`);
    console.log(`📁 Creating PSP profile at: ${targetDir}`);
    
    // Copy the entire Chrome profile for complete session preservation
    console.log(`📋 Copying entire Chrome profile for complete session preservation...`);
    const copyResults = [];
    
    try {
      // CRITICAL: Chrome needs the COMPLETE profile structure to work properly
      // This includes Sessions/, GPUCache/, Extensions/, and many system files
      console.log(`📋 Starting COMPLETE Chrome profile copy...`);
      
      copyDirectoryRecursive(activeProfile, targetDir);
      copyResults.push({ operation: 'complete_profile_copy', status: 'success' });
      console.log(`✅ Complete Chrome profile copied successfully!`);
      console.log(`📁 Profile size copied: ${getDirectorySize(targetDir)} bytes`);
      
    } catch (error) {
      console.error(`❌ CRITICAL: Failed to copy complete profile: ${error}`);
      copyResults.push({ operation: 'complete_profile_copy', status: 'failed', error: String(error) });
      
      // This is critical - without complete profile Chrome won't work properly
      throw new Error(`Profile import failed - Chrome requires complete profile structure for authentication`);
    }
    
    await session.save();
    
    res.json({
      message: 'Chrome session imported successfully',
      session: session.toJSON(),
      import: {
        sourceProfile: activeProfile,
        targetProfile: targetDir,
        copyResults: copyResults,
        copiedFiles: copyResults.filter(r => r.status === 'copied').length
      }
    });
    
  } catch (error) {
    console.error('Error importing Chrome session:', error);
    res.status(500).json({ error: 'Failed to import Chrome session' });
  }
});

/**
 * Helper function to copy directory recursively
 */
function copyDirectoryRecursive(source: string, target: string): void {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
  
  const items = fs.readdirSync(source);
  
  for (const item of items) {
    const sourcePath = path.join(source, item);
    const targetPath = path.join(target, item);
    
    if (fs.statSync(sourcePath).isDirectory()) {
      copyDirectoryRecursive(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

/**
 * Helper function to get directory size
 */
function getDirectorySize(dirPath: string): number {
  let size = 0;
  
  if (!fs.existsSync(dirPath)) {
    return 0;
  }
  
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        size += getDirectorySize(itemPath);
      } else {
        size += stats.size;
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read directory ${dirPath}:`, error);
  }
  
  return size;
}

/**
 * Find the most active Chrome profile based on recent activity
 */
function findMostActiveProfile(chromeDir: string): string | null {
  if (!fs.existsSync(chromeDir)) {
    return null;
  }
  
  const profileDirs = ['Default', 'Profile 1', 'Profile 2', 'Profile 3', 'Profile 4', 'Profile 5'];
  let mostActiveProfile = null;
  let latestTime = 0;
  
  for (const profileName of profileDirs) {
    const profilePath = path.join(chromeDir, profileName);
    
    if (!fs.existsSync(profilePath)) {
      continue;
    }
    
    // Check for important files that indicate an active profile
    const cookiesPath = path.join(profilePath, 'Cookies');
    const preferencesPath = path.join(profilePath, 'Preferences');
    
    if (fs.existsSync(cookiesPath) && fs.existsSync(preferencesPath)) {
      // Use the modification time of the Cookies file as activity indicator
      const cookiesStat = fs.statSync(cookiesPath);
      const modTime = cookiesStat.mtime.getTime();
      
      // Also check if this profile has substantial data (not just a fresh profile)
      const cookiesSize = cookiesStat.size;
      
      // Prefer profiles with recent activity and substantial data
      if (modTime > latestTime && cookiesSize > 100000) { // 100KB threshold
        latestTime = modTime;
        mostActiveProfile = profilePath;
      }
    }
  }
  
  // If no substantial profile found, fall back to Default
  if (!mostActiveProfile) {
    const defaultPath = path.join(chromeDir, 'Default');
    if (fs.existsSync(defaultPath)) {
      mostActiveProfile = defaultPath;
    }
  }
  
  return mostActiveProfile;
}

/**
 * Server demo endpoint
 */
app.post('/demo', async (req, res) => {
  try {
    console.log('🎯 Running server demo...');
    
    // Create demo session
    const session = await ServerSession.create('Server Demo Session');
    
    // Launch and set data
    const context = await chromium.launchPersistentContext(session.getUserDataDir(), {
      headless: true
    });
    
    const page = await context.newPage();
    await page.goto('https://www.google.com');
    
    await page.evaluate(() => {
      localStorage.setItem('server-demo', 'chrome-profile-working');
      localStorage.setItem('timestamp', Date.now().toString());
    });
    
    await context.close();
    
    // Reopen to verify persistence
    const context2 = await chromium.launchPersistentContext(session.getUserDataDir(), {
      headless: true
    });
    
    const page2 = await context2.newPage();
    await page2.goto('https://www.google.com');
    
    const data = await page2.evaluate(() => {
      return {
        demo: localStorage.getItem('server-demo'),
        timestamp: localStorage.getItem('timestamp')
      };
    });
    
    await context2.close();
    
    const isWorking = data.demo === 'chrome-profile-working';
    
    res.json({
      message: 'Server demo completed',
      success: isWorking,
      session: session.toJSON(),
      demonstration: {
        persistenceTest: isWorking ? 'PASSED' : 'FAILED',
        data: data,
        profile: session.getUserDataDir()
      }
    });
    
  } catch (error) {
    console.error('Error running demo:', error);
    res.status(500).json({ error: 'Demo failed' });
  }
});

/**
 * Start server
 */
app.listen(port, () => {
  console.log('🚀 PSP Server v0.1 starting...');
  console.log(`📡 Server running on http://localhost:${port}`);
  console.log('🔧 Features: Chrome Profile Session Management');
  console.log('📋 Endpoints:');
  console.log('   GET  /health          - Health check');
  console.log('   GET  /sessions        - List sessions');
  console.log('   POST /sessions        - Create session');
  console.log('   GET  /sessions/:id    - Get session');
  console.log('   DELETE /sessions/:id  - Delete session');
  console.log('   POST /sessions/:id/launch - Launch session');
  console.log('   POST /import          - Import Chrome session');
  console.log('   POST /demo            - Run demo');
  console.log('\n✅ Ready for PSP requests!');
});

export { ServerSession };