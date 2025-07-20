// Global test setup
jest.setTimeout(30000);

// Mock file system for local storage provider tests
const fs = require('fs');
const path = require('path');

// Create a temporary directory for tests
const testDir = path.join(__dirname, 'test-data');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

// Cleanup after all tests
afterAll(() => {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
});