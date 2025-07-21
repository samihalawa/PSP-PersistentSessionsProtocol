/**
 * Enhanced Browserbase Integration Example
 * Demonstrates Context API usage and session persistence
 */

import { BrowserbaseAdapter } from '@psp/adapter-browserbase';
import { Session } from '@psp/core';

async function enhancedBrowserbaseExample() {
  console.log('🚀 PSP Enhanced Browserbase Integration Demo');
  console.log('============================================\n');

  // Create adapter with enhanced context configuration
  const adapter = new BrowserbaseAdapter({
    apiKey: process.env.BROWSERBASE_API_KEY!,
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    
    // Context configuration for session persistence
    context: {
      persistChanges: true,    // Save changes back to persistent context
      useExisting: true,       // Use existing context if available
    },
    
    // Recording configuration
    recording: {
      enabled: true,
      enableVideo: true,       // Enable video recording
    },
    
    // Fingerprinting for stealth
    fingerprint: {
      locales: ['en-US', 'en'],
      operatingSystems: ['windows', 'macos'],
      devices: ['desktop'],
    },
    
    enableProxy: true,
  });

  try {
    console.log('📡 Connecting to Browserbase with context persistence...');
    await adapter.connect();

    console.log('🌐 Navigating to Gmail for authentication...');
    await adapter.navigate('https://accounts.google.com/');

    // Wait for user to complete authentication
    console.log('⏳ Please complete Gmail login in the browser...');
    console.log('   The session will be automatically saved with context persistence');
    await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds

    console.log('💾 Capturing session with authentication state...');
    const sessionState = await adapter.captureState();

    // Create PSP session with captured state
    const session = await Session.create({
      name: 'Gmail Authenticated Session',
      description: 'Gmail session with full authentication via Browserbase Context API',
      tags: ['gmail', 'browserbase', 'production'],
      storage: 'local',
    });

    console.log('🔄 Saving session state...');
    await session.save(sessionState);

    console.log('🔍 Getting debug URL for live inspection...');
    const debugUrl = await adapter.getDebugUrl();
    if (debugUrl) {
      console.log(`   🔗 Live Debug URL: ${debugUrl}`);
    }

    console.log('\n✅ Browserbase Integration Complete!');
    console.log(`   📊 Session ID: ${session.id}`);
    console.log(`   🍪 Cookies captured: ${sessionState.storage.cookies.length}`);
    console.log(`   📝 Context persisted: ${adapter.config.context?.persistChanges}`);
    
    // Demonstrate restoration
    console.log('\n🔄 Demonstrating session restoration...');
    await adapter.navigate('https://accounts.google.com/logout');
    
    console.log('📥 Restoring authentication state...');
    const loadedSession = await Session.load(session.id);
    await adapter.applyState(loadedSession.state);
    
    console.log('🔍 Verifying restoration...');
    await adapter.navigate('https://mail.google.com/');
    
    console.log('✅ Session restoration verified - should be logged in!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await adapter.disconnect();
  }
}

// Enhanced Browserbase for Multiple Platforms
async function multiPlatformBrowserbaseExample() {
  console.log('\n🌐 Multi-Platform Browserbase Demo');
  console.log('===================================\n');

  const platforms = [
    { name: 'GitHub', url: 'https://github.com/login' },
    { name: 'AWS Console', url: 'https://console.aws.amazon.com/' },
    { name: 'Slack', url: 'https://slack.com/signin' },
  ];

  for (const platform of platforms) {
    console.log(`🔐 Setting up ${platform.name} session...`);
    
    const adapter = new BrowserbaseAdapter({
      apiKey: process.env.BROWSERBASE_API_KEY!,
      projectId: process.env.BROWSERBASE_PROJECT_ID!,
      context: {
        persistChanges: true,
        useExisting: false, // Create fresh context for each platform
      },
      recording: { enabled: true },
      fingerprint: {
        locales: ['en-US'],
        operatingSystems: ['windows'],
      },
    });

    try {
      await adapter.connect();
      await adapter.navigate(platform.url);
      
      // Simulate authentication
      console.log(`   ⏳ Simulating ${platform.name} authentication...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const sessionState = await adapter.captureState();
      const session = await Session.create({
        name: `${platform.name} Production Session`,
        description: `Authenticated ${platform.name} session via Browserbase`,
        tags: [platform.name.toLowerCase(), 'browserbase', 'production'],
      });
      
      await session.save(sessionState);
      console.log(`   ✅ ${platform.name} session saved: ${session.id}`);
      
    } catch (error) {
      console.error(`   ❌ ${platform.name} failed:`, error);
    } finally {
      await adapter.disconnect();
    }
  }
}

if (require.main === module) {
  enhancedBrowserbaseExample()
    .then(() => multiPlatformBrowserbaseExample())
    .catch(console.error);
}

export { enhancedBrowserbaseExample, multiPlatformBrowserbaseExample };