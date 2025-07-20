#!/usr/bin/env node

/**
 * PSP CLI - Command Line Interface for Persistent Sessions Protocol
 */

const { Session, LocalStorageProvider } = require('../dist/core/src/index.js');
const { Server } = require('../dist/server/src/index.js');

function showHelp() {
  console.log(`
PSP CLI - Persistent Sessions Protocol Command Line Interface

Usage:
  psp-cli <command> [options]

Commands:
  create <name>           Create a new session
  list                    List all sessions
  show <session-id>       Show session details
  delete <session-id>     Delete a session
  server [port]           Start PSP server (default port: 3000)
  help                    Show this help

Examples:
  psp-cli create "My Session"
  psp-cli list
  psp-cli show abc123
  psp-cli delete abc123
  psp-cli server 3333
`);
}

async function createSession(name, description) {
  try {
    const session = await Session.create({
      name: name || 'New Session',
      description: description || 'Created via CLI',
      tags: ['cli'],
      storage: 'local'
    });

    console.log('✅ Session created successfully!');
    console.log(`   ID: ${session.getId()}`);
    console.log(`   Name: ${session.getMetadata().name}`);
    console.log(`   Description: ${session.getMetadata().description}`);
    
    return session.getId();
  } catch (error) {
    console.error('❌ Error creating session:', error.message);
    process.exit(1);
  }
}

async function listSessions() {
  try {
    const storageProvider = new LocalStorageProvider();
    const sessions = await storageProvider.list();

    if (sessions.length === 0) {
      console.log('📝 No sessions found');
      return;
    }

    console.log(`📝 Found ${sessions.length} session(s):`);
    console.log('');
    
    sessions.forEach((session, index) => {
      console.log(`${index + 1}. ${session.name}`);
      console.log(`   ID: ${session.id}`);
      console.log(`   Created: ${new Date(session.createdAt).toLocaleString()}`);
      console.log(`   Updated: ${new Date(session.updatedAt).toLocaleString()}`);
      if (session.description) {
        console.log(`   Description: ${session.description}`);
      }
      if (session.tags && session.tags.length > 0) {
        console.log(`   Tags: ${session.tags.join(', ')}`);
      }
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error listing sessions:', error.message);
    process.exit(1);
  }
}

async function showSession(sessionId) {
  try {
    const storageProvider = new LocalStorageProvider();
    const session = await Session.load(sessionId, storageProvider);
    
    const metadata = session.getMetadata();
    const state = session.getState();

    console.log('📋 Session Details:');
    console.log(`   ID: ${metadata.id}`);
    console.log(`   Name: ${metadata.name}`);
    console.log(`   Description: ${metadata.description || 'No description'}`);
    console.log(`   Created: ${new Date(metadata.createdAt).toLocaleString()}`);
    console.log(`   Updated: ${new Date(metadata.updatedAt).toLocaleString()}`);
    console.log(`   Tags: ${metadata.tags?.join(', ') || 'No tags'}`);
    console.log(`   Origin: ${state.origin || 'No origin'}`);
    console.log(`   Version: ${state.version}`);
    console.log(`   Cookies: ${state.storage.cookies.length} cookie(s)`);
    console.log(`   LocalStorage: ${state.storage.localStorage.size} origin(s)`);
    console.log(`   SessionStorage: ${state.storage.sessionStorage.size} origin(s)`);

  } catch (error) {
    console.error('❌ Error showing session:', error.message);
    process.exit(1);
  }
}

async function deleteSession(sessionId) {
  try {
    const storageProvider = new LocalStorageProvider();
    const session = await Session.load(sessionId, storageProvider);
    
    const name = session.getMetadata().name;
    await session.delete();
    
    console.log(`✅ Session "${name}" deleted successfully!`);
  } catch (error) {
    console.error('❌ Error deleting session:', error.message);
    process.exit(1);
  }
}

async function startServer(port) {
  try {
    const serverPort = parseInt(port) || 3000;
    
    const server = new Server({
      port: serverPort,
      host: 'localhost',
      storageType: 'local',
      authEnabled: false
    });

    console.log('🚀 Starting PSP Server...');
    await server.initialize();
    await server.start();
    
    console.log(`✅ Server running on http://localhost:${serverPort}`);
    console.log('');
    console.log('Available endpoints:');
    console.log('  GET    /sessions       - List sessions');
    console.log('  POST   /sessions       - Create session');
    console.log('  GET    /sessions/{id}  - Get session');
    console.log('  PUT    /sessions/{id}  - Update session');
    console.log('  DELETE /sessions/{id}  - Delete session');
    console.log('');
    console.log('Press Ctrl+C to stop the server');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\\n🛑 Shutting down server...');
      await server.stop();
      console.log('✅ Server stopped');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error starting server:', error.message);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help') {
    showHelp();
    return;
  }

  switch (command) {
    case 'create':
      await createSession(args[1], args[2]);
      break;
    
    case 'list':
      await listSessions();
      break;
    
    case 'show':
      if (!args[1]) {
        console.error('❌ Session ID required');
        process.exit(1);
      }
      await showSession(args[1]);
      break;
    
    case 'delete':
      if (!args[1]) {
        console.error('❌ Session ID required');
        process.exit(1);
      }
      await deleteSession(args[1]);
      break;
    
    case 'server':
      await startServer(args[1]);
      break;
    
    default:
      console.error(`❌ Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});