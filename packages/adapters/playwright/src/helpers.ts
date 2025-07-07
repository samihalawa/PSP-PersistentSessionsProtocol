import { chromium, BrowserContext, Browser } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as crypto from 'crypto';

// Temporary internal types for this implementation
interface SessionMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

interface Session {
  getId(): string;
  getMetadata(): SessionMetadata;
  capture(context: BrowserContext): Promise<void>;
  restore(context: BrowserContext): Promise<void>;
  save(): Promise<void>;
  delete(): Promise<void>;
}

// Simple session implementation for v0.1
class SimpleSession implements Session {
  private metadata: SessionMetadata;
  private userDataDir: string;

  constructor(metadata: SessionMetadata, userDataDir: string) {
    this.metadata = metadata;
    this.userDataDir = userDataDir;
  }

  getId(): string {
    return this.metadata.id;
  }

  getMetadata(): SessionMetadata {
    return this.metadata;
  }

  async capture(context: BrowserContext): Promise<void> {
    // For Chrome profiles, the session data is automatically persisted
    // in the userDataDir by Chrome itself
    console.log(`Session captured to Chrome profile: ${this.userDataDir}`);
  }

  async restore(context: BrowserContext): Promise<void> {
    // For Chrome profiles, restoration happens automatically when
    // launching with the same userDataDir
    console.log(`Session restored from Chrome profile: ${this.userDataDir}`);
  }

  async save(): Promise<void> {
    // Save session metadata
    const sessionDir = path.join(os.homedir(), '.psp', 'sessions');
    const sessionFile = path.join(sessionDir, `${this.metadata.id}.json`);
    
    // Ensure directory exists
    fs.mkdirSync(sessionDir, { recursive: true });
    
    // Save metadata
    fs.writeFileSync(sessionFile, JSON.stringify({
      metadata: this.metadata,
      userDataDir: this.userDataDir
    }, null, 2));
  }

  async delete(): Promise<void> {
    const sessionDir = path.join(os.homedir(), '.psp', 'sessions');
    const sessionFile = path.join(sessionDir, `${this.metadata.id}.json`);
    
    if (fs.existsSync(sessionFile)) {
      fs.unlinkSync(sessionFile);
    }
  }

  static async load(sessionId: string): Promise<SimpleSession> {
    const sessionDir = path.join(os.homedir(), '.psp', 'sessions');
    const sessionFile = path.join(sessionDir, `${sessionId}.json`);
    
    if (!fs.existsSync(sessionFile)) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    const data = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
    return new SimpleSession(data.metadata, data.userDataDir);
  }

  static async create(options: {
    name: string;
    description?: string;
    userDataDir?: string;
  }): Promise<SimpleSession> {
    const id = crypto.randomUUID();
    const now = Date.now();
    
    // Use provided userDataDir or create a new one
    const userDataDir = options.userDataDir || path.join(os.homedir(), '.psp', 'profiles', id);
    
    // Ensure profile directory exists
    fs.mkdirSync(userDataDir, { recursive: true });
    
    const metadata: SessionMetadata = {
      id,
      name: options.name,
      description: options.description,
      createdAt: now,
      updatedAt: now
    };
    
    const session = new SimpleSession(metadata, userDataDir);
    await session.save();
    
    return session;
  }

  getUserDataDir(): string {
    return this.userDataDir;
  }
}

/**
 * Helper to launch Playwright with real Chrome profile persistence
 */
export async function launchWithPSP(
  sessionId?: string, 
  options: {
    headless?: boolean;
    userDataDir?: string;
    sessionName?: string;
  } = {}
): Promise<{ context: BrowserContext; session: SimpleSession }> {
  
  let session: SimpleSession;
  let userDataDir: string;
  
  if (sessionId) {
    // Load existing session
    try {
      session = await SimpleSession.load(sessionId);
      userDataDir = session.getUserDataDir();
      console.log(`Loaded session: ${session.getMetadata().name}`);
      console.log(`Using Chrome profile: ${userDataDir}`);
      
    } catch (error) {
      console.warn(`Could not load session ${sessionId}:`, error);
      
      // Create new session as fallback
      session = await SimpleSession.create({
        name: options.sessionName || `Session ${new Date().toISOString()}`,
        userDataDir: options.userDataDir
      });
      userDataDir = session.getUserDataDir();
    }
  } else {
    // Create new session
    session = await SimpleSession.create({
      name: options.sessionName || `Session ${new Date().toISOString()}`,
      userDataDir: options.userDataDir
    });
    userDataDir = session.getUserDataDir();
  }
  
  // Launch browser with persistent context using the Chrome profile
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: options.headless ?? false,
    // Chrome-specific options for better session persistence
    channel: 'chrome', // Use actual Chrome instead of Chromium
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ]
  });
  
  console.log(`Chrome launched with persistent context at: ${userDataDir}`);
  
  return { context, session };
}

/**
 * Capture current session from an existing Chrome profile
 */
export async function captureSession(
  userDataDir: string,
  sessionName?: string
): Promise<string> {
  // Create session from existing Chrome profile
  const session = await SimpleSession.create({
    name: sessionName || `Captured ${new Date().toISOString()}`,
    userDataDir: userDataDir
  });
  
  console.log(`Session captured with ID: ${session.getId()}`);
  console.log(`Profile directory: ${userDataDir}`);
  return session.getId();
}

