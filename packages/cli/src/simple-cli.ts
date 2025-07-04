#!/usr/bin/env node

import { Command } from 'commander';
import { chromium } from 'playwright';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import * as crypto from 'crypto';

const program = new Command();

program
  .name('psp')
  .description('PersistentSessionsProtocol CLI - v0.1 with Real Chrome Profiles')
  .version('0.1.0');

/**
 * Simple session management using Chrome profiles
 */
class CliSession {
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

  async save(): Promise<void> {
    const sessionDir = path.join(os.homedir(), '.psp', 'sessions');
    const sessionFile = path.join(sessionDir, `${this.metadata.id}.json`);
    
    fs.mkdirSync(sessionDir, { recursive: true });
    
    fs.writeFileSync(sessionFile, JSON.stringify({
      metadata: this.metadata,
      userDataDir: this.userDataDir
    }, null, 2));
  }

  static async load(sessionId: string): Promise<CliSession> {
    const sessionDir = path.join(os.homedir(), '.psp', 'sessions');
    const sessionFile = path.join(sessionDir, `${sessionId}.json`);
    
    if (!fs.existsSync(sessionFile)) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    const data = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
    return new CliSession(data.metadata, data.userDataDir);
  }

  static async create(name: string, userDataDir?: string): Promise<CliSession> {
    const id = crypto.randomUUID();
    const now = Date.now();
    
    const profileDir = userDataDir || path.join(os.homedir(), '.psp', 'profiles', id);
    fs.mkdirSync(profileDir, { recursive: true });
    
    const metadata = {
      id,
      name,
      createdAt: now,
      updatedAt: now,
      source: 'cli'
    };
    
    const session = new CliSession(metadata, profileDir);
    await session.save();
    
    return session;
  }

  static async list(): Promise<CliSession[]> {
    const sessionDir = path.join(os.homedir(), '.psp', 'sessions');
    
    if (!fs.existsSync(sessionDir)) {
      return [];
    }
    
    const files = fs.readdirSync(sessionDir).filter(f => f.endsWith('.json'));
    const sessions: CliSession[] = [];
    
    for (const file of files) {
      try {
        const sessionId = path.basename(file, '.json');
        const session = await CliSession.load(sessionId);
        sessions.push(session);
      } catch (error) {
        console.warn(`Failed to load session from ${file}`);
      }
    }
    
    return sessions;
  }
}

/**
 * List sessions
 */
program
  .command('list')
  .description('List all PSP sessions')
  .action(async () => {
    try {
      const sessions = await CliSession.list();
      
      if (sessions.length === 0) {
        console.log('📭 No sessions found');
        return;
      }
      
      console.log(`📋 Found ${sessions.length} session(s):\n`);
      
      sessions.forEach((session, index) => {
        const meta = session.getMetadata();
        console.log(`${index + 1}. ${meta.name}`);
        console.log(`   ID: ${meta.id}`);
        console.log(`   Created: ${new Date(meta.createdAt).toLocaleString()}`);
        console.log(`   Profile: ${session.getUserDataDir()}`);
        console.log('');
      });
      
    } catch (error) {
      console.error('❌ Error listing sessions:', error);
      process.exit(1);
    }
  });

/**
 * Create session
 */
program
  .command('create <name>')
  .description('Create a new PSP session with Chrome profile')
  .option('-p, --profile <dir>', 'Use existing Chrome profile directory')
  .action(async (name: string, options: { profile?: string }) => {
    try {
      console.log(`🆕 Creating session: ${name}`);
      
      const session = await CliSession.create(name, options.profile);
      
      console.log(`✅ Session created successfully!`);
      console.log(`📋 Session ID: ${session.getId()}`);
      console.log(`📁 Chrome profile: ${session.getUserDataDir()}`);
      
    } catch (error) {
      console.error('❌ Error creating session:', error);
      process.exit(1);
    }
  });

/**
 * Open session
 */
