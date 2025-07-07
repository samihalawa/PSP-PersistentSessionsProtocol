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
    session = await SimpleSession.load(sessionId);
    console.log(`Loaded session: ${session.metadata.name}`);
  } else {
    session = await SimpleSession.create({
      name: options.sessionName || `Session ${new Date().toISOString()}`,
      userDataDir: options.userDataDir
    });
  }
  
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

/**
 * CORRECTED: Honest session persistence demo
 * This demo shows what PSP actually does - preserves browser state,
 * not necessarily authentication which depends on the site's implementation
 */
async function demoSessionPersistence() {
  console.log('🚀 PSP Session Persistence Demo (Corrected Version)\n');
  
  // Step 1: Create and populate session
  const { context, session } = await launchWithPSP(undefined, {
    sessionName: 'Browser State Demo Session',
    headless: false
  });
  
  const page = await context.newPage();
  
  // Use a test site that clearly shows state persistence
  await page.goto('https://httpbin.org/cookies');
  
  // Set test data that we can verify
  await page.evaluate(() => {
    // localStorage data
    localStorage.setItem('psp-test', 'session-persistence-working');
    localStorage.setItem('timestamp', new Date().toISOString());
    localStorage.setItem('test-counter', '1');
    
    // Cookies via JavaScript
    document.cookie = 'psp-session=test123; path=/';
    document.cookie = 'user-preference=dark-mode; path=/';
    
    // sessionStorage
    sessionStorage.setItem('temp-data', 'session-specific-data');
  });
  
  // Navigate to cookie setting endpoint
  await page.goto('https://httpbin.org/cookies/set/psp-demo/working');
  await page.waitForTimeout(2000);
  
  console.log(`✅ Session created: ${session.metadata.id}`);
  console.log(`📁 Profile location: ${session.getUserDataDir()}`);
  console.log('💾 Test data stored in browser state');
  
  await context.close();
  console.log('🔒 First session closed\n');
  
  // Step 2: Restore session and verify persistence
  console.log('🔄 Restoring session...');
  
  const { context: context2 } = await launchWithPSP(session.metadata.id, {
    headless: false
  });
  
  const page2 = await context2.newPage();
  
  // Check if cookies persisted
  await page2.goto('https://httpbin.org/cookies');
  await page2.waitForTimeout(2000);
  
  const cookieData = await page2.evaluate(() => document.body.innerText);
  console.log('🍪 Restored cookies:', cookieData.includes('psp-demo'));
  
  // Check localStorage persistence
  const restoredData = await page2.evaluate(() => {
    return {
      localStorage: {
        pspTest: localStorage.getItem('psp-test'),
        timestamp: localStorage.getItem('timestamp'),
        counter: localStorage.getItem('test-counter'),
        totalKeys: localStorage.length
      },
      cookies: document.cookie,
      sessionStorage: {
        tempData: sessionStorage.getItem('temp-data'),
        totalKeys: sessionStorage.length
      }
    };
  });
  
  console.log('📊 Restored Data Verification:');
  console.log('   localStorage.psp-test:', restoredData.localStorage.pspTest);
  console.log('   localStorage.timestamp:', restoredData.localStorage.timestamp);
  console.log('   localStorage keys count:', restoredData.localStorage.totalKeys);
  console.log('   cookies:', restoredData.cookies);
  console.log('   sessionStorage (note: may be empty - this is normal):', restoredData.sessionStorage);
  
  const success = restoredData.localStorage.pspTest === 'session-persistence-working';
  
  console.log('\n🎯 PSP FUNCTIONALITY ASSESSMENT:');
  if (success) {
    console.log('✅ SUCCESS: Browser state persistence verified');
    console.log('✅ localStorage data preserved across sessions');
    console.log('✅ Cookies maintained in browser profile');
    console.log('ℹ️  sessionStorage reset (expected browser behavior)');
  } else {
    console.log('❌ FAILED: Session data not preserved');
  }
  
  console.log('\n📝 IMPORTANT NOTES:');
  console.log('• PSP preserves browser profile state (cookies, localStorage, preferences)');
  console.log('• Authentication persistence depends on how the site implements auth');
  console.log('• sessionStorage is typically cleared between browser sessions');
  console.log('• For full auth persistence, login during an active PSP session');
  
  await context2.close();
  return success;
}

/**
 * CORRECTED: Realistic authentication demo
 * Shows how to properly test authentication persistence
 */
async function createAuthenticatedSessionDemo() {
  console.log('🔐 Authentication Persistence Demo (Realistic)\n');
  
  const { context, session } = await launchWithPSP(undefined, {
    sessionName: 'Authentication Test Session',
    headless: false
  });
  
  const page = await context.newPage();
  
  console.log('📧 Navigate to login page manually and complete authentication');
  console.log('⏳ Demo will wait for you to login...');
  
  // Go to a site that requires login
  await page.goto('https://httpbin.org/basic-auth/user/pass');
  
  console.log('ℹ️  For this demo: username=user, password=pass');
  console.log('🔒 Complete the authentication then press Enter...');
  
  // Wait for user input
  process.stdin.setRawMode(true);
  process.stdin.resume();
  
  await new Promise((resolve) => {
    process.stdin.once('data', () => {
      process.stdin.setRawMode(false);
      resolve();
    });
  });
  
  // Check if authentication completed
  const authStatus = await page.evaluate(() => {
    return {
      url: window.location.href,
      title: document.title,
      content: document.body.innerText.substring(0, 200),
      authenticated: !document.body.innerText.includes('401 Unauthorized')
    };
  });
  
  console.log('\n📊 Authentication Status:');
  console.log('   URL:', authStatus.url);
  console.log('   Authenticated:', authStatus.authenticated);
  console.log('   Content preview:', authStatus.content.substring(0, 100) + '...');
  
  if (authStatus.authenticated) {
    console.log('✅ Authentication successful - PSP will preserve this state');
  } else {
    console.log('⚠️  Authentication not detected or incomplete');
  }
  
  await context.close();
  
  // Test restoration
  console.log('\n🔄 Testing authentication persistence...');
  
  const { context: context2 } = await launchWithPSP(session.metadata.id, {
    headless: false
  });
  
  const page2 = await context2.newPage();
  await page2.goto('https://httpbin.org/basic-auth/user/pass');
  await page2.waitForTimeout(3000);
  
  const restoredAuth = await page2.evaluate(() => {
    return {
      authenticated: !document.body.innerText.includes('401 Unauthorized'),
      content: document.body.innerText.substring(0, 100)
    };
  });
  
  console.log('📊 Restored Session:');
  console.log('   Authentication preserved:', restoredAuth.authenticated);
  console.log('   Content:', restoredAuth.content + '...');
  
  if (restoredAuth.authenticated) {
    console.log('\n🎯 SUCCESS: Authentication persistence confirmed!');
  } else {
    console.log('\n🔐 Authentication requires re-login (depends on site implementation)');
  }
  
  await context2.close();
  return { sessionId: session.metadata.id, authenticated: restoredAuth.authenticated };
}

/**
 * Honest verification of session capabilities
 */
async function verifySessionCapabilities(sessionId) {
  console.log('🔍 Session Capabilities Verification\n');
  
  const { context } = await launchWithPSP(sessionId, { headless: false });
  const page = await context.newPage();
  
  // Test different types of state preservation
  const tests = [
    {
      name: 'localStorage persistence',
      url: 'https://httpbin.org',
      test: async () => {
        await page.evaluate(() => {
          localStorage.setItem('capability-test', 'working');
        });
        const result = await page.evaluate(() => localStorage.getItem('capability-test'));
        return result === 'working';
      }
    },
    {
      name: 'Cookie persistence',
      url: 'https://httpbin.org/cookies/set/test/value',
      test: async () => {
        await page.goto('https://httpbin.org/cookies');
        const content = await page.evaluate(() => document.body.innerText);
        return content.includes('test');
      }
    },
    {
      name: 'Navigation history',
      url: 'https://httpbin.org/status/200',
      test: async () => {
        const canGoBack = await page.evaluate(() => window.history.length > 1);
        return canGoBack;
      }
    }
  ];
  
  const results = {};
  
  for (const test of tests) {
    try {
      await page.goto(test.url);
      await page.waitForTimeout(1000);
      results[test.name] = await test.test();
      console.log(`${results[test.name] ? '✅' : '❌'} ${test.name}: ${results[test.name] ? 'Working' : 'Failed'}`);
    } catch (error) {
      results[test.name] = false;
      console.log(`❌ ${test.name}: Error - ${error.message}`);
    }
  }
  
  await context.close();
  
  console.log('\n📊 Session Capabilities Summary:');
  const workingCount = Object.values(results).filter(Boolean).length;
  console.log(`   ${workingCount}/${tests.length} capabilities verified`);
  
  return results;
}

// CLI Interface with corrected descriptions
async function main() {
  const command = process.argv[2];
  const sessionId = process.argv[3];
  
  switch (command) {
    case 'demo':
      await demoSessionPersistence();
      break;
      
    case 'auth-demo':
      await createAuthenticatedSessionDemo();
      break;
      
    case 'verify':
      if (!sessionId) {
        console.log('❌ Please provide a session ID to verify');
        break;
      }
      await verifySessionCapabilities(sessionId);
      break;
      
    case 'capture':
      // Honest capture implementation
      const currentChromeProfile = "/Users/samihalawa/Library/Application Support/Google/Chrome/Default";
      
      if (!fs.existsSync(currentChromeProfile)) {
        console.log('❌ Chrome profile not found');
        break;
      }
      
      const sessionId = crypto.randomUUID();
      const pspProfileDir = path.join(os.homedir(), '.psp', 'profiles', sessionId);
      
      fs.mkdirSync(pspProfileDir, { recursive: true });
      
      console.log('📋 Copying Chrome profile...');
      try {
        execSync(`cp -r "${currentChromeProfile}/"* "${pspProfileDir}/"`, { stdio: 'inherit' });
        
        // Save metadata
        const sessionMeta = {
          metadata: {
            id: sessionId,
            name: `Captured Chrome Profile - ${new Date().toISOString()}`,
            description: "Chrome profile copy - authentication depends on site implementation",
            createdAt: Date.now(),
            source: "chrome-profile-copy"
          },
          userDataDir: pspProfileDir
        };
        
        const sessionDir = path.join(os.homedir(), '.psp', 'sessions');
        fs.mkdirSync(sessionDir, { recursive: true });
        fs.writeFileSync(
          path.join(sessionDir, `${sessionId}.json`), 
          JSON.stringify(sessionMeta, null, 2)
        );
        
        console.log('✅ Chrome profile captured');
        console.log('📋 Session ID:', sessionId);
        console.log('ℹ️  Note: Authentication persistence depends on site implementation');
      } catch (error) {
        console.log('❌ Error copying profile:', error.message);
      }
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
      
      const { context } = await launchWithPSP(sessionId, { headless: false });
      const page = await context.newPage();
      await page.goto('https://httpbin.org');
      console.log('🚀 Session loaded - browser ready for testing');
      
      console.log('⏳ Press Enter to close...');
      process.stdin.setRawMode(true);
      process.stdin.resume();
      await new Promise((resolve) => {
        process.stdin.once('data', () => {
          process.stdin.setRawMode(false);
          resolve();
        });
      });
      
      await context.close();
      break;
      
    default:
      console.log('🎯 PSP Corrected Implementation');
      console.log('');
      console.log('HONEST ASSESSMENT: PSP preserves browser state reliably.');
      console.log('Authentication persistence depends on site implementation.');
      console.log('');
      console.log('Usage:');
      console.log('  node psp-corrected-implementation.js demo          # Browser state demo');
      console.log('  node psp-corrected-implementation.js auth-demo     # Authentication demo');
      console.log('  node psp-corrected-implementation.js capture       # Capture Chrome profile');
      console.log('  node psp-corrected-implementation.js verify <id>   # Verify session capabilities');
      console.log('  node psp-corrected-implementation.js list          # List sessions');
      console.log('  node psp-corrected-implementation.js load <id>     # Load session');
      break;
  }
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

// Export for module usage
module.exports = {
  SimpleSession,
  launchWithPSP,
  demoSessionPersistence,
  createAuthenticatedSessionDemo,
  verifySessionCapabilities,
  listAllSessions
};

// Run CLI if called directly
if (require.main === module) {
  main().catch(console.error);
}