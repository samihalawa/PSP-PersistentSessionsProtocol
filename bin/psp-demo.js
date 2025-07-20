#!/usr/bin/env node

/**
 * PSP Demo - Simple demonstration of PSP core functionality
 */

// Use relative paths to the built files
const { Session, LocalStorageProvider } = require('../dist/core/src/index.js');

async function runDemo() {
  console.log('🚀 PSP Demo - Persistent Sessions Protocol');
  console.log('==========================================');

  try {
    // Create a session
    console.log('\n1. Creating a session...');
    const session = await Session.create({
      name: 'Demo Session',
      description: 'A demonstration of PSP functionality',
      tags: ['demo', 'test'],
      storage: 'local'
    });

    console.log('✅ Session created!');
    console.log(`   ID: ${session.getId()}`);
    console.log(`   Name: ${session.getMetadata().name}`);

    // Test basic operations
    console.log('\n2. Testing session operations...');
    
    // Update metadata
    await session.updateMetadata({
      description: 'Updated demo session'
    });
    console.log('✅ Metadata updated');

    // Clone session
    const cloned = await session.clone('Cloned Demo');
    console.log(`✅ Session cloned (ID: ${cloned.getId()})`);

    // List sessions via storage provider
    console.log('\n3. Listing sessions...');
    const storageProvider = new LocalStorageProvider();
    const sessions = await storageProvider.list();
    console.log(`✅ Found ${sessions.length} sessions:`);
    
    sessions.forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.name} (${s.id})`);
    });

    // Clean up
    console.log('\n4. Cleaning up...');
    await session.delete();
    await cloned.delete();
    console.log('✅ Sessions deleted');

    console.log('\n🎉 Demo completed successfully!');
    console.log('   PSP is working correctly and ready to use.');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Show information about PSP
function showInfo() {
  console.log('\n📚 About PSP:');
  console.log('   The Persistent Sessions Protocol (PSP) provides a standardized');
  console.log('   approach for browser automation tools to save, share, and restore');
  console.log('   session data across different frameworks and machines.');
  console.log('');
  console.log('🏗️  Architecture:');
  console.log('   • Session Capture Layer - Extracts browser state');
  console.log('   • Serialization Layer - Handles data encoding');
  console.log('   • Storage Layer - Manages persistent storage');
  console.log('   • Replay Layer - Restores sessions');
  console.log('');
  console.log('📦 Components Available:');
  console.log('   • Core Library - Framework-agnostic session management');
  console.log('   • Server - REST/WebSocket API for session management');
  console.log('   • Adapters - Playwright, Selenium, and more');
  console.log('   • Storage Providers - Local, Redis, Database, Cloud');
}

async function main() {
  await runDemo();
  showInfo();
}

if (require.main === module) {
  main();
}

module.exports = { runDemo, showInfo };