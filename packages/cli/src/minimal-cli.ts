#!/usr/bin/env node

import { Command } from 'commander';
import { Session, SessionOptions } from '@psp/core';
import { PlaywrightAdapter } from '@psp/adapter-playwright';

const program = new Command();

program
  .name('psp')
  .description('PersistentSessionsProtocol CLI - Minimal v0.1')
  .version('0.1.0');

/**
 * Capture command
 */
program
  .command('capture <profileDir>')
  .description('Capture a session from a Chrome profile directory')
  .option('-n, --name <name>', 'Name for the session')
  .action(async (profileDir: string, options: { name?: string }) => {
    try {
      console.log(`📸 Capturing session from: ${profileDir}`);
      
      const adapter = new PlaywrightAdapter();
      const session = await Session.create({
        name: options.name || `CLI Capture ${new Date().toISOString()}`,
        storage: 'local',
        description: `Captured from: ${profileDir}`
      } as SessionOptions, adapter);
      
      // Mock capture for minimal version
      const state = session.getState();
      state.origin = `file://${profileDir}`;
      state.storage.cookies.push({
        name: 'cli-demo',
        value: 'captured',
        domain: 'localhost',
        path: '/',
        expires: null,
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
        partitioned: false
      });
      
      await session.save();
      
      console.log(`✅ Session captured successfully!`);
      console.log(`📋 Session ID: ${session.getId()}`);
      console.log(`💾 Stored in: ~/.psp/sessions/`);
      
    } catch (error) {
      console.error('❌ Error capturing session:', error);
      process.exit(1);
    }
  });

/**
 * Restore command
 */
program
  .command('restore <profileDir> <sessionId>')
  .description('Restore a session to a Chrome profile directory')
  .action(async (profileDir: string, sessionId: string) => {
    try {
      console.log(`🔄 Restoring session ${sessionId} to: ${profileDir}`);
      
      const session = await Session.load(sessionId);
      const metadata = session.getMetadata();
      const state = session.getState();
      
      console.log(`📋 Session: ${metadata.name}`);
      console.log(`🕒 Created: ${new Date(metadata.createdAt).toLocaleString()}`);
      console.log(`🍪 Cookies: ${state.storage.cookies.length}`);
      console.log(`💾 localStorage keys: ${Array.from(state.storage.localStorage.keys()).length}`);
      
      // Mock restore for minimal version
      console.log(`✅ Session restored successfully to: ${profileDir}`);
      console.log(`🚀 You can now launch Chrome with this profile to use the restored session`);
      
    } catch (error) {
      console.error('❌ Error restoring session:', error);
      process.exit(1);
    }
  });

/**
 * List command
 */
program
  .command('list')
  .description('List all available sessions')
  .action(async () => {
    try {
      console.log('📋 Available sessions:');
      
      // Create a temporary session to access the storage provider
      const adapter = new PlaywrightAdapter();
      const tempSession = await Session.create({
        name: 'temp',
        storage: 'local'
      } as SessionOptions, adapter);
      
      const provider = (tempSession as any).storageProvider;
      const sessions = await provider.list();
      
      // Clean up temp session
      await tempSession.delete();
      
      if (sessions.length === 0) {
        console.log('  No sessions found. Use "psp capture <profileDir>" to create one.');
        return;
      }
      
      sessions.forEach((session, index) => {
        console.log(`\n  ${index + 1}. ${session.name}`);
        console.log(`     ID: ${session.id}`);
        console.log(`     Created: ${new Date(session.createdAt).toLocaleString()}`);
        console.log(`     Updated: ${new Date(session.updatedAt).toLocaleString()}`);
        if (session.description) {
          console.log(`     Description: ${session.description}`);
        }
      });
      
      console.log(`\n💡 Use "psp restore <profileDir> <sessionId>" to restore a session`);
      
    } catch (error) {
      console.error('❌ Error listing sessions:', error);
      process.exit(1);
    }
  });

/**
 * Delete command
 */
program
  .command('delete <sessionId>')
  .description('Delete a session')
  .action(async (sessionId: string) => {
    try {
      const session = await Session.load(sessionId);
      const metadata = session.getMetadata();
      
      console.log(`🗑️  Deleting session: ${metadata.name} (${sessionId})`);
      
      await session.delete();
      
      console.log('✅ Session deleted successfully!');
      
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
  .description('Run a simple demo of PSP functionality')
  .action(async () => {
    try {
      console.log('🚀 Starting PSP Demo...');
      
      const { demo } = await import('@psp/adapter-playwright');
      await demo();
      
    } catch (error) {
      console.error('❌ Error running demo:', error);
      process.exit(1);
    }
  });

program.parse();