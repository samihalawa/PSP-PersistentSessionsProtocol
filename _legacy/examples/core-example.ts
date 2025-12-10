/**
 * Example demonstrating PSP Core functionality
 */

import { Session, LocalStorageProvider } from '../packages/core/src';

async function main() {
  console.log('🚀 PSP Core Example');
  console.log('===================');

  try {
    // Create a new session
    console.log('\n1. Creating a new session...');
    const session = await Session.create({
      name: 'Example Session',
      description: 'A demonstration session showing PSP capabilities',
      tags: ['example', 'demo'],
      storage: 'local'
    });

    console.log(`✅ Session created with ID: ${session.getId()}`);
    console.log(`   Name: ${session.getMetadata().name}`);
    console.log(`   Description: ${session.getMetadata().description}`);
    console.log(`   Tags: ${session.getMetadata().tags?.join(', ')}`);

    // Update session metadata
    console.log('\n2. Updating session metadata...');
    await session.updateMetadata({
      description: 'Updated description - PSP working perfectly!',
      tags: ['example', 'demo', 'updated']
    });

    console.log(`✅ Updated description: ${session.getMetadata().description}`);
    console.log(`   Updated tags: ${session.getMetadata().tags?.join(', ')}`);

    // Clone the session
    console.log('\n3. Cloning the session...');
    const clonedSession = await session.clone('Cloned Example Session');
    
    console.log(`✅ Cloned session created with ID: ${clonedSession.getId()}`);
    console.log(`   Original ID: ${session.getId()}`);
    console.log(`   Cloned ID: ${clonedSession.getId()}`);
    console.log(`   Cloned name: ${clonedSession.getMetadata().name}`);

    // Load session from storage
    console.log('\n4. Loading session from storage...');
    const storageProvider = new LocalStorageProvider();
    const loadedSession = await Session.load(session.getId(), storageProvider);
    
    console.log(`✅ Session loaded successfully`);
    console.log(`   Loaded ID: ${loadedSession.getId()}`);
    console.log(`   Loaded name: ${loadedSession.getMetadata().name}`);
    console.log(`   Loaded description: ${loadedSession.getMetadata().description}`);

    // Clean up - delete sessions
    console.log('\n5. Cleaning up...');
    await session.delete();
    await clonedSession.delete();
    console.log('✅ Sessions deleted successfully');

    console.log('\n🎉 PSP Core example completed successfully!');
    console.log('   The Persistent Sessions Protocol is working correctly.');

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