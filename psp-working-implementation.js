const { chromium } = require('playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');
const { execSync } = require('child_process');

class SimpleSession {
  constructor(metadata, userDataDir) {
    this.metadata = metadata;
    this.userDataDir = userDataDir;
  }

  static async create(options) {
    const id = crypto.randomUUID();
    const userDataDir = options.userDataDir || 
      path.join(os.homedir(), '.psp', 'profiles', id);
    
    // Ensure profile directory exists
    fs.mkdirSync(userDataDir, { recursive: true });
    
    const metadata = {
      id,
      name: options.name,
      description: options.description,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    const session = new SimpleSession(metadata, userDataDir);
    await session.save();
    return session;
  }

  async save() {
    const sessionDir = path.join(os.homedir(), '.psp', 'sessions');
    fs.mkdirSync(sessionDir, { recursive: true });
    
    const sessionFile = path.join(sessionDir, `${this.metadata.id}.json`);
    fs.writeFileSync(sessionFile, JSON.stringify({
      metadata: this.metadata,
      userDataDir: this.userDataDir
    }, null, 2));
  }

  static async load(sessionId) {
    const sessionDir = path.join(os.homedir(), '.psp', 'sessions');
    const sessionFile = path.join(sessionDir, `${sessionId}.json`);
    
    if (!fs.existsSync(sessionFile)) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    const data = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
    return new SimpleSession(data.metadata, data.userDataDir);
  }

  getUserDataDir() {
    return this.userDataDir;
  }
}

async function launchWithPSP(sessionId, options = {}) {
  let session;
  
  if (sessionId) {
    // Load existing session
    session = await SimpleSession.load(sessionId);
    console.log(`Loaded session: ${session.metadata.name}`);
  } else {
    // Create new session
    session = await SimpleSession.create({
      name: options.sessionName || `Session ${new Date().toISOString()}`,
      userDataDir: options.userDataDir
    });
  }
  
  // Launch browser with persistent context
  const context = await chromium.launchPersistentContext(
    session.getUserDataDir(), 
    {
      headless: options.headless ?? false,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security'
      ]
    }
  );
  
  return { context, session };
}

async function demoSessionPersistence() {
  console.log('🚀 Starting Chrome Session Persistence Demo...\n');
  
  // Step 1: Create and populate session
  const { context, session } = await launchWithPSP(undefined, {
    sessionName: 'Gmail Demo Session',
    headless: false
  });
  
  const page = await context.newPage();
  
  // Navigate to Gmail and set test data
  await page.goto('https://gmail.com');
  
  // Set comprehensive session data
  await page.evaluate(() => {
    // localStorage data
    localStorage.setItem('psp-demo', 'chrome-profile-success');
    localStorage.setItem('user-preferences', JSON.stringify({
      theme: 'dark',
      language: 'en',
      notifications: true
    }));
    
    // Cookies
    document.cookie = 'session-id=demo-12345; path=/';
    document.cookie = 'user-token=abc123xyz; path=/';
    
    // sessionStorage
    sessionStorage.setItem('temp-data', 'session-specific-info');
  });
  
  console.log(`✅ Session created: ${session.metadata.id}`);
  console.log(`📁 Profile location: ${session.getUserDataDir()}`);
  
  await context.close();
  console.log('🔒 First session closed\n');
  
  // Step 2: Restore session
  console.log('🔄 Restoring session...');
  
  const { context: context2 } = await launchWithPSP(session.metadata.id, {
    headless: false
  });
  
  const page2 = await context2.newPage();
  await page2.goto('https://gmail.com');
  
  // Verify data persistence
  const restoredData = await page2.evaluate(() => {
    return {
      localStorage: {
        demo: localStorage.getItem('psp-demo'),
        preferences: localStorage.getItem('user-preferences')
      },
      cookies: document.cookie,
      sessionStorage: {
        tempData: sessionStorage.getItem('temp-data')
      }
    };
  });
  
  console.log('📊 Restored Data:');
  console.log('   localStorage:', restoredData.localStorage);
  console.log('   cookies:', restoredData.cookies);
  console.log('   sessionStorage:', restoredData.sessionStorage);
  
  const isSuccessful = 
    restoredData.localStorage.demo === 'chrome-profile-success' &&
    restoredData.cookies.includes('session-id=demo-12345');
  
  console.log(isSuccessful ? '✅ SUCCESS: Session restored!' : '❌ FAILED: Session not restored');
  
  await context2.close();
  return isSuccessful;
}

async function createAuthenticatedSession() {
  console.log('🔐 Creating authenticated session...');
  
  const { context, session } = await launchWithPSP(undefined, {
    sessionName: `Auth Session - Gmail`,
    headless: false // Show browser for manual intervention if needed
  });
  
  const page = await context.newPage();
  
  // Navigate to Gmail
  await page.goto('https://gmail.com');
  
  console.log('📧 Gmail opened - please log in manually');
  console.log('⏳ Waiting 30 seconds for authentication...');
  
  // Wait for user to authenticate
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  // Check authentication status
  const authStatus = await page.evaluate(() => {
    const isAuthenticated = !window.location.href.includes('accounts.google.com');
    return {
      authenticated: isAuthenticated,
      url: window.location.href,
      title: document.title
    };
  });
  
  if (authStatus.authenticated) {
    console.log('✅ Authentication successful');
    console.log(`📝 Session saved: ${session.metadata.id}`);
  } else {
    console.log('⚠️ Authentication incomplete or still in progress');
  }
  
  await context.close();
  return session;
}

async function captureCurrentChromeSession() {
  console.log('🔍 Capturing current Chrome session...');
  
  const currentChromeProfile = "/Users/samihalawa/Library/Application Support/Google/Chrome/Default";
  
  if (!fs.existsSync(currentChromeProfile)) {
    console.log('❌ Chrome profile not found');
    return null;
  }
  
  // Create new PSP session with copied Chrome data
  const sessionId = crypto.randomUUID();
  const pspProfileDir = path.join(os.homedir(), '.psp', 'profiles', sessionId);
  
  fs.mkdirSync(pspProfileDir, { recursive: true });
  
  console.log('📋 Copying Chrome profile data...');
  try {
    execSync(`cp -r "${currentChromeProfile}/"* "${pspProfileDir}/"`, { stdio: 'inherit' });
    console.log('✅ Profile copied successfully');
  } catch (error) {
    console.log('❌ Error copying profile:', error.message);
    return null;
  }
  
  // Save session metadata
  const sessionMeta = {
    metadata: {
      id: sessionId,
      name: `Current Chrome Session - ${new Date().toISOString()}`,
      description: "Captured current Chrome session with comprehensive state data",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      source: "current-chrome-profile"
    },
    userDataDir: pspProfileDir
  };
  
  const sessionDir = path.join(os.homedir(), '.psp', 'sessions');
  fs.mkdirSync(sessionDir, { recursive: true });
  
  const sessionFile = path.join(sessionDir, `${sessionId}.json`);
  fs.writeFileSync(sessionFile, JSON.stringify(sessionMeta, null, 2));
  
  console.log('💾 Session metadata saved');
  
  // Test the captured session
  console.log('🚀 Testing captured session...');
  
  const { context } = await launchWithPSP(sessionId, { headless: false });
  const page = await context.newPage();
  
  await page.goto('https://gmail.com');
  await page.waitForTimeout(5000);
  
  const testResult = await page.evaluate(() => {
    return {
      title: document.title,
      url: window.location.href.substring(0, 100),
      needsAuth: window.location.href.includes('accounts.google.com'),
      hasGmailUI: document.body.innerText.includes('Compose') || document.body.innerText.includes('Inbox')
    };
  });
  
  console.log('📧 Captured Session Test Results:');
  console.log('   Title:', testResult.title);
  console.log('   URL:', testResult.url + '...');
  console.log('   Needs Authentication:', testResult.needsAuth);
  console.log('   Has Gmail UI:', testResult.hasGmailUI);
  
  await context.close();
  
  return { sessionId, testResult };
}

async function listAllSessions() {
  const sessionDir = path.join(os.homedir(), '.psp', 'sessions');
  
  if (!fs.existsSync(sessionDir)) {
    return [];
  }
  
  const files = fs.readdirSync(sessionDir).filter(f => f.endsWith('.json'));
  const sessions = [];
  
  for (const file of files) {
    try {
      const sessionId = path.basename(file, '.json');
      const session = await SimpleSession.load(sessionId);
      sessions.push(session);
    } catch (error) {
      console.warn(`Failed to load session from ${file}:`, error.message);
    }
  }
  
  return sessions;
}

async function managedSessionExecution(sessionId, task) {
  const { context, session } = await launchWithPSP(sessionId);
  
  try {
    const result = await task(context);
    return result;
  } finally {
    // Always close context to free resources
    await context.close();
    console.log(`🔒 Session ${session.metadata.id} closed`);
  }
}

// CLI Interface
async function main() {
  const command = process.argv[2];
  const sessionId = process.argv[3];
  
  switch (command) {
    case 'demo':
      await demoSessionPersistence();
      break;
      
    case 'auth':
      await createAuthenticatedSession();
      break;
      
    case 'capture':
      await captureCurrentChromeSession();
      break;
      
    case 'list':
      const sessions = await listAllSessions();
      console.log('📋 PSP Sessions:');
      sessions.forEach(session => {
        console.log(`   ${session.metadata.id}: ${session.metadata.name}`);
      });
      break;
      
    case 'load':
      if (!sessionId) {
        console.log('❌ Please provide a session ID');
        break;
      }
      
      await managedSessionExecution(sessionId, async (context) => {
        const page = await context.newPage();
        await page.goto('https://gmail.com');
        console.log('🚀 Session loaded and Gmail opened');
        await new Promise(resolve => setTimeout(resolve, 20000));
      });
      break;
      
    default:
      console.log('🎯 PSP Working Implementation');
      console.log('');
      console.log('Usage:');
      console.log('  node psp-working-implementation.js demo     # Run session persistence demo');
      console.log('  node psp-working-implementation.js auth     # Create authenticated session');
      console.log('  node psp-working-implementation.js capture  # Capture current Chrome session');
      console.log('  node psp-working-implementation.js list     # List all sessions');
      console.log('  node psp-working-implementation.js load <id># Load specific session');
      console.log('');
      console.log('Examples:');
      console.log('  node psp-working-implementation.js demo');
      console.log('  node psp-working-implementation.js capture');
      break;
  }
}

// Export for module usage
module.exports = {
  SimpleSession,
  launchWithPSP,
  demoSessionPersistence,
  createAuthenticatedSession,
  captureCurrentChromeSession,
  listAllSessions,
  managedSessionExecution
};

// Run CLI if called directly
if (require.main === module) {
  main().catch(console.error);
}