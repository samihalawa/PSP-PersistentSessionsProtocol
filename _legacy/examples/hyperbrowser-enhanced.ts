/**
 * Enhanced Hyperbrowser Integration Example
 * Demonstrates Profile Management and AI Automation Features
 */

import { HyperbrowserAdapter } from '@psp/adapter-hyperbrowser';
import { Session } from '@psp/core';

async function enhancedHyperbrowserExample() {
  console.log('🤖 PSP Enhanced Hyperbrowser Integration Demo');
  console.log('===============================================\n');

  // Create adapter with enhanced profile management
  const adapter = new HyperbrowserAdapter({
    apiKey: process.env.HYPERBROWSER_API_KEY!,
    
    // Enhanced profile configuration
    profile: {
      name: 'PSP Production Profile',
      persistChanges: true,     // Save changes to profile
      autoCreate: true,         // Create profile if it doesn't exist
    },
    
    // AI-optimized settings
    useStealth: true,           // Advanced stealth mode
    useProxy: true,
    proxyCountry: 'US',
    
    // Device emulation
    operatingSystems: ['windows'],
    device: ['desktop'],
    platform: ['chrome'],
    locales: ['en-US'],
    screen: { width: 1920, height: 1080 },
    
    // Automation features
    solveCaptchas: true,        // AI CAPTCHA solving
    adblock: true,              // Block ads
    trackers: true,             // Block trackers
    annoyances: true,           // Block annoyances
    acceptCookies: true,        // Auto-accept cookies
    enableWebRecording: true,   // Record interactions
    enableVideoWebRecording: true, // Video recording
    
    timeoutMinutes: 30,         // Extended timeout for complex auth flows
  });

  try {
    console.log('🔧 Setting up Hyperbrowser profile...');
    
    // List existing profiles
    const profiles = await adapter.listProfiles();
    console.log(`   📋 Found ${profiles.length} existing profiles`);
    
    console.log('📡 Connecting to Hyperbrowser with profile persistence...');
    await adapter.connect();

    console.log('🤖 Demonstrating AI-powered automation...');
    
    // Multi-platform authentication flow
    const platforms = [
      {
        name: 'Discord',
        url: 'https://discord.com/login',
        description: 'Social platform with complex auth'
      },
      {
        name: 'Notion',
        url: 'https://www.notion.so/login',
        description: 'Workspace platform'
      },
      {
        name: 'HuggingFace',
        url: 'https://huggingface.co/login',
        description: 'AI/ML platform'
      }
    ];

    for (const platform of platforms) {
      console.log(`\n🔐 Setting up ${platform.name} (${platform.description})...`);
      
      await adapter.navigate(platform.url);
      
      // Let Hyperbrowser handle complex authentication with AI
      console.log(`   🤖 AI handling ${platform.name} authentication...`);
      console.log(`   🛡️ Stealth mode active, CAPTCHA solving enabled`);
      
      // Simulate AI interaction
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      const sessionState = await adapter.captureState();
      const session = await Session.create({
        name: `${platform.name} AI Session`,
        description: `${platform.description} - AI authenticated via Hyperbrowser`,
        tags: [platform.name.toLowerCase(), 'hyperbrowser', 'ai', 'stealth'],
      });
      
      await session.save(sessionState);
      console.log(`   ✅ ${platform.name} session saved with AI automation`);
      console.log(`   📊 Session: ${session.id}`);
      console.log(`   🍪 Cookies: ${sessionState.storage.cookies.length}`);
    }

    console.log('\n🔄 Demonstrating profile persistence...');
    
    // Export session data for other tools
    const exportData = await adapter.exportForHyperbrowser();
    console.log('📤 Export data for external tools:');
    console.log(`   🆔 Session ID: ${exportData.sessionId}`);
    console.log(`   👤 Profile ID: ${exportData.profileId}`);
    console.log(`   🎥 Recording events: ${exportData.recording.length}`);
    console.log(`   📺 Live URL: ${exportData.liveUrl || 'Not available'}`);

    console.log('\n✅ Hyperbrowser Integration Complete!');
    console.log('   🤖 AI automation enabled');
    console.log('   🛡️ Stealth mode active'); 
    console.log('   👤 Profile persistence configured');
    console.log('   🎯 CAPTCHA solving enabled');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await adapter.disconnect();
  }
}

// Advanced Hyperbrowser Features Demo
async function advancedHyperbrowserFeatures() {
  console.log('\n🚀 Advanced Hyperbrowser Features Demo');
  console.log('======================================\n');

  const adapter = new HyperbrowserAdapter({
    apiKey: process.env.HYPERBROWSER_API_KEY!,
    profile: {
      name: 'Advanced Features Profile',
      persistChanges: true,
    },
    useStealth: true,
    useProxy: true,
    proxyCountry: 'US',
    solveCaptchas: true,
    adblock: true,
    trackers: true,
    annoyances: true,
    enableWebRecording: true,
    
    // Advanced browser arguments
    browserArgs: [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=VizDisplayCompositor',
      '--disable-background-networking',
    ],
    
    // URL filtering
    urlBlocklist: [
      '*analytics*',
      '*tracking*',
      '*ads*',
    ],
  });

  try {
    await adapter.connect();

    console.log('🎯 Testing complex authentication flows...');
    
    // Test enterprise platforms that require special handling
    const enterprisePlatforms = [
      'https://app.slack.com/signin',
      'https://github.com/login',
      'https://console.aws.amazon.com/',
    ];

    for (const platform of enterprisePlatforms) {
      console.log(`🔒 Testing ${platform}...`);
      await adapter.navigate(platform);
      
      // Start recording for this platform
      await adapter.startRecording();
      
      console.log('   🎥 Recording user interactions...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const events = await adapter.stopRecording();
      console.log(`   📹 Recorded ${events.length} interaction events`);
      
      // Capture complete session state
      const sessionState = await adapter.captureState();
      
      // Create session with rich metadata
      const session = await Session.create({
        name: `Enterprise Platform Session`,
        description: `Advanced session for ${platform}`,
        tags: ['enterprise', 'hyperbrowser', 'advanced', 'recorded'],
        metadata: {
          platform: platform,
          recordedEvents: events.length,
          features: ['stealth', 'captcha-solving', 'proxy', 'recording'],
          profileId: adapter.config.profile?.id,
        },
      });
      
      await session.save(sessionState);
      console.log(`   ✅ Advanced session saved: ${session.id}`);
    }

    console.log('\n🔧 Profile management demonstration...');
    
    // Show profile management capabilities
    const profiles = await adapter.listProfiles();
    console.log(`   📋 Available profiles: ${profiles.length}`);
    
    for (const profile of profiles.slice(0, 3)) {
      console.log(`   👤 Profile: ${profile.name || profile.id} (Created: ${profile.createdAt})`);
    }

  } catch (error) {
    console.error('❌ Advanced features error:', error);
  } finally {
    await adapter.disconnect();
  }
}

// Hyperbrowser + Browserbase Comparison
async function platformComparisonDemo() {
  console.log('\n⚖️ Hyperbrowser vs Browserbase Comparison');
  console.log('==========================================\n');

  console.log('🤖 Hyperbrowser Strengths:');
  console.log('  • AI-powered automation and CAPTCHA solving');
  console.log('  • Advanced stealth and anti-detection');
  console.log('  • Profile management for persistent state');
  console.log('  • Video recording capabilities');
  console.log('  • Enterprise-grade proxy networks');

  console.log('\n🌐 Browserbase Strengths:');
  console.log('  • Context API for session persistence');
  console.log('  • Excellent WebSocket debugging');
  console.log('  • High-performance infrastructure');
  console.log('  • Simple WebDriver integration');
  console.log('  • Cost-effective for basic automation');

  console.log('\n🎯 PSP Integration Benefits:');
  console.log('  • Unified session management across both platforms');
  console.log('  • Seamless switching between providers');
  console.log('  • Common session format and API');
  console.log('  • Cross-platform session restoration');
  console.log('  • Comprehensive recording and debugging');
}

if (require.main === module) {
  enhancedHyperbrowserExample()
    .then(() => advancedHyperbrowserFeatures())
    .then(() => platformComparisonDemo())
    .catch(console.error);
}

export { 
  enhancedHyperbrowserExample, 
  advancedHyperbrowserFeatures,
  platformComparisonDemo 
};