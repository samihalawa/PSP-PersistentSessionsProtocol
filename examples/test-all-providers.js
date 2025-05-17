/**
 * Test script for PSP Storage Providers
 * 
 * This script tests all storage providers to ensure they correctly implement
 * the StorageProvider interface.
 */

const { createStorageProvider } = require('../packages/core/src/storage');

// Helper for creating a unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Create a test session
function createTestSession() {
  const sessionId = generateId();
  return {
    metadata: {
      id: sessionId,
      name: "Test Session",
      description: "A test session for storage providers",
      tags: ["test", "automated"],
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    state: {
      version: "1.0.0",
      timestamp: Date.now(),
      origin: "https://example.com",
      storage: {
        cookies: [
          {
            name: "test_cookie",
            value: "test_value",
            domain: "example.com",
            path: "/",
            expires: null,
            httpOnly: false,
            secure: true,
            sameSite: "Lax",
            partitioned: false
          }
        ],
        localStorage: new Map([
          ["example.com", new Map([
            ["testKey", "testValue"],
            ["user", "testUser"]
          ])]
        ]),
        sessionStorage: new Map([
          ["example.com", new Map([
            ["tempData", "someData"]
          ])]
        ])
      }
    }
  };
}

// Test all functionality of a given storage provider
async function testStorageProvider(name, provider) {
  console.log(`\n=== Testing ${name} Storage Provider ===`);
  
  try {
    // List existing sessions
    console.log(`[${name}] Listing existing sessions...`);
    const initialSessions = await provider.list();
    console.log(`[${name}] Found ${initialSessions.length} existing sessions`);
    
    // Create and save a new session
    const session = createTestSession();
    console.log(`[${name}] Saving test session with ID: ${session.metadata.id}`);
    await provider.save(session);
    console.log(`[${name}] Session saved successfully`);
    
    // Check if the session exists
    const exists = await provider.exists(session.metadata.id);
    console.log(`[${name}] Session exists check: ${exists}`);
    if (!exists) {
      throw new Error('Session should exist but provider.exists() returned false');
    }
    
    // List sessions again to see the new one
    const updatedSessions = await provider.list();
    console.log(`[${name}] Now found ${updatedSessions.length} sessions`);
    if (updatedSessions.length !== initialSessions.length + 1) {
      console.warn(`[${name}] Session count didn't increase as expected`);
    }
    
    // Load the session
    console.log(`[${name}] Loading the saved session...`);
    const loadedSession = await provider.load(session.metadata.id);
    console.log(`[${name}] Session loaded successfully`);
    
    // Verify data integrity
    console.log(`[${name}] Verifying data integrity...`);
    const testKey = loadedSession.state.storage.localStorage.get('example.com')?.get('testKey');
    if (testKey !== 'testValue') {
      throw new Error(`Data integrity check failed: Expected 'testValue' but got '${testKey}'`);
    }
    console.log(`[${name}] Data integrity verified`);
    
    // Delete the session
    console.log(`[${name}] Deleting the session...`);
    await provider.delete(session.metadata.id);
    console.log(`[${name}] Session deleted successfully`);
    
    // Verify it's gone
    const stillExists = await provider.exists(session.metadata.id);
    if (stillExists) {
      throw new Error('Session should be deleted but still exists');
    }
    console.log(`[${name}] Verified session was deleted`);
    
    // Final list to confirm count
    const finalSessions = await provider.list();
    if (finalSessions.length !== initialSessions.length) {
      console.warn(`[${name}] Final session count doesn't match initial count`);
    }
    
    console.log(`[${name}] All tests passed successfully!`);
    return true;
  } catch (error) {
    console.error(`[${name}] Test failed:`, error);
    return false;
  }
}

// Main function to test all providers
async function testAllProviders() {
  console.log('Starting storage provider tests...');
  
  const results = [];
  
  // Test LocalStorageProvider
  const localProvider = createStorageProvider({
    type: 'local',
    directory: '~/.psp/tests'
  });
  results.push({
    name: 'Local',
    success: await testStorageProvider('Local', localProvider)
  });
  
  // Test orchestrator with local provider
  const orchestratorProvider = createStorageProvider({
    type: 'orchestrator',
    primary: localProvider,
    useCache: true
  });
  results.push({
    name: 'Orchestrator',
    success: await testStorageProvider('Orchestrator', orchestratorProvider)
  });
  
  // Uncomment to test S3 with the provided credentials
  // NOTE: You need to replace 'your-bucket-name' with your actual bucket name
  /*
  const s3Provider = createStorageProvider({
    type: 's3',
    region: 'US',
    bucket: 'your-bucket-name', // Replace with actual bucket name
    endpoint: 'https://cellar-c2.services.clever-cloud.com',
    forcePathStyle: true,
    accessKeyId: 'OC3IA22850XH6R7N30VM',
    secretAccessKey: '9c0Ufn2m2U91ZpAG2zhwYEBY6g8ViyZk82Ac7XGb'
  });
  results.push({
    name: 'S3',
    success: await testStorageProvider('S3', s3Provider)
  });
  */
  
  // Print summary
  console.log('\n=== Test Summary ===');
  let allPassed = true;
  for (const result of results) {
    console.log(`${result.name}: ${result.success ? 'PASSED' : 'FAILED'}`);
    if (!result.success) allPassed = false;
  }
  
  console.log(`\nOverall Result: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
}

// Run tests
testAllProviders().catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
});