/**
 * Import current Chrome session from running Chrome instance
 */
export async function importCurrentChromeSession(sessionName?: string): Promise<string> {
  const chromeDir = path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome');
  
  // Find the most active Chrome profile
  const activeProfile = findMostActiveProfile(chromeDir);
  
  if (!activeProfile) {
    throw new Error('No active Chrome profile found. Make sure Chrome has been run at least once.');
  }
  
  console.log(`🔍 Using Chrome profile: ${activeProfile}`);
  
  // Create a new PSP session by copying the Chrome profile
  const session = await SimpleSession.create({
    name: sessionName || `Imported Chrome Session ${new Date().toISOString()}`
  });
  
  const targetDir = session.getUserDataDir();
  
  console.log(`📋 Importing Chrome session from: ${activeProfile}`);
  console.log(`📁 Creating PSP profile at: ${targetDir}`);
  
  // Copy the entire Chrome profile for complete session preservation
  console.log(`📋 Copying entire Chrome profile for complete session preservation...`);
  
  try {
    // Copy all files and directories from the active profile
    copyDirectoryRecursive(activeProfile, targetDir);
    console.log(`✅ Complete Chrome profile copied successfully!`);
  } catch (error) {
    console.error(`❌ Failed to copy complete profile: ${error}`);
    
    // Fallback to essential files only
    console.log(`📋 Falling back to essential files copy...`);
    const filesToCopy = [
      'Cookies',
      'Local Storage', 
      'Session Storage',
      'Preferences',
      'Local State',
      'History',
      'Bookmarks',
      'Web Data',
      'Login Data',
      'Network Persistent State',
      'TransportSecurity',
      'Secure Preferences'
    ];
    
    for (const fileName of filesToCopy) {
      const sourcePath = path.join(activeProfile, fileName);
      const targetPath = path.join(targetDir, fileName);
      
      try {
        if (fs.existsSync(sourcePath)) {
          if (fs.statSync(sourcePath).isDirectory()) {
            copyDirectoryRecursive(sourcePath, targetPath);
          } else {
            fs.copyFileSync(sourcePath, targetPath);
          }
          console.log(`✅ Copied: ${fileName}`);
        }
      } catch (error) {
        console.warn(`⚠️  Could not copy ${fileName}: ${error}`);
      }
    }
  }
  
  await session.save();
  
  console.log(`✅ Chrome session imported successfully!`);
  console.log(`📋 Session ID: ${session.getId()}`);
  console.log(`📁 PSP profile: ${targetDir}`);
  console.log(`💡 Use "psp open ${session.getId()}" to launch with this session`);
  
  return session.getId();
}

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
 * List all available sessions
 */
export async function listSessions(): Promise<SimpleSession[]> {
  const sessionDir = path.join(os.homedir(), '.psp', 'sessions');
  
  if (!fs.existsSync(sessionDir)) {
    return [];
  }
  
  const files = fs.readdirSync(sessionDir).filter(f => f.endsWith('.json'));
  const sessions: SimpleSession[] = [];
  
  for (const file of files) {
    try {
      const sessionId = path.basename(file, '.json');
      const session = await SimpleSession.load(sessionId);
      sessions.push(session);
    } catch (error) {
      console.warn(`Failed to load session from ${file}:`, error);
    }
  }
  
  return sessions;
}

/**
 * Simple demo function using real Chrome profiles
 */
export async function demo() {
  console.log('🚀 PSP Playwright Demo Starting with Real Chrome Profiles...');
  
  // Step 1: Launch with new session using Chrome profile
  const { context, session } = await launchWithPSP(undefined, {
    sessionName: 'Demo Session',
    headless: false
  });
  
  const page = await context.newPage();
  
  // Navigate and interact
  console.log('📝 Setting a test cookie...');
  await page.goto('https://httpbin.org/cookies/set?demo=test&psp=chrome-profile');
  await page.waitForLoadState('networkidle');
  
  // The session is automatically captured in the Chrome profile
  await session.capture(context);
  const sessionId = session.getId();
  
  console.log(`✅ Session captured: ${sessionId}`);
  console.log(`📁 Chrome profile location: ${session.getUserDataDir()}`);
  
  await context.close();
  
  // Step 2: Launch with restored session
  console.log('🔄 Restoring session from Chrome profile...');
  
  const { context: context2, session: session2 } = await launchWithPSP(sessionId, {
    headless: false
  });
  
  const page2 = await context2.newPage();
  await page2.goto('https://httpbin.org/cookies');
  
  // Check if cookies were restored from Chrome profile
  const response = await page2.textContent('body');
  console.log('🍪 Response from cookie check:', response);
  
  if (response && (response.includes('demo') || response.includes('psp'))) {
    console.log('✅ Chrome profile session restoration successful!');
  } else {
    console.log('❌ Session restoration failed');
  }
  
  // Keep browser open for a moment to demonstrate
  console.log('🔍 Browser will stay open for 5 seconds for inspection...');
  await page2.waitForTimeout(5000);
  
  await context2.close();
  
  console.log('🎉 Demo completed!');
}