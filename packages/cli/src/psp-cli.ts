#!/usr/bin/env node

import { Command } from 'commander';
import { SimpleSession } from '@psp/core';
import { createPlaywrightAdapter } from '@psp/adapter-playwright';
import { createBrowserlessAdapter } from '@psp/adapter-browserless';
import { createBrowserUseAdapter } from '@psp/adapter-browser-use';
import { createSkyvernAdapter } from '@psp/adapter-skyvern';
import { createStagehandAdapter } from '@psp/adapter-stagehand';
import fs from 'fs';
import path from 'path';
import os from 'os';

const program = new Command();

program
  .name('psp')
  .description('Persistent Sessions Protocol CLI')
  .version('0.1.0');

// Session management commands
program
  .command('create')
  .description('Create a new PSP session')
  .option('-n, --name <name>', 'Session name')
  .option('-d, --description <description>', 'Session description')
  .option('-a, --adapter <adapter>', 'Adapter to use (playwright, browserless, browser-use, skyvern, stagehand)', 'playwright')
  .option('--headless', 'Run in headless mode')
  .option('--config <config>', 'JSON config for adapter')
  .action(async (options) => {
    try {
      const adapter = createAdapter(options.adapter, options);
      await adapter.initialize();
      
      const metadata = {
        id: crypto.randomUUID(),
        name: options.name || `PSP Session ${new Date().toISOString()}`,
        description: options.description || 'CLI created session',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        adapter: options.adapter
      };
      
      const sessionId = await adapter.createSession(metadata);
      
      // Save session metadata
      const sessionDir = path.join(os.homedir(), '.psp', 'sessions');
      fs.mkdirSync(sessionDir, { recursive: true });
      
      const sessionFile = path.join(sessionDir, `${sessionId}.json`);
      fs.writeFileSync(sessionFile, JSON.stringify({
        metadata,
        adapter: options.adapter,
        config: options.config ? JSON.parse(options.config) : {}
      }, null, 2));
      
      console.log('✅ Session created successfully');
      console.log(`📋 Session ID: ${sessionId}`);
      console.log(`🔧 Adapter: ${options.adapter}`);
      
      await adapter.cleanup();
    } catch (error) {
      console.error('❌ Failed to create session:', error.message);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List all PSP sessions')
  .option('-a, --adapter <adapter>', 'Filter by adapter')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const sessionDir = path.join(os.homedir(), '.psp', 'sessions');
      
      if (!fs.existsSync(sessionDir)) {
        console.log('No sessions found');
        return;
      }
      
      const files = fs.readdirSync(sessionDir).filter(f => f.endsWith('.json'));
      const sessions = [];
      
      for (const file of files) {
        try {
          const sessionData = JSON.parse(fs.readFileSync(path.join(sessionDir, file), 'utf8'));
          
          if (!options.adapter || sessionData.adapter === options.adapter) {
            sessions.push({
              id: sessionData.metadata.id,
              name: sessionData.metadata.name,
              adapter: sessionData.adapter,
              created: new Date(sessionData.metadata.createdAt).toLocaleString(),
              description: sessionData.metadata.description
            });
          }
        } catch (error) {
          console.warn(`Failed to load session from ${file}`);
        }
      }
      
      if (options.json) {
        console.log(JSON.stringify(sessions, null, 2));
      } else {
        console.log('📋 PSP Sessions:');
        sessions.forEach(session => {
          console.log(`   ${session.id}`);
          console.log(`     Name: ${session.name}`);
          console.log(`     Adapter: ${session.adapter}`);
          console.log(`     Created: ${session.created}`);
          console.log(`     Description: ${session.description}`);
          console.log('');
        });
      }
    } catch (error) {
      console.error('❌ Failed to list sessions:', error.message);
      process.exit(1);
    }
  });

program
  .command('capture')
  .description('Capture current session state')
  .argument('<sessionId>', 'Session ID to capture')
  .option('-o, --output <file>', 'Output file for captured data')
  .action(async (sessionId, options) => {
    try {
      const sessionData = loadSession(sessionId);
      const adapter = createAdapter(sessionData.adapter, sessionData.config);
      
      await adapter.initialize();
      await adapter.createSession(sessionData.metadata);
      
      const capturedData = await adapter.captureSession(sessionId);
      
      const outputFile = options.output || `session-${sessionId}-${Date.now()}.json`;
      fs.writeFileSync(outputFile, JSON.stringify(capturedData, null, 2));
      
      console.log('✅ Session captured successfully');
      console.log(`📄 Output file: ${outputFile}`);
      
      await adapter.cleanup();
    } catch (error) {
      console.error('❌ Failed to capture session:', error.message);
      process.exit(1);
    }
  });

