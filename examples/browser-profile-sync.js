/**
 * Browser Profile Sync Tool for PSP
 * 
 * This script demonstrates how to:
 * 1. Detect and read Chrome/Firefox user profiles from the system
 * 2. Extract cookies, localStorage, and other state
 * 3. Save them to PSP storage providers
 * 4. Restore the session in Playwright for continued automation
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const { chromium, firefox } = require('playwright');

// Simple implementation of the storage provider
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
  
  async list() {
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
    
    // Sort by update time (newest first)
    return metadata.sort((a, b) => b.updatedAt - a.updatedAt);
  }
  
  async exists(id) {
    const filePath = this.getFilePath(id);
    return fs.existsSync(filePath);
  }
  
  getFilePath(id) {
    // Create a directory structure to avoid too many files in one directory
    // Use the first 2 characters of the ID for the directory
    const prefix = id.substring(0, 2);
    return path.join(this.baseDir, prefix, `${id}.json`);
  }
  
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

// Helper for generating session IDs
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Find Chrome profiles on the system
function findChromeProfiles() {
  const profiles = [];
  let profilesPath;
  
  switch (process.platform) {
    case 'darwin': // macOS
      profilesPath = path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome');
      break;
    case 'win32': // Windows
      profilesPath = path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data');
      break;
    case 'linux': // Linux
      profilesPath = path.join(os.homedir(), '.config', 'google-chrome');
      break;
    default:
      console.warn(`Unsupported platform: ${process.platform}`);
      return profiles;
  }
  
  // Check if the profiles directory exists
  if (!fs.existsSync(profilesPath)) {
    console.warn(`Chrome profiles directory not found: ${profilesPath}`);
    return profiles;
  }
  
  // Look for profile directories
  const localStatePath = path.join(profilesPath, 'Local State');
  if (fs.existsSync(localStatePath)) {
    try {
      const localState = JSON.parse(fs.readFileSync(localStatePath, 'utf8'));
      
      // Check for profile names in Local State file
      if (localState.profile && localState.profile.info_cache) {
        for (const [profileDir, profileInfo] of Object.entries(localState.profile.info_cache)) {
          if (profileDir === 'Default' || profileDir.startsWith('Profile ')) {
            profiles.push({
              name: profileInfo.name || profileDir,
              dir: profileDir,
              path: path.join(profilesPath, profileDir),
              browser: 'chrome'
            });
          }
        }
      }
    } catch (error) {
      console.error('Error parsing Chrome Local State file:', error);
    }
  }
  
  // If we couldn't read from Local State or no profiles were found, look for directories
  if (profiles.length === 0) {
    try {
      const dirs = fs.readdirSync(profilesPath);
      for (const dir of dirs) {
        const profilePath = path.join(profilesPath, dir);
        if (
          fs.statSync(profilePath).isDirectory() && 
          (dir === 'Default' || dir.startsWith('Profile ')) &&
          fs.existsSync(path.join(profilePath, 'Cookies'))
        ) {
          profiles.push({
            name: dir,
            dir: dir,
            path: profilePath,
            browser: 'chrome'
          });
        }
      }
    } catch (error) {
      console.error('Error reading Chrome profiles directory:', error);
    }
  }
  
  return profiles;
}

// Find Firefox profiles on the system
function findFirefoxProfiles() {
  const profiles = [];
  let profilesIniPath;
  
  switch (process.platform) {
    case 'darwin': // macOS
      profilesIniPath = path.join(os.homedir(), 'Library', 'Application Support', 'Firefox', 'profiles.ini');
      break;
    case 'win32': // Windows
      profilesIniPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Mozilla', 'Firefox', 'profiles.ini');
      break;
    case 'linux': // Linux
      profilesIniPath = path.join(os.homedir(), '.mozilla', 'firefox', 'profiles.ini');
      break;
    default:
      console.warn(`Unsupported platform: ${process.platform}`);
      return profiles;
  }
  
  // Check if profiles.ini exists
  if (!fs.existsSync(profilesIniPath)) {
    console.warn(`Firefox profiles.ini not found: ${profilesIniPath}`);
    return profiles;
  }
  
  // Parse profiles.ini
  try {
    const profilesIni = fs.readFileSync(profilesIniPath, 'utf8');
    const profileSections = profilesIni.split(/\[.*?\]/g).filter(Boolean);
    
    let rootDir = path.dirname(profilesIniPath);
    
    for (const section of profileSections) {
      if (section.includes('Path=')) {
        const lines = section.split('\n').filter(Boolean);
        const profileData = {};
        
        for (const line of lines) {
          const [key, value] = line.trim().split('=');
          if (key && value) {
            profileData[key.trim()] = value.trim();
          }
        }
        
        if (profileData.Path) {
          // Determine if the path is relative or absolute
          let profilePath;
          if (profileData.IsRelative === '1') {
            profilePath = path.join(rootDir, profileData.Path);
          } else {
            profilePath = profileData.Path;
          }
          
          // Check if the profile directory exists
          if (fs.existsSync(profilePath)) {
            profiles.push({
              name: profileData.Name || path.basename(profileData.Path),
              dir: profileData.Path,
              path: profilePath,
              browser: 'firefox',
              default: profileData.Default === '1'
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Error parsing Firefox profiles.ini:', error);
  }
  
  return profiles;
}

// Extract cookies from Chrome profile
async function extractChromeCookies(profilePath, domain = null) {
  // Launch a new Chrome instance using the profile
  const browser = await chromium.launchPersistentContext(profilePath, {
    headless: true,
    ignoreDefaultArgs: ['--enable-automation'],
  });
  
  try {
    // Open a new page
    const page = await browser.newPage();
    
    // Extract cookies for all domains or a specific domain
    let cookies;
    if (domain) {
      // Extract cookies for a specific domain
      // First, navigate to the domain to ensure cookies are accessible
      await page.goto(`https://${domain}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
        .catch(err => console.warn(`Warning: Could not navigate to ${domain}: ${err.message}`));
      
      cookies = await page.context().cookies(`https://${domain}`);
    } else {
      // Extract all cookies
      cookies = await page.context().cookies();
    }
    
    await browser.close();
    return cookies;
  } catch (error) {
    console.error('Error extracting Chrome cookies:', error);
    await browser.close();
    return [];
  }
}

// Extract localStorage from Chrome profile
async function extractChromeLocalStorage(profilePath, domain) {
  if (!domain) {
    console.warn('Domain is required to extract localStorage');
    return new Map();
  }
  
  // Launch a new Chrome instance using the profile
  const browser = await chromium.launchPersistentContext(profilePath, {
    headless: true,
    ignoreDefaultArgs: ['--enable-automation'],
  });
  
  try {
    // Open a new page
    const page = await browser.newPage();
    
    // Navigate to the domain
    await page.goto(`https://${domain}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      .catch(err => console.warn(`Warning: Could not navigate to ${domain}: ${err.message}`));
    
    // Extract localStorage
    const storage = await page.evaluate(() => {
      const result = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        result[key] = localStorage.getItem(key);
      }
      return result;
    });
    
    await browser.close();
    
    // Convert to Map
    const storageMap = new Map();
    const originMap = new Map(Object.entries(storage));
    storageMap.set(`https://${domain}`, originMap);
    
    return storageMap;
  } catch (error) {
    console.error('Error extracting Chrome localStorage:', error);
    await browser.close();
    return new Map();
  }
}

// Extract cookies from Firefox profile
async function extractFirefoxCookies(profilePath, domain = null) {
  try {
    // Launch Firefox with the profile
    const browser = await firefox.launchPersistentContext(profilePath, {
      headless: true,
    });
    
    // Open a new page
    const page = await browser.newPage();
    
    // Extract cookies for all domains or a specific domain
    let cookies;
    if (domain) {
      // Extract cookies for a specific domain
      // First, navigate to the domain to ensure cookies are accessible
      await page.goto(`https://${domain}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
        .catch(err => console.warn(`Warning: Could not navigate to ${domain}: ${err.message}`));
      
      cookies = await page.context().cookies(`https://${domain}`);
    } else {
      // Extract all cookies
      cookies = await page.context().cookies();
    }
    
    await browser.close();
    return cookies;
  } catch (error) {
    console.error('Error extracting Firefox cookies:', error);
    return [];
  }
}

// Create a PSP session from browser profile
async function createSessionFromProfile(profileInfo, domain = null, options = {}) {
  console.log(`Creating session from ${profileInfo.browser} profile: ${profileInfo.name}`);
  
  // Generate a unique ID for the session
  const sessionId = generateId();
  
  // Initialize session object
  const session = {
    metadata: {
      id: sessionId,
      name: options.name || `${domain || 'All Sites'} - ${profileInfo.browser} - ${profileInfo.name}`,
      description: options.description || `Session extracted from ${profileInfo.browser} profile ${profileInfo.name}`,
      tags: [...(options.tags || []), profileInfo.browser, domain || 'all-sites', 'browser-profile'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      source: {
        type: 'browser-profile',
        browser: profileInfo.browser,
        profile: profileInfo.name,
        profilePath: profileInfo.path,
      }
    },
    state: {
      version: "1.0.0",
      timestamp: Date.now(),
      origin: domain ? `https://${domain}` : undefined,
      storage: {
        cookies: [],
        localStorage: new Map(),
        sessionStorage: new Map()
      }
    }
  };
  
  // Extract cookies
  if (profileInfo.browser === 'chrome') {
    session.state.storage.cookies = await extractChromeCookies(profileInfo.path, domain);
    
    if (domain) {
      // Extract localStorage for the specific domain
      session.state.storage.localStorage = await extractChromeLocalStorage(profileInfo.path, domain);
    }
  } else if (profileInfo.browser === 'firefox') {
    session.state.storage.cookies = await extractFirefoxCookies(profileInfo.path, domain);
    
    // For Firefox, localStorage extraction is similar but may require adjustments
    // We'll implement it similarly to Chrome for now
    if (domain) {
      try {
        const browser = await firefox.launchPersistentContext(profileInfo.path, {
          headless: true,
        });
        
        const page = await browser.newPage();
        await page.goto(`https://${domain}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
          .catch(err => console.warn(`Warning: Could not navigate to ${domain}: ${err.message}`));
        
        const storage = await page.evaluate(() => {
          const result = {};
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            result[key] = localStorage.getItem(key);
          }
          return result;
        });
        
        await browser.close();
        
        // Convert to Map
        const storageMap = new Map();
        const originMap = new Map(Object.entries(storage));
        storageMap.set(`https://${domain}`, originMap);
        
        session.state.storage.localStorage = storageMap;
      } catch (error) {
        console.error('Error extracting Firefox localStorage:', error);
      }
    }
  }
  
  console.log(`Extracted ${session.state.storage.cookies.length} cookies and ${session.state.storage.localStorage.size} localStorage origins`);
  
  return session;
}

// Restore a session in Playwright
async function restoreSessionInPlaywright(sessionId, storageProvider, options = {}) {
  console.log(`Restoring session ${sessionId} in Playwright`);
  
  // Load the session
  const session = await storageProvider.load(sessionId);
  
  // Launch browser
  const browserType = options.browser || 'chromium';
  let browser;
  
  if (browserType === 'chromium') {
    browser = await chromium.launch({
      headless: options.headless !== false ? true : false
    });
  } else if (browserType === 'firefox') {
    browser = await firefox.launch({
      headless: options.headless !== false ? true : false
    });
  } else {
    throw new Error(`Unsupported browser type: ${browserType}`);
  }
  
  // Create a new browser context
  const context = await browser.newContext();
  
  // Add cookies
  if (session.state.storage.cookies && session.state.storage.cookies.length > 0) {
    await context.addCookies(session.state.storage.cookies);
    console.log(`Added ${session.state.storage.cookies.length} cookies`);
  }
  
  // Open a new page
  const page = await context.newPage();
  
  // Set localStorage and sessionStorage
  if (session.state.origin) {
    await page.goto(session.state.origin, { waitUntil: 'domcontentloaded' });
    
    // Set localStorage
    if (session.state.storage.localStorage) {
      const originMap = session.state.storage.localStorage.get(session.state.origin);
      if (originMap) {
        await page.evaluate(storageData => {
          for (const [key, value] of Object.entries(storageData)) {
            localStorage.setItem(key, value);
          }
        }, Object.fromEntries(originMap));
        
        console.log(`Set ${originMap.size} localStorage items`);
      }
    }
    
    // Set sessionStorage
    if (session.state.storage.sessionStorage) {
      const originMap = session.state.storage.sessionStorage.get(session.state.origin);
      if (originMap) {
        await page.evaluate(storageData => {
          for (const [key, value] of Object.entries(storageData)) {
            sessionStorage.setItem(key, value);
          }
        }, Object.fromEntries(originMap));
        
        console.log(`Set ${originMap.size} sessionStorage items`);
      }
    }
  }
  
  // If page URL is defined and different from origin, navigate to it
  if (options.url) {
    await page.goto(options.url, { waitUntil: 'domcontentloaded' });
  }
  
  console.log(`Session restored successfully!`);
  
  return { browser, context, page };
}

// CLI helper functions
function printHelp() {
  console.log(`
PSP Browser Profile Sync Tool

Commands:
  list-profiles                     List available browser profiles
  extract [browser] [profile] [domain]   Extract session from browser profile
  list-sessions                     List available sessions
  restore [sessionId]               Restore a session in Playwright
  help                              Show this help message

Examples:
  node browser-profile-sync.js list-profiles
  node browser-profile-sync.js extract chrome Default github.com
  node browser-profile-sync.js extract firefox default twitter.com
  node browser-profile-sync.js list-sessions
  node browser-profile-sync.js restore session-123abc
  `);
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  // Initialize storage provider
  const storageProvider = new LocalStorageProvider();
  
  if (!command || command === 'help') {
    printHelp();
    return;
  }
  
  if (command === 'list-profiles') {
    const chromeProfiles = findChromeProfiles();
    const firefoxProfiles = findFirefoxProfiles();
    
    console.log('\nAvailable Chrome Profiles:');
    if (chromeProfiles.length === 0) {
      console.log('  No Chrome profiles found');
    } else {
      chromeProfiles.forEach(profile => {
        console.log(`  - ${profile.name} (${profile.dir})`);
      });
    }
    
    console.log('\nAvailable Firefox Profiles:');
    if (firefoxProfiles.length === 0) {
      console.log('  No Firefox profiles found');
    } else {
      firefoxProfiles.forEach(profile => {
        const defaultTag = profile.default ? ' [default]' : '';
        console.log(`  - ${profile.name}${defaultTag} (${profile.dir})`);
      });
    }
  } else if (command === 'extract') {
    const browser = args[1];
    const profileDir = args[2];
    const domain = args[3];
    
    if (!browser || !profileDir) {
      console.error('Error: Browser and profile are required');
      console.log('Usage: node browser-profile-sync.js extract [browser] [profile] [domain]');
      return;
    }
    
    // Find matching profile
    let profileInfo;
    if (browser.toLowerCase() === 'chrome') {
      profileInfo = findChromeProfiles().find(p => p.dir === profileDir || p.name === profileDir);
    } else if (browser.toLowerCase() === 'firefox') {
      profileInfo = findFirefoxProfiles().find(p => p.dir === profileDir || p.name === profileDir);
    } else {
      console.error(`Error: Unsupported browser: ${browser}`);
      return;
    }
    
    if (!profileInfo) {
      console.error(`Error: Profile "${profileDir}" not found for browser "${browser}"`);
      return;
    }
    
    // Create session from profile
    const session = await createSessionFromProfile(profileInfo, domain);
    
    // Save session
    await storageProvider.save(session);
    
    console.log(`Session saved with ID: ${session.metadata.id}`);
    console.log(`Use the following command to restore it in Playwright:`);
    console.log(`  node browser-profile-sync.js restore ${session.metadata.id}`);
  } else if (command === 'list-sessions') {
    const sessions = await storageProvider.list();
    
    console.log('\nAvailable Sessions:');
    if (sessions.length === 0) {
      console.log('  No sessions found');
    } else {
      sessions.forEach(metadata => {
        const tags = metadata.tags ? ` [${metadata.tags.join(', ')}]` : '';
        const date = new Date(metadata.createdAt).toLocaleString();
        console.log(`  - ${metadata.name}${tags}`);
        console.log(`    ID: ${metadata.id} (created: ${date})`);
        console.log(`    ${metadata.description || 'No description'}\n`);
      });
    }
  } else if (command === 'restore') {
    const sessionId = args[1];
    const url = args[2]; // Optional URL to navigate to
    
    if (!sessionId) {
      console.error('Error: Session ID is required');
      console.log('Usage: node browser-profile-sync.js restore [sessionId] [url]');
      return;
    }
    
    // Check if session exists
    const exists = await storageProvider.exists(sessionId);
    if (!exists) {
      console.error(`Error: Session "${sessionId}" not found`);
      return;
    }
    
    // Restore session in Playwright
    const { browser, page } = await restoreSessionInPlaywright(sessionId, storageProvider, {
      headless: false,
      url: url
    });
    
    console.log('Browser launched with the restored session.');
    console.log('Press Ctrl+C to close the browser when finished.');
    
    // Keep the browser open until user terminates the script
    await new Promise(() => {});
  } else {
    console.error(`Error: Unknown command: ${command}`);
    printHelp();
  }
}

// Run the main function
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});