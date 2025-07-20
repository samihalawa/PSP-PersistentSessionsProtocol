/**
 * Example demonstrating PSP Server functionality
 */

import { Server } from '../packages/server/src';

async function main() {
  console.log('🚀 PSP Server Example');
  console.log('=====================');

  try {
    // Create server
    console.log('\n1. Creating PSP server...');
    const server = new Server({
      port: 3333,
      host: 'localhost',
      storageType: 'local',
      authEnabled: false
    });

    console.log('✅ Server instance created');

    // Initialize server
    console.log('\n2. Initializing server...');
    await server.initialize();
    console.log('✅ Server initialized');

    // Start server
    console.log('\n3. Starting server...');
    await server.start();
    console.log('✅ Server started on http://localhost:3333');

    console.log('\n📊 Server Status:');
    console.log(`   - Port: 3333`);
    console.log(`   - Storage: local`);
    console.log(`   - Auth: disabled`);
    console.log(`   - WebSocket: enabled`);

    console.log('\n🌐 Available endpoints:');
    console.log('   - GET  /sessions       - List sessions');
    console.log('   - POST /sessions       - Create session');
    console.log('   - GET  /sessions/{id}  - Get session');
    console.log('   - PUT  /sessions/{id}  - Update session');
    console.log('   - DELETE /sessions/{id} - Delete session');

    console.log('\n💡 You can now test the server with:');
    console.log('   curl http://localhost:3333/sessions');

    // Keep server running for a bit
    console.log('\n⏳ Server will run for 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Stop server
    console.log('\n4. Stopping server...');
    await server.stop();
    console.log('✅ Server stopped');

    console.log('\n🎉 PSP Server example completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  main();
}

export { main };