program
  .command('restore')
  .description('Restore session from captured data')
  .argument('<dataFile>', 'Captured session data file')
  .option('-a, --adapter <adapter>', 'Adapter to use for restoration')
  .action(async (dataFile, options) => {
    try {
      const sessionData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      const adapter = createAdapter(options.adapter || sessionData.browserType, {});
      
      await adapter.initialize();
      await adapter.restoreSession(sessionData);
      
      console.log('✅ Session restored successfully');
      console.log('🚀 Browser is ready with restored state');
      
      // Keep browser open
      console.log('Press Ctrl+C to close browser');
      process.on('SIGINT', async () => {
        await adapter.cleanup();
        process.exit(0);
      });
      
      // Keep process alive
      await new Promise(() => {});
    } catch (error) {
      console.error('❌ Failed to restore session:', error.message);
      process.exit(1);
    }
  });

program
  .command('launch')
  .description('Launch a session')
  .argument('<sessionId>', 'Session ID to launch')
  .option('--headless', 'Run in headless mode')
  .option('--url <url>', 'URL to navigate to')
  .action(async (sessionId, options) => {
    try {
      const sessionData = loadSession(sessionId);
      const adapter = createAdapter(sessionData.adapter, {
        ...sessionData.config,
        headless: options.headless
      });
      
      await adapter.initialize();
      await adapter.createSession(sessionData.metadata);
      
      if (options.url) {
        const context = await adapter.getContext();
        const page = await context.newPage();
        await page.goto(options.url);
      }
      
      console.log('✅ Session launched successfully');
      console.log('🚀 Browser is ready');
      
      // Keep browser open
      console.log('Press Ctrl+C to close browser');
      process.on('SIGINT', async () => {
        await adapter.cleanup();
        process.exit(0);
      });
      
      // Keep process alive
      await new Promise(() => {});
    } catch (error) {
      console.error('❌ Failed to launch session:', error.message);
      process.exit(1);
    }
  });

// Workflow commands
program
  .command('workflow')
  .description('Execute a workflow')
  .argument('<workflowFile>', 'Workflow definition file')
  .option('-s, --session <sessionId>', 'Session to use')
  .option('-a, --adapter <adapter>', 'Adapter to use')
  .action(async (workflowFile, options) => {
    try {
      const workflow = JSON.parse(fs.readFileSync(workflowFile, 'utf8'));
      
      let adapter;
      if (options.session) {
        const sessionData = loadSession(options.session);
        adapter = createAdapter(sessionData.adapter, sessionData.config);
        await adapter.initialize();
        await adapter.createSession(sessionData.metadata);
      } else {
        adapter = createAdapter(options.adapter || 'playwright', {});
        await adapter.initialize();
        await adapter.createSession({
          id: crypto.randomUUID(),
          name: 'Workflow Session',
          description: 'Temporary session for workflow execution',
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
      
      console.log('🚀 Executing workflow...');
      
      // Execute workflow steps
      for (const step of workflow.steps || []) {
        console.log(`📋 Executing: ${step.type} - ${step.description || step.instruction}`);
        
        try {
          await executeWorkflowStep(adapter, step);
          console.log('   ✅ Success');
        } catch (error) {
          console.log(`   ❌ Failed: ${error.message}`);
          if (step.required !== false) {
            throw error;
          }
        }
      }
      
      console.log('✅ Workflow completed successfully');
      
      await adapter.cleanup();
    } catch (error) {
      console.error('❌ Workflow execution failed:', error.message);
      process.exit(1);
    }
  });

// Utility commands
program
  .command('cleanup')
  .description('Clean up old sessions')
  .option('--days <days>', 'Remove sessions older than N days', '30')
  .option('--dry-run', 'Show what would be deleted without deleting')
  .action(async (options) => {
    try {
      const sessionDir = path.join(os.homedir(), '.psp', 'sessions');
      const profilesDir = path.join(os.homedir(), '.psp', 'profiles');
      
      if (!fs.existsSync(sessionDir)) {
        console.log('No sessions directory found');
        return;
      }
      
      const cutoffDate = Date.now() - (parseInt(options.days) * 24 * 60 * 60 * 1000);
      const files = fs.readdirSync(sessionDir).filter(f => f.endsWith('.json'));
      
      let deletedCount = 0;
      
      for (const file of files) {
        try {
          const sessionData = JSON.parse(fs.readFileSync(path.join(sessionDir, file), 'utf8'));
          
          if (sessionData.metadata.createdAt < cutoffDate) {
            if (options.dryRun) {
              console.log(`Would delete: ${sessionData.metadata.name} (${sessionData.metadata.id})`);
            } else {
              // Delete session file
              fs.unlinkSync(path.join(sessionDir, file));
              
              // Delete profile directory if exists
              const profileDir = path.join(profilesDir, sessionData.metadata.id);
              if (fs.existsSync(profileDir)) {
                fs.rmSync(profileDir, { recursive: true, force: true });
              }
              
              console.log(`Deleted: ${sessionData.metadata.name} (${sessionData.metadata.id})`);
            }
            deletedCount++;
          }
        } catch (error) {
          console.warn(`Failed to process ${file}:`, error.message);
        }
      }
      
      if (options.dryRun) {
        console.log(`Would delete ${deletedCount} sessions older than ${options.days} days`);
      } else {
        console.log(`Deleted ${deletedCount} sessions older than ${options.days} days`);
      }
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('export')
  .description('Export session data')
  .argument('<sessionId>', 'Session ID to export')
  .option('-f, --format <format>', 'Export format (json, yaml)', 'json')
  .option('-o, --output <file>', 'Output file')
  .action(async (sessionId, options) => {
    try {
      const sessionData = loadSession(sessionId);
      
      let output;
      if (options.format === 'yaml') {
        // Simple YAML output (would need yaml package for full support)
        output = Object.entries(sessionData)
          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
          .join('\n');
      } else {
        output = JSON.stringify(sessionData, null, 2);
      }
      
      if (options.output) {
        fs.writeFileSync(options.output, output);
        console.log(`✅ Session exported to ${options.output}`);
      } else {
        console.log(output);
      }
    } catch (error) {
      console.error('❌ Export failed:', error.message);
      process.exit(1);
    }
  });

// Helper functions
function createAdapter(adapterType: string, config: any) {
  switch (adapterType) {
    case 'playwright':
      return createPlaywrightAdapter(config);
    case 'browserless':
      return createBrowserlessAdapter(config);
    case 'browser-use':
      return createBrowserUseAdapter(config);
    case 'skyvern':
      return createSkyvernAdapter(config);
    case 'stagehand':
      return createStagehandAdapter(config);
    default:
      throw new Error(`Unknown adapter: ${adapterType}`);
  }
}

function loadSession(sessionId: string) {
  const sessionDir = path.join(os.homedir(), '.psp', 'sessions');
  const sessionFile = path.join(sessionDir, `${sessionId}.json`);
  
  if (!fs.existsSync(sessionFile)) {
    throw new Error(`Session ${sessionId} not found`);
  }
  
  return JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
}

async function executeWorkflowStep(adapter: any, step: any) {
  const context = await adapter.getContext();
  const page = context.pages()[0] || await context.newPage();
  
  switch (step.type) {
    case 'navigate':
      await page.goto(step.url);
      break;
      
    case 'click':
      await page.click(step.selector);
      break;
      
    case 'fill':
      await page.fill(step.selector, step.value);
      break;
      
    case 'wait':
      await page.waitForTimeout(step.duration || 1000);
      break;
      
    case 'screenshot':
      const screenshot = await page.screenshot(step.options || {});
      if (step.output) {
        fs.writeFileSync(step.output, screenshot);
      }
      break;
      
    case 'extract':
      const data = await page.evaluate((selector: string) => {
        const elements = document.querySelectorAll(selector);
        return Array.from(elements).map(el => el.textContent);
      }, step.selector);
      
      if (step.output) {
        fs.writeFileSync(step.output, JSON.stringify(data, null, 2));
      }
      break;
      
    // Adapter-specific methods
    case 'stagehand-act':
      if (adapter.act) {
        await adapter.act(step.instruction, step.options);
      }
      break;
      
    case 'stagehand-extract':
      if (adapter.extract) {
        const result = await adapter.extract(step.instruction, step.options);
        if (step.output) {
          fs.writeFileSync(step.output, JSON.stringify(result, null, 2));
        }
      }
      break;
      
    default:
      throw new Error(`Unknown workflow step type: ${step.type}`);
  }
}

// Add crypto polyfill for UUID generation
const crypto = {
  randomUUID: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};

program.parse();

export default program;