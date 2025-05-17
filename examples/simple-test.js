/**
 * Simplified test script for PSP Storage Provider
 */

// Import directly from source file to avoid build requirements
const { LocalStorageProvider } = require('../packages/core/src/storage/local.js');
const { StorageOrchestrator } = require('../packages/core/src/storage/orchestrator.js');

// Main test function
async function runTest() {
  console.log('Testing PSP storage providers...');
  
  try {
    // Create a local storage provider
    const localProvider = new LocalStorageProvider({
      directory: './.psp-test-sessions'
    });
    
    // Create a storage orchestrator that uses the local provider
    const orchestrator = new StorageOrchestrator({
      primary: localProvider,
      useCache: true
    });
    
    // Use the orchestrator for all operations
    const provider = orchestrator;
    
    // Create a simple test session
    const sessionId = `test-${Date.now()}`;
    const testSession = {
      metadata: {
        id: sessionId,
        name: "Test Session",
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      state: {
        version: "1.0.0",
        origin: "https://example.com",
        storage: {
          cookies: [],
          localStorage: new Map(),
          sessionStorage: new Map()
        }
      }
    };
    
    // Add some localStorage data
    const exampleStorage = new Map();
    exampleStorage.set('key1', 'value1');
    exampleStorage.set('key2', 'value2');
    testSession.state.storage.localStorage.set('example.com', exampleStorage);
    
    // Save the session
    console.log(`Saving session ${sessionId}...`);
    await provider.save(testSession);
    console.log('Session saved successfully');
    
    // Check if session exists
    const exists = await provider.exists(sessionId);
    console.log(`Session exists: ${exists}`);
    
    // Load the session
    console.log('Loading session...');
    const loadedSession = await provider.load(sessionId);
    console.log('Session loaded successfully');
    
    // Verify the data
    const exampleData = loadedSession.state.storage.localStorage.get('example.com');
    console.log('Loaded localStorage data:');
    for (const [key, value] of exampleData.entries()) {
      console.log(`- ${key}: ${value}`);
    }
    
    // List all sessions
    const sessions = await provider.list();
    console.log(`Found ${sessions.length} sessions:`);
    for (const s of sessions) {
      console.log(`- ${s.id}: ${s.name}`);
    }
    
    // Delete the session
    console.log('Deleting session...');
    await provider.delete(sessionId);
    console.log('Session deleted');
    
    // Verify it's gone
    const stillExists = await provider.exists(sessionId);
    console.log(`Session still exists: ${stillExists}`);
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
runTest().catch(console.error);