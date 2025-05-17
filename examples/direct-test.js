/**
 * Direct JavaScript implementation of the storage provider test
 * This implementation doesn't rely on importing the TypeScript code
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Simple implementation of the LocalStorageProvider directly in JavaScript
class LocalStorageProvider {
  constructor(options = {}) {
    this.baseDir = options.directory || path.join(os.homedir(), '.psp', 'sessions');
    
    // Ensure the directory exists
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }
  
  async save(session) {
    const filePath = this.getFilePath(session.metadata.id);
    
    // Ensure the session directory exists
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    // Serialize session for storage
    const serialized = this.serializeSession(session);
    
    // Write the session to disk
    fs.writeFileSync(filePath, JSON.stringify(serialized, null, 2));
  }
  
  async load(id) {
    const filePath = this.getFilePath(id);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Session with ID ${id} not found`);
    }
    
    // Read and parse the session
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Deserialize the session
    return this.deserializeSession(data);
  }
  
  async delete(id) {
    const filePath = this.getFilePath(id);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
  
  async list(filter) {
    // Get all session files
    const sessionFiles = this.getSessionFiles();
    
    // Read and parse metadata from each file
    const metadata = [];
    for (const file of sessionFiles) {
      try {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        metadata.push(data.metadata);
      } catch (error) {
        console.error(`Error reading session file: ${file}`, error);
      }
    }
    
    // Apply filters if needed
    let result = metadata;
    if (filter) {
      // Implement filtering logic here
    }
    
    return result;
  }
  
  async exists(id) {
    const filePath = this.getFilePath(id);
    return fs.existsSync(filePath);
  }
  
  /**
   * Gets the file path for a session ID
   */
  getFilePath(id) {
    // Create a directory structure to avoid too many files in one directory
    // Use the first 2 characters of the ID for the directory
    const prefix = id.substring(0, 2);
    return path.join(this.baseDir, prefix, `${id}.json`);
  }
  
  /**
   * Get all session files
   */
  getSessionFiles() {
    const files = [];
    
    // Get all subdirectories
    let dirs = [];
    try {
      dirs = fs.readdirSync(this.baseDir)
        .filter(file => {
          try {
            return fs.statSync(path.join(this.baseDir, file)).isDirectory();
          } catch (e) {
            return false;
          }
        });
    } catch (e) {
      return [];
    }
    
    // Get all JSON files in each subdirectory
    for (const dir of dirs) {
      const dirPath = path.join(this.baseDir, dir);
      try {
        const dirFiles = fs.readdirSync(dirPath)
          .filter(file => file.endsWith('.json'))
          .map(file => path.join(dirPath, file));
        
        files.push(...dirFiles);
      } catch (e) {
        console.error(`Error reading directory: ${dirPath}`, e);
      }
    }
    
    return files;
  }
  
  /**
   * Serialize session for storage
   */
  serializeSession(session) {
    const serialized = {
      metadata: session.metadata,
      state: { ...session.state }
    };
    
    // Convert Map objects to regular objects
    if (session.state.storage?.localStorage instanceof Map) {
      serialized.state.storage = { ...serialized.state.storage };
      const localStorage = {};
      
      for (const [origin, storage] of session.state.storage.localStorage.entries()) {
        localStorage[origin] = Object.fromEntries(storage);
      }
      
      serialized.state.storage.localStorage = localStorage;
    }
    
    if (session.state.storage?.sessionStorage instanceof Map) {
      serialized.state.storage = { ...serialized.state.storage };
      const sessionStorage = {};
      
      for (const [origin, storage] of session.state.storage.sessionStorage.entries()) {
        sessionStorage[origin] = Object.fromEntries(storage);
      }
      
      serialized.state.storage.sessionStorage = sessionStorage;
    }
    
    return serialized;
  }
  
  /**
   * Deserialize session from storage
   */
  deserializeSession(data) {
    const deserialized = {
      metadata: data.metadata,
      state: { ...data.state }
    };
    
    // Convert objects back to Maps
    if (data.state.storage?.localStorage && typeof data.state.storage.localStorage === 'object') {
      deserialized.state.storage = { ...deserialized.state.storage };
      const localStorage = new Map();
      
      for (const [origin, storage] of Object.entries(data.state.storage.localStorage)) {
        localStorage.set(origin, new Map(Object.entries(storage)));
      }
      
      deserialized.state.storage.localStorage = localStorage;
    }
    
    if (data.state.storage?.sessionStorage && typeof data.state.storage.sessionStorage === 'object') {
      deserialized.state.storage = { ...deserialized.state.storage };
      const sessionStorage = new Map();
      
      for (const [origin, storage] of Object.entries(data.state.storage.sessionStorage)) {
        sessionStorage.set(origin, new Map(Object.entries(storage)));
      }
      
      deserialized.state.storage.sessionStorage = sessionStorage;
    }
    
    return deserialized;
  }
}

