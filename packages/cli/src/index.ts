#!/usr/bin/env node

import { Command } from 'commander';
import { launchWithPSP, listSessions, demo } from '../../adapters/playwright/src/helpers';

const program = new Command();

program
  .name('psp')
  .description('PersistentSessionsProtocol CLI - Minimal v0.1')
  .version('0.1.0');

/**
 * List command
 */
program
  .command('list')
  .description('List all available sessions')
  .action(async () => {
    try {
      console.log('📋 Available sessions:');
      
      const sessions = await listSessions();
      
      if (sessions.length === 0) {
        console.log('  No sessions found. Use "psp create <name>" to create one.');
        return;
      }
      
      sessions.forEach((session, index) => {
        const metadata = session.getMetadata();
        console.log(`\n  ${index + 1}. ${metadata.name}`);
        console.log(`     ID: ${metadata.id}`);
        console.log(`     Created: ${new Date(metadata.createdAt).toLocaleString()}`);
        console.log(`     Profile: ${session.getUserDataDir()}`);
        if (metadata.description) {
          console.log(`     Description: ${metadata.description}`);
        }
      });
      
      console.log(`\n💡 Use "psp open <sessionId>" to open a session`);
      
    } catch (error) {
      console.error('❌ Error listing sessions:', error);
      process.exit(1);
    }
  });

/**
 * Create command
 */
program
  .command('create <name>')
  .description('Create a new session with Chrome profile')
  .option('-d, --description <desc>', 'Session description')
  .action(async (name: string, options: { description?: string }) => {
    try {
      console.log(`📸 Creating new session: ${name}`);
      
      const { session } = await launchWithPSP(undefined, {
        sessionName: name,
        headless: false
      });
      
      if (options.description) {
        const metadata = session.getMetadata();
        metadata.description = options.description;
        await session.save();
      }
      
      console.log(`✅ Session created successfully!`);
      console.log(`📋 Session ID: ${session.getId()}`);
      console.log(`📁 Chrome profile: ${session.getUserDataDir()}`);
      console.log(`💡 Use this browser to set up your session, then close it`);
      
    } catch (error) {
      console.error('❌ Error creating session:', error);
      process.exit(1);
    }
  });

/**
 * Open command
 */
program
  .command('open <sessionId>')
  .description('Open an existing session')
  .option('--headless', 'Run in headless mode')
  .action(async (sessionId: string, options: { headless?: boolean }) => {
    try {
      console.log(`🔄 Opening session: ${sessionId}`);
      
      const { context, session } = await launchWithPSP(sessionId, {
        headless: options.headless ?? false
      });
      
      const metadata = session.getMetadata();
      console.log(`📋 Session: ${metadata.name}`);
      console.log(`📁 Profile: ${session.getUserDataDir()}`);
      console.log(`✅ Chrome opened with restored session!`);
      
    } catch (error) {
      console.error('❌ Error opening session:', error);
      process.exit(1);
    }
  });

/**
 * Demo command
 */
program
  .command('demo')
  .description('Run a demo of PSP functionality')
  .action(async () => {
    try {
      console.log('🚀 Starting PSP Demo...');
      await demo();
      
    } catch (error) {
      console.error('❌ Error running demo:', error);
      process.exit(1);
    }
  });

program.parse();