program
  .command('open <sessionId>')
  .description('Open a session in Chrome browser')
  .option('--headless', 'Run in headless mode')
  .action(async (sessionId: string, options: { headless?: boolean }) => {
    try {
      console.log(`🚀 Opening session: ${sessionId}`);
      
      const session = await CliSession.load(sessionId);
      const userDataDir = session.getUserDataDir();
      
      console.log(`📂 Using Chrome profile: ${userDataDir}`);
      
      const context = await chromium.launchPersistentContext(userDataDir, {
        headless: options.headless ?? false
      });
      
      const page = await context.newPage();
      await page.goto('https://www.google.com');
      
      console.log(`✅ Session opened: ${session.getMetadata().name}`);
      
      if (!options.headless) {
        console.log('🔄 Browser will stay open until manually closed...');
        // Keep process alive for non-headless mode
        process.stdin.resume();
      } else {
        // For headless, demonstrate and close
        await page.waitForTimeout(2000);
        await context.close();
        console.log('🔒 Session closed');
      }
      
    } catch (error) {
      console.error('❌ Error opening session:', error);
      process.exit(1);
    }
  });

/**
 * Delete session
 */
program
  .command('delete <sessionId>')
  .description('Delete a PSP session')
  .option('-f, --force', 'Force delete without confirmation')
  .action(async (sessionId: string, options: { force?: boolean }) => {
    try {
      const session = await CliSession.load(sessionId);
      
      if (!options.force) {
        console.log(`⚠️  About to delete session: ${session.getMetadata().name}`);
        console.log(`📁 Profile: ${session.getUserDataDir()}`);
        console.log('Use --force to skip this confirmation');
        return;
      }
      
      // Delete session metadata
      const sessionDir = path.join(os.homedir(), '.psp', 'sessions');
      const sessionFile = path.join(sessionDir, `${sessionId}.json`);
      
      if (fs.existsSync(sessionFile)) {
        fs.unlinkSync(sessionFile);
      }
      
      console.log(`✅ Session deleted: ${sessionId}`);
      console.log('📝 Note: Chrome profile directory was preserved');
      
    } catch (error) {
      console.error('❌ Error deleting session:', error);
      process.exit(1);
    }
  });

/**
 * Demo command
 */
program
  .command('demo')
  .description('Run PSP Chrome profile demo')
  .option('--headless', 'Run in headless mode')
  .action(async (options: { headless?: boolean }) => {
    try {
      console.log('🎯 PSP CLI Demo Starting...\n');
      
      // Create demo session
      const session = await CliSession.create('CLI Demo Session');
      const userDataDir = session.getUserDataDir();
      
      console.log(`📁 Created session: ${session.getId()}`);
      console.log(`📂 Chrome profile: ${userDataDir}\n`);
      
      // Open Chrome with session
      console.log('🚀 Opening Chrome with persistent context...');
      const context = await chromium.launchPersistentContext(userDataDir, {
        headless: options.headless ?? false
      });
      
      const page = await context.newPage();
      await page.goto('https://www.google.com');
      
      // Set some data
      await page.evaluate(() => {
        localStorage.setItem('psp-cli-demo', 'success');
        localStorage.setItem('timestamp', Date.now().toString());
      });
      
      console.log('📝 Set localStorage data in Chrome profile');
      await context.close();
      console.log('🔒 First session closed\n');
      
      // Reopen to verify persistence
      console.log('🔄 Reopening to verify persistence...');
      const context2 = await chromium.launchPersistentContext(userDataDir, {
        headless: options.headless ?? false
      });
      
      const page2 = await context2.newPage();
      await page2.goto('https://www.google.com');
      
      const data = await page2.evaluate(() => {
        return {
          demo: localStorage.getItem('psp-cli-demo'),
          timestamp: localStorage.getItem('timestamp')
        };
      });
      
      console.log('📊 Restored data:', data);
      
      if (data.demo === 'success') {
        console.log('\n✅ SUCCESS: Chrome profile persistence working!');
        console.log('🎯 PSP CLI demo completed successfully');
      } else {
        console.log('\n❌ FAILED: Persistence not working');
      }
      
      await context2.close();
      console.log('🔒 Demo session closed');
      
    } catch (error) {
      console.error('❌ Demo failed:', error);
      process.exit(1);
    }
  });

// Parse arguments
program.parse();

export { CliSession };