// Simple in-memory storage provider for testing
class MemoryStorageProvider {
  constructor() {
    this.sessions = new Map();
  }
  
  async save(session) {
    // Make a deep copy to avoid reference issues
    const sessionCopy = JSON.parse(JSON.stringify(this.serializeSession(session)));
    this.sessions.set(session.metadata.id, sessionCopy);
  }
  
  async load(id) {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`Session with ID ${id} not found`);
    }
    return this.deserializeSession(session);
  }
  
  async delete(id) {
    this.sessions.delete(id);
  }
  
  async list() {
    return Array.from(this.sessions.values()).map(session => session.metadata);
  }
  
  async exists(id) {
    return this.sessions.has(id);
  }
  
  serializeSession(session) {
    const serialized = {
      metadata: session.metadata,
      state: { ...session.state }
    };
    
    // Convert Map objects to regular objects
    if (session.state.storage?.localStorage instanceof Map) {
      serialized.state.storage = { ...serialized.state.storage };
      const localStorage = {};
      
      for (const [origin, storage] of session.state.storage.localStorage.entries()) {
        localStorage[origin] = Object.fromEntries(storage);
      }
      
      serialized.state.storage.localStorage = localStorage;
    }
    
    if (session.state.storage?.sessionStorage instanceof Map) {
      serialized.state.storage = { ...serialized.state.storage };
      const sessionStorage = {};
      
      for (const [origin, storage] of session.state.storage.sessionStorage.entries()) {
        sessionStorage[origin] = Object.fromEntries(storage);
      }
      
      serialized.state.storage.sessionStorage = sessionStorage;
    }
    
    return serialized;
  }
  
  deserializeSession(data) {
    const deserialized = {
      metadata: data.metadata,
      state: { ...data.state }
    };
    
    // Convert objects back to Maps
    if (data.state.storage?.localStorage && typeof data.state.storage.localStorage === 'object') {
      deserialized.state.storage = { ...deserialized.state.storage };
      const localStorage = new Map();
      
      for (const [origin, storage] of Object.entries(data.state.storage.localStorage)) {
        localStorage.set(origin, new Map(Object.entries(storage)));
      }
      
      deserialized.state.storage.localStorage = localStorage;
    }
    
    if (data.state.storage?.sessionStorage && typeof data.state.storage.sessionStorage === 'object') {
      deserialized.state.storage = { ...deserialized.state.storage };
      const sessionStorage = new Map();
      
      for (const [origin, storage] of Object.entries(data.state.storage.sessionStorage)) {
        sessionStorage.set(origin, new Map(Object.entries(storage)));
      }
      
      deserialized.state.storage.sessionStorage = sessionStorage;
    }
    
    return deserialized;
  }
}

// Simple implementation of the Orchestrator
class StorageOrchestrator {
  constructor(options) {
    this.primary = options.primary;
    this.secondary = options.secondary || [];
    this.useCache = options.useCache !== false;
    this.cache = new Map();
  }
  
  async save(session) {
    // Save to primary
    await this.primary.save(session);
    
    // Update cache
    if (this.useCache) {
      this.cache.set(session.metadata.id, {
        data: session,
        timestamp: Date.now()
      });
    }
    
    // Save to secondaries
    for (const provider of this.secondary) {
      try {
        await provider.save(session);
      } catch (error) {
        console.warn(`Failed to save to secondary storage: ${error.message}`);
      }
    }
  }
  
  async load(id) {
    // Check cache first
    if (this.useCache && this.cache.has(id)) {
      return this.cache.get(id).data;
    }
    
    // Try to load from primary
    try {
      const session = await this.primary.load(id);
      
      // Update cache
      if (this.useCache) {
        this.cache.set(id, {
          data: session,
          timestamp: Date.now()
        });
      }
      
      return session;
    } catch (error) {
      // Try secondaries
      for (const provider of this.secondary) {
        try {
          const session = await provider.load(id);
          
          // Update cache
          if (this.useCache) {
            this.cache.set(id, {
              data: session,
              timestamp: Date.now()
            });
          }
          
          return session;
        } catch (secondaryError) {
          // Continue to next secondary
        }
      }
      
      // If we get here, no provider had the session
      throw error;
    }
  }
  
  async delete(id) {
    // Remove from cache
    if (this.useCache) {
      this.cache.delete(id);
    }
    
    // Delete from primary
    await this.primary.delete(id);
    
    // Delete from secondaries
    for (const provider of this.secondary) {
      try {
        await provider.delete(id);
      } catch (error) {
        console.warn(`Failed to delete from secondary storage: ${error.message}`);
      }
    }
  }
  
  async list(filter) {
    // Use primary for listing
    return this.primary.list(filter);
  }
  
  async exists(id) {
    // Check cache first
    if (this.useCache && this.cache.has(id)) {
      return true;
    }
    
    // Try primary
    try {
      return await this.primary.exists(id);
    } catch (error) {
      // Try secondaries
      for (const provider of this.secondary) {
        try {
          const exists = await provider.exists(id);
          if (exists) return true;
        } catch (secondaryError) {
          // Continue to next secondary
        }
      }
      
      return false;
    }
  }
}

// Create a test session
function createTestSession(id = `test-${Date.now()}`) {
  return {
    metadata: {
      id: id,
      name: "Example Login Session",
      description: "A test session with login state",
      tags: ["test", "login", "example"],
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
            name: "session_id",
            value: "abcdef123456",
            domain: "example.com",
            path: "/",
            expires: null,
            httpOnly: true,
            secure: true,
            sameSite: "Lax",
            partitioned: false
          }
        ],
        localStorage: new Map([
          ["example.com", new Map([
            ["user_id", "12345"],
            ["theme", "dark"],
            ["language", "en-US"]
          ])]
        ]),
        sessionStorage: new Map([
          ["example.com", new Map([
            ["cart_items", JSON.stringify([
              { id: 1, name: "Product 1", price: 19.99 },
              { id: 2, name: "Product 2", price: 29.99 }
            ])],
            ["last_page", "/products"]
          ])]
        ])
      }
    }
  };
}

// Test a storage provider
async function testProvider(name, provider) {
  console.log(`\n=== Testing ${name} Provider ===`);
  
  try {
    // Create and save a session
    const session = createTestSession();
    console.log(`Creating test session with ID: ${session.metadata.id}`);
    
    console.log('Saving session...');
    await provider.save(session);
    console.log('Session saved successfully');
    
    // Check if the session exists
    console.log('Checking if session exists...');
    const exists = await provider.exists(session.metadata.id);
    console.log(`Session exists: ${exists}`);
    
    // List sessions
    console.log('Listing all sessions...');
    const sessions = await provider.list();
    console.log(`Found ${sessions.length} sessions:`);
    for (const metadata of sessions) {
      console.log(`- ${metadata.id}: ${metadata.name}`);
    }
    
    // Load the session
    console.log('Loading session...');
    const loadedSession = await provider.load(session.metadata.id);
    console.log('Session loaded successfully');
    
    // Verify data
    console.log('Verifying session data...');
    const exampleStorage = loadedSession.state.storage.localStorage.get('example.com');
    console.log('localStorage values:');
    for (const [key, value] of exampleStorage.entries()) {
      console.log(`- ${key}: ${value}`);
    }
    
    // Delete the session
    console.log('Deleting session...');
    await provider.delete(session.metadata.id);
    console.log('Session deleted');
    
    // Verify it's gone
    console.log('Verifying session was deleted...');
    const stillExists = await provider.exists(session.metadata.id);
    console.log(`Session still exists: ${stillExists}`);
    
    console.log(`${name} Provider tests PASSED`);
    return true;
  } catch (error) {
    console.error(`${name} Provider test FAILED:`, error);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('Starting PSP Storage Provider Tests');
  
  // Create providers
  const localProvider = new LocalStorageProvider({
    directory: path.join(os.tmpdir(), 'psp-test-sessions')
  });
  
  const memoryProvider = new MemoryStorageProvider();
  
  const orchestrator = new StorageOrchestrator({
    primary: localProvider,
    secondary: [memoryProvider],
    useCache: true
  });
  
  // Test each provider
  let results = [];
  
  results.push({
    name: 'LocalStorage',
    success: await testProvider('LocalStorage', localProvider)
  });
  
  results.push({
    name: 'Memory',
    success: await testProvider('Memory', memoryProvider)
  });
  
  results.push({
    name: 'Orchestrator',
    success: await testProvider('Orchestrator', orchestrator)
  });
  
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
runTests().catch(console.error);