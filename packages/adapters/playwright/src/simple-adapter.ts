import { chromium, BrowserContext } from 'playwright';
import { 
  Adapter,
  BrowserSessionState, 
  Event, 
  RecordingOptions, 
  PlaybackOptions 
} from '@psp/core';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import * as crypto from 'crypto';

/**
 * Simple Playwright Adapter for PSP v0.1
 * Uses launchPersistentContext for real Chrome profile persistence
 */
export class SimplePlaywrightAdapter extends Adapter {
  private context?: BrowserContext;
  
  constructor(options: any = {}) {
    super({
      ...options,
      type: 'playwright'
    });
  }

  async connect(target: BrowserContext): Promise<void> {
    this.context = target;
    await super.connect(target);
  }

  async captureState(): Promise<BrowserSessionState> {
    if (!this.context) {
      throw new Error('Not connected to a Playwright context');
    }

    // For persistent contexts, the state is automatically saved in the Chrome profile
    const state: BrowserSessionState = {
      version: '1.0.0',
      timestamp: Date.now(),
      origin: '',
      storage: {
        cookies: [],
        localStorage: new Map(),
        sessionStorage: new Map(),
      }
    };

    return state;
  }

  async applyState(state: BrowserSessionState): Promise<void> {
    if (!this.context) {
      throw new Error('Not connected to a Playwright context');
    }
    
    // For persistent contexts, state is automatically restored from Chrome profile
    console.log('State applied from Chrome profile');
  }

  async startRecording(options?: RecordingOptions): Promise<void> {
    throw new Error('Recording not implemented in simple adapter');
  }

  async stopRecording(): Promise<Event[]> {
    throw new Error('Recording not implemented in simple adapter');
  }

  async playRecording(events: Event[], options?: PlaybackOptions): Promise<void> {
    throw new Error('Playback not implemented in simple adapter');
  }
}

/**
 * Session class that uses Chrome profiles
 */
export class ChromeProfileSession {
  private metadata: any;
  private userDataDir: string;

  constructor(metadata: any, userDataDir: string) {
    this.metadata = metadata;
    this.userDataDir = userDataDir;
  }

  getId(): string {
    return this.metadata.id;
  }

  getMetadata(): any {
    return this.metadata;
  }

  getUserDataDir(): string {
    return this.userDataDir;
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

  static async load(sessionId: string): Promise<ChromeProfileSession> {
    const sessionDir = path.join(os.homedir(), '.psp', 'sessions');
    const sessionFile = path.join(sessionDir, `${sessionId}.json`);
    
    if (!fs.existsSync(sessionFile)) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    const data = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
    return new ChromeProfileSession(data.metadata, data.userDataDir);
  }

  static async create(options: {
    name: string;
    description?: string;
    userDataDir?: string;
  }): Promise<ChromeProfileSession> {
    const id = crypto.randomUUID();
    const now = Date.now();
    
    const userDataDir = options.userDataDir || path.join(os.homedir(), '.psp', 'profiles', id);
    fs.mkdirSync(userDataDir, { recursive: true });
    
    const metadata = {
      id,
      name: options.name,
      description: options.description,
      createdAt: now,
      updatedAt: now
    };
    
    const session = new ChromeProfileSession(metadata, userDataDir);
    await session.save();
    
    return session;
  }
}

/**
 * Launch with Chrome profile persistence
 */
export async function launchWithChromeProfile(
  sessionId?: string, 
  options: {
    headless?: boolean;
    userDataDir?: string;
    sessionName?: string;
  } = {}
): Promise<{ context: BrowserContext; session: ChromeProfileSession }> {
  
  let session: ChromeProfileSession;
  let userDataDir: string;
  
  if (sessionId) {
    try {
      session = await ChromeProfileSession.load(sessionId);
      userDataDir = session.getUserDataDir();
    } catch (error) {
      session = await ChromeProfileSession.create({
        name: options.sessionName || `Session ${new Date().toISOString()}`,
        userDataDir: options.userDataDir
      });
      userDataDir = session.getUserDataDir();
    }
  } else {
    session = await ChromeProfileSession.create({
      name: options.sessionName || `Session ${new Date().toISOString()}`,
      userDataDir: options.userDataDir
    });
    userDataDir = session.getUserDataDir();
  }
  
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: options.headless ?? false
  });
  
  return { context, session };
}