const { Session } = require('../packages/core/src');
const { createStorageProvider } = require('../packages/core/src/storage');

// Create an S3 storage provider using the Clever Cloud Cellar credentials
const storageProvider = createStorageProvider({
  type: 's3',
  region: 'US',
  bucket: 'your-bucket-name', // Replace with your actual bucket name
  
  // Clever Cloud Cellar specific settings
  endpoint: 'https://cellar-c2.services.clever-cloud.com',
  forcePathStyle: true,
  
  // Credentials
  accessKeyId: 'OC3IA22850XH6R7N30VM',
  secretAccessKey: '9c0Ufn2m2U91ZpAG2zhwYEBY6g8ViyZk82Ac7XGb'
});

// Helper for creating a unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Test function to save a session
async function testSaveSession() {
  console.log('Testing S3 storage provider...');
  
  // Create a mock session with test data
  const sessionId = generateId();
  const session = {
    metadata: {
      id: sessionId,
      name: "Test S3 Session",
      description: "A test session for S3 storage",
      tags: ["test", "s3", "clever-cloud"],
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
  
  try {
    console.log(`Saving test session with ID: ${sessionId}`);
    await storageProvider.save(session);
    console.log('Session saved successfully!');
    return sessionId;
  } catch (error) {
    console.error('Error saving session:', error);
    throw error;
  }
}

// Test function to load a session
async function testLoadSession(id) {
  try {
    console.log(`Loading session with ID: ${id}`);
    const loadedSession = await storageProvider.load(id);
    console.log('Session loaded successfully!');
    console.log('Session metadata:', loadedSession.metadata);
    console.log('Session state summary:');
    console.log('- Origin:', loadedSession.state.origin);
    console.log('- Cookies:', loadedSession.state.storage.cookies.length);
    console.log('- localStorage origins:', loadedSession.state.storage.localStorage.size);
    console.log('- sessionStorage origins:', loadedSession.state.storage.sessionStorage.size);
    return loadedSession;
  } catch (error) {
    console.error('Error loading session:', error);
    throw error;
  }
}

// Test function to list sessions
async function testListSessions() {
  try {
    console.log('Listing all sessions:');
    const sessions = await storageProvider.list();
    console.log(`Found ${sessions.length} sessions`);
    sessions.forEach(metadata => {
      console.log(`- ${metadata.id}: ${metadata.name} (${metadata.createdAt})`);
    });
    return sessions;
  } catch (error) {
    console.error('Error listing sessions:', error);
    throw error;
  }
}

// Test function to delete a session
async function testDeleteSession(id) {
  try {
    console.log(`Deleting session with ID: ${id}`);
    await storageProvider.delete(id);
    console.log('Session deleted successfully!');
  } catch (error) {
    console.error('Error deleting session:', error);
    throw error;
  }
}

// Main test function
async function runTests() {
  console.log('Starting S3 storage provider tests...');
  
  try {
    // List existing sessions first
    await testListSessions();
    
    // Create and save a new session
    const sessionId = await testSaveSession();
    
    // Verify the session exists
    const exists = await storageProvider.exists(sessionId);
    console.log(`Session ${sessionId} exists: ${exists}`);
    
    // List sessions again to see the new one
    await testListSessions();
    
    // Load the session
    const loadedSession = await testLoadSession(sessionId);
    
    // Test session data
    console.log('Verifying session data:');
    const localStorage = loadedSession.state.storage.localStorage.get('example.com');
    if (localStorage) {
      console.log(`localStorage 'testKey' value: ${localStorage.get('testKey')}`);
    }
    
    // Delete the session
    await testDeleteSession(sessionId);
    
    // Verify it's gone
    const stillExists = await storageProvider.exists(sessionId);
    console.log(`Session ${sessionId} still exists: ${stillExists}`);
    
    // List sessions one more time
    await testListSessions();
    
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the tests
console.log('=== S3 Storage Provider Test ===');
runTests().catch(console.error);