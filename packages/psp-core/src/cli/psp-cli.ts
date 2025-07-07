#!/usr/bin/env node

/**
 * PSP Command Line Interface
 * 
 * Provides a comprehensive CLI for PSP operations including
 * session capture, restoration, synchronization, and management.
 */

import { PSPClient } from '../client/PSPClient';
import { PSPConfig } from '../config/PSPConfig';

class PSPCli {
  private client: PSPClient;

  constructor() {
    try {
      this.client = new PSPClient();
    } catch (error) {
      console.error('❌ Failed to initialize PSP:', error.message);
      process.exit(1);
    }
  }

  async run(): Promise<void> {
    const args = process.argv.slice(2);
    const command = args[0];

    try {
      switch (command) {
        case 'capture':
          await this.captureCommand(args.slice(1));
          break;
        case 'list':
          await this.listCommand(args.slice(1));
          break;
        case 'launch':
          await this.launchCommand(args.slice(1));
          break;
        case 'sync':
          await this.syncCommand(args.slice(1));
          break;
        case 'delete':
          await this.deleteCommand(args.slice(1));
          break;
        case 'clone':
          await this.cloneCommand(args.slice(1));
          break;
        case 'config':
          await this.configCommand(args.slice(1));
          break;
        case 'test':
          await this.testCommand(args.slice(1));
          break;
        case 'help':
        case '--help':
        case '-h':
          this.showHelp();
          break;
        default:
          console.error(`❌ Unknown command: ${command}`);
          this.showHelp();
          process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Command failed: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Capture a new session
   */
  private async captureCommand(args: string[]): Promise<void> {
    const sessionName = args[0];
    if (!sessionName) {
      console.error('❌ Session name is required');
      console.log('Usage: psp capture <session-name> [options]');
      return;
    }

    const options = this.parseOptions(args.slice(1));
    
    console.log(`🚀 Capturing Chrome session: ${sessionName}`);
    
    const session = await this.client.captureSession({
      sessionName,
      description: options.description,
      excludeExtensions: options.excludeExtensions,
      excludedExtensionIds: options.excludedExtensions?.split(','),
      includeDomains: options.includeDomains?.split(','),
      maxSize: options.maxSize ? parseInt(options.maxSize) : undefined
    });

    console.log(`✅ Session captured successfully!`);
    console.log(`🆔 Session ID: ${session.metadata.id}`);
    console.log(`📊 Size: ${this.formatBytes(session.getSize())}`);
    console.log(`📁 Location: ${session.profilePath}`);
  }

  /**
   * List all sessions
   */
  private async listCommand(args: string[]): Promise<void> {
    const options = this.parseOptions(args);
    
    console.log('📋 PSP Sessions:\n');
    
    const sessions = await this.client.listSessions();
    
    if (sessions.length === 0) {
      console.log('   No sessions found');
      return;
    }

    sessions.forEach((session, index) => {
      const info = session.getInfo();
      console.log(`${index + 1}. ${info.name}`);
      console.log(`   🆔 ID: ${info.id}`);
      console.log(`   📊 Size: ${info.size}`);
      console.log(`   📅 Created: ${info.created}`);
      console.log(`   🔄 Updated: ${info.updated}`);
      console.log(`   🖥️  Platform: ${info.platform}`);
      
      const status = [];
      if (info.compressed) status.push('Compressed');
      if (info.encrypted) status.push('Encrypted');
      if (status.length > 0) {
        console.log(`   🏷️  Status: ${status.join(', ')}`);
      }
      
      console.log('');
    });

    console.log(`📊 Total: ${sessions.length} sessions`);
  }

  /**
   * Launch browser with session
   */
  private async launchCommand(args: string[]): Promise<void> {
    const sessionId = args[0];
    if (!sessionId) {
      console.error('❌ Session ID is required');
      console.log('Usage: psp launch <session-id> [options]');
      return;
    }

    const options = this.parseOptions(args.slice(1));
    
    console.log(`🚀 Launching browser with session: ${sessionId}`);
    
    const context = await this.client.launchWithSession(sessionId, {
      headless: options.headless === 'true',
      viewport: options.viewport ? this.parseViewport(options.viewport) : undefined
    });

    console.log('✅ Browser launched successfully!');
    console.log('💡 Close the browser window when done, or press Ctrl+C to exit');
    
    // Keep process alive until user closes browser
    process.on('SIGINT', async () => {
      console.log('\n🔒 Closing browser...');
      await context.close();
      process.exit(0);
    });
    
    // Wait indefinitely
    await new Promise(() => {});
  }

  /**
   * Synchronize sessions
   */
  private async syncCommand(args: string[]): Promise<void> {
    const config = this.client.getConfig();
    
    if (config.storage.backend === 'local') {
      console.error('❌ Sync is not available for local storage backend');
      return;
    }

    console.log('🔄 Synchronizing sessions...');
    
    const results = await this.client.syncSessions();
    
    console.log(`\n📊 Sync Results:`);
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const conflicts = results.filter(r => r.action === 'conflict');
    
    console.log(`   ✅ Successful: ${successful.length}`);
    console.log(`   ❌ Failed: ${failed.length}`);
    console.log(`   ⚠️  Conflicts: ${conflicts.length}`);
    
    if (failed.length > 0) {
      console.log('\n❌ Failed Operations:');
      failed.forEach(result => {
        console.log(`   • ${result.sessionId}: ${result.message}`);
      });
    }
    
    if (conflicts.length > 0) {
      console.log('\n⚠️  Conflicts Detected:');
      conflicts.forEach(result => {
        console.log(`   • ${result.sessionId}: ${result.message}`);
        if (result.conflictData) {
          console.log(`     Local: ${new Date(result.conflictData.local.updatedAt).toLocaleString()}`);
          console.log(`     Remote: ${new Date(result.conflictData.remote.updatedAt).toLocaleString()}`);
        }
      });
    }
  }

  /**
   * Delete a session
   */
  private async deleteCommand(args: string[]): Promise<void> {
    const sessionId = args[0];
    if (!sessionId) {
      console.error('❌ Session ID is required');
      console.log('Usage: psp delete <session-id> [--remote]');
      return;
    }

    const options = this.parseOptions(args.slice(1));
    const deleteRemote = options.remote === 'true';
    
    console.log(`🗑️  Deleting session: ${sessionId}`);
    
    await this.client.deleteSession(sessionId, deleteRemote);
    
    console.log('✅ Session deleted successfully!');
  }

  /**
   * Clone a session
   */
  private async cloneCommand(args: string[]): Promise<void> {
    const sessionId = args[0];
    const newName = args[1];
    
    if (!sessionId || !newName) {
      console.error('❌ Session ID and new name are required');
      console.log('Usage: psp clone <session-id> <new-name>');
      return;
    }
    
    console.log(`📋 Cloning session: ${sessionId} → ${newName}`);
    
    const clonedSession = await this.client.cloneSession(sessionId, newName);
    
    console.log('✅ Session cloned successfully!');
    console.log(`🆔 New Session ID: ${clonedSession.metadata.id}`);
  }

  /**
   * Configuration management
   */
  private async configCommand(args: string[]): Promise<void> {
    const subCommand = args[0];
    
    switch (subCommand) {
      case 'show':
        this.showConfig();
        break;
      case 'test':
        await this.testConfig();
        break;
      case 'init':
        this.initConfig();
        break;
      default:
        console.log('Configuration Commands:');
        console.log('  psp config show    # Show current configuration');
        console.log('  psp config test    # Test storage backend connection');
        console.log('  psp config init    # Create example configuration file');
    }
  }

  /**
   * Test connection
   */
  private async testCommand(args: string[]): Promise<void> {
    console.log('🔍 Testing PSP configuration...');
    
    const result = await this.client.testConnection();
    
    if (result.success) {
      console.log(`✅ ${result.message}`);
    } else {
      console.log(`❌ ${result.message}`);
      process.exit(1);
    }
  }

  /**
   * Show current configuration
   */
  private showConfig(): void {
    const config = this.client.getConfig();
    
    console.log('📋 PSP Configuration:');
    console.log(`   Storage Backend: ${config.storage.backend}`);
    console.log(`   Compression: ${config.compression.enabled ? 'Enabled' : 'Disabled'} (${config.compression.algorithm})`);
    console.log(`   Encryption: ${config.encryption.enabled ? 'Enabled' : 'Disabled'} (${config.encryption.algorithm})`);
    console.log(`   Auto Sync: ${config.sync.autoSync ? 'Enabled' : 'Disabled'}`);
    
    if (config.storage.backend === 'cloudflare-r2' && config.storage.cloudflareR2) {
      console.log(`   R2 Endpoint: ${config.storage.cloudflareR2.endpoint}`);
      console.log(`   R2 Bucket: ${config.storage.cloudflareR2.bucket}`);
    }
  }

  /**
   * Test configuration
   */
  private async testConfig(): Promise<void> {
    const validation = PSPConfig.validateConfig();
    
    if (!validation.valid) {
      console.log('❌ Configuration is invalid:');
      validation.errors.forEach(error => {
        console.log(`   • ${error}`);
      });
      return;
    }
    
    console.log('✅ Configuration is valid');
    
    const connectionTest = await this.client.testConnection();
    if (connectionTest.success) {
      console.log(`✅ ${connectionTest.message}`);
    } else {
      console.log(`❌ ${connectionTest.message}`);
    }
  }

  /**
   * Initialize configuration
   */
  private initConfig(): void {
    PSPConfig.createExampleConfig();
  }

  /**
   * Parse command line options
   */
  private parseOptions(args: string[]): Record<string, string> {
    const options: Record<string, string> = {};
    
    for (let i = 0; i < args.length; i += 2) {
      const key = args[i]?.replace(/^--/, '');
      const value = args[i + 1];
      
      if (key && value) {
        options[key] = value;
      }
    }
    
    return options;
  }

  /**
   * Parse viewport string
   */
  private parseViewport(viewport: string): { width: number; height: number } {
    const [width, height] = viewport.split('x').map(Number);
    return { width, height };
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Show help information
   */
  private showHelp(): void {
    console.log(`
🔄 PSP - PersistentSessionsProtocol CLI

USAGE:
  psp <command> [options]

COMMANDS:
  capture <name>           Capture current Chrome session
  list                     List all sessions
  launch <session-id>      Launch browser with session
  sync                     Synchronize sessions with cloud storage
  delete <session-id>      Delete a session
  clone <id> <new-name>    Clone a session
  config <sub-command>     Configuration management
  test                     Test PSP configuration
  help                     Show this help message

CAPTURE OPTIONS:
  --description <text>     Session description
  --exclude-extensions     Exclude browser extensions
  --excluded-extensions    Comma-separated extension IDs to exclude
  --include-domains        Comma-separated domains to include
  --max-size <bytes>       Maximum profile size

LAUNCH OPTIONS:
  --headless <true|false>  Launch in headless mode
  --viewport <WxH>         Browser viewport size (e.g., 1920x1080)

DELETE OPTIONS:
  --remote                 Also delete from remote storage

EXAMPLES:
  psp capture "Work Session"
  psp capture "Gmail Session" --description "Authenticated Gmail session"
  psp list
  psp launch a1b2c3d4-e5f6-7890-abcd-ef1234567890
  psp sync
  psp delete a1b2c3d4-e5f6-7890-abcd-ef1234567890 --remote
  psp clone a1b2c3d4-e5f6-7890-abcd-ef1234567890 "Backup Session"
  psp config show
  psp test

CONFIGURATION:
  Set environment variables or create psp.config.json
  Run 'psp config init' to create example configuration

For more information, visit: https://github.com/psp/psp-core
`);
  }
}

// Run CLI if called directly
if (require.main === module) {
  const cli = new PSPCli();
  cli.run().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

export { PSPCli };
