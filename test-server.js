#!/usr/bin/env node

const { Server } = require('./dist/server/src/server.js');

async function startTestServer() {
  console.log('🚀 Starting PSP Test Server...');
  
  const server = new Server({
    port: 3000,
    host: 'localhost',
    storageType: 'local',
    authEnabled: false,
  });

  try {
    await server.start();
    console.log('✅ Server started successfully!');
    console.log('📊 Available endpoints:');
    console.log('   GET    /sessions          - List all sessions');
    console.log('   POST   /sessions          - Create new session');
    console.log('   GET    /sessions/:id      - Get session details');
    console.log('   POST   /sessions/:id/join - Join a session');
    console.log('   GET    /sessions/:id/participants - Get participants');
    console.log('   POST   /sessions/:id/messages - Send message');
    console.log('   GET    /sessions/:id/messages - Get messages');
    console.log('   POST   /sessions/:id/terminate - Terminate session');
    console.log('   GET    /sessions/:id/export - Export session data');
    console.log('');
    console.log('🔗 WebSocket: ws://localhost:3000');
    console.log('');
    console.log('Press Ctrl+C to stop the server');
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server...');
  process.exit(0);
});

if (require.main === module) {
  startTestServer();
}

module.exports = { startTestServer };