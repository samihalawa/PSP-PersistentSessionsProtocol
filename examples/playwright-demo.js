const { launchWithPSP, captureSession } = require('@psp/adapter-playwright');

async function demo() {
  console.log('🚀 PSP Playwright Demo Starting...');
  
  try {
    // Step 1: Launch with new session
    console.log('\n📱 Step 1: Creating new session...');
    const { browser, context, session } = await launchWithPSP(undefined, {
      sessionName: 'Demo Session',
      headless: false
    });
    
    const page = await context.newPage();
    
    // Navigate and set a cookie for testing
    console.log('🌐 Navigating to test page...');
    await page.goto('https://httpbin.org/cookies/set?demo=test&timestamp=' + Date.now());
    await page.waitForLoadState('networkidle');
    
    // Capture the session with the cookie
    await session.capture(context);
    const sessionId = session.getId();
    
    console.log(`✅ Session captured: ${sessionId}`);
    
    // Check cookies
    const cookies = await page.evaluate(() => document.cookie);
    console.log('🍪 Current cookies:', cookies);
    
    await browser.close();
    
    // Step 2: Launch with restored session
    console.log('\n🔄 Step 2: Restoring session...');
    
    const { browser: browser2, context: context2 } = await launchWithPSP(sessionId, {
      headless: false
    });
    
    const page2 = await context2.newPage();
    await page2.goto('https://httpbin.org/cookies');
    
    // Check if cookie was restored
    const restoredCookies = await page2.evaluate(() => document.cookie);
    console.log('🍪 Restored cookies:', restoredCookies);
    
    if (restoredCookies.includes('demo=test')) {
      console.log('✅ Session restoration successful!');
    } else {
      console.log('❌ Session restoration failed');
    }
    
    await browser2.close();
    
    console.log('\n🎉 Demo completed successfully!');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demo();
}

module.exports = { demo };