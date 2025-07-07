#!/usr/bin/env node

const { ProductionPSP } = require('./production-psp-implementation');
const { chromium } = require('playwright');

/**
 * Real Authentication Session Preservation Test
 * 
 * Tests PSP with actual authentication scenarios that matter in production
 */

async function testAuthenticationPreservation() {
  console.log('🔐 Authentication Session Preservation Test');
  console.log('==========================================');

  const psp = new ProductionPSP();
  await psp.initialize();

  const sessionId = `auth-test-${Date.now()}`;

  try {
    // Test 1: GitHub Authentication Simulation
    console.log('\n🧪 Test 1: GitHub-style authentication preservation...');
    
    const session = await psp.createSession(sessionId, 'playwright', { headless: false });
    
    // Simulate GitHub login flow
    await session.page.goto('https://httpbin.org/cookies/set/github_session/authenticated_user_12345');
    await session.page.goto('https://httpbin.org/cookies/set/csrf_token/abc123def456');
    
    // Set authentication localStorage (typical for SPAs)
    await session.page.evaluate(() => {
      localStorage.setItem('auth_token', JSON.stringify({
        access_token: 'github_pat_11ABCDEFG123456789',
        refresh_token: 'ghr_1234567890abcdef',
        user_id: '12345',
        username: 'testuser',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }));
      
      localStorage.setItem('user_preferences', JSON.stringify({
        theme: 'dark',
        notifications: true,
        language: 'en'
      }));
      
      sessionStorage.setItem('navigation_state', JSON.stringify({
        current_repo: 'testuser/awesome-project',
        last_visited: '/repositories',
        unsaved_changes: false
      }));
    });
    
    await session.context.close();
    console.log('  ✅ Original authentication session created');

    // Transfer session and verify authentication persists
    console.log('  🔄 Transferring session with authentication data...');
    const transfer = await psp.transferSession(sessionId, 'playwright', 'browser-use', { headless: false });
    
    // Verify authentication data integrity
    const authVerification = {
      auth_cookies_preserved: transfer.verification.cookies_match,
      auth_tokens_preserved: transfer.verification.localStorage_match,
      session_state_preserved: transfer.verification.sessionStorage_match,
      navigation_preserved: transfer.verification.url_match
    };

    console.log('  📊 Authentication Verification:');
    Object.entries(authVerification).forEach(([key, passed]) => {
      const status = passed ? '✅' : '❌';
      console.log(`    ${status} ${key.replace(/_/g, ' ').toUpperCase()}: ${passed}`);
    });

    // Test 2: E-commerce Session Preservation  
    console.log('\n🛒 Test 2: E-commerce session preservation...');
    
    const ecommerceSessionId = `ecommerce-${Date.now()}`;
    const ecommerceSession = await psp.createSession(ecommerceSessionId, 'playwright', { headless: false });
    
    // Simulate e-commerce session
    await ecommerceSession.page.goto('https://httpbin.org/cookies/set/cart_id/cart_789xyz');
    await ecommerceSession.page.goto('https://httpbin.org/cookies/set/user_session/logged_in_user_456');
    
    await ecommerceSession.page.evaluate(() => {
      // Shopping cart state
      localStorage.setItem('shopping_cart', JSON.stringify({
        items: [
          { id: 'prod_1', name: 'Laptop', price: 999.99, quantity: 1 },
          { id: 'prod_2', name: 'Mouse', price: 29.99, quantity: 2 }
        ],
        total: 1059.97,
        currency: 'USD'
      }));
      
      // User account data
      localStorage.setItem('user_account', JSON.stringify({
        user_id: '456',
        email: 'test@example.com',
        membership_tier: 'premium',
        saved_addresses: ['home', 'work']
      }));
      
      // Checkout progress
      sessionStorage.setItem('checkout_progress', JSON.stringify({
        step: 'payment',
        shipping_address: 'selected',
        payment_method: 'saved_card_ending_1234'
      }));
    });
    
    await ecommerceSession.context.close();
    console.log('  ✅ E-commerce session created');

    // Transfer e-commerce session
    const ecommerceTransfer = await psp.transferSession(ecommerceSessionId, 'playwright', 'browser-use', { headless: false });
    
    console.log('  📊 E-commerce Transfer Results:');
    Object.entries(ecommerceTransfer.verification).forEach(([key, value]) => {
      const status = value === true ? '✅' : value === false ? '❌' : '📊';
      console.log(`    ${status} ${key.replace(/_/g, ' ').toUpperCase()}: ${value}`);
    });

    // Test 3: Multi-tab Session Coordination
    console.log('\n🗂️ Test 3: Multi-tab session coordination...');
    
    const multiTabSessionId = `multitab-${Date.now()}`;
    const multiTabSession = await psp.createSession(multiTabSessionId, 'playwright', { headless: false });
    
    // Simulate multi-tab application state
    await multiTabSession.page.goto('https://httpbin.org/cookies/set/app_session/multi_tab_session_789');
    
    await multiTabSession.page.evaluate(() => {
      // Cross-tab communication data
      localStorage.setItem('tab_coordination', JSON.stringify({
        primary_tab_id: 'tab_001',
        open_tabs: ['dashboard', 'profile', 'settings'],
        shared_state: {
          notifications: ['Welcome back!', 'You have 3 new messages'],
          global_settings: { auto_save: true, sync_enabled: true }
        }
      }));
      
      // Real-time data
      sessionStorage.setItem('realtime_data', JSON.stringify({
        websocket_connection: 'connected',
        last_heartbeat: new Date().toISOString(),
        active_channels: ['user_updates', 'system_notifications']
      }));
    });
    
    await multiTabSession.context.close();

    const multiTabTransfer = await psp.transferSession(multiTabSessionId, 'playwright', 'browser-use', { headless: false });
    
    console.log('  📊 Multi-tab Transfer Results:');
    console.log(`    🎯 Success Rate: ${Math.round(multiTabTransfer.verification.successRate)}%`);

    // Overall Assessment
    const overallTests = [
      authVerification.auth_cookies_preserved && authVerification.auth_tokens_preserved,
      ecommerceTransfer.verification.successRate >= 100,
      multiTabTransfer.verification.successRate >= 100
    ];
    
    const overallSuccess = overallTests.filter(Boolean).length / overallTests.length * 100;
    
    console.log('\n🎯 Overall Authentication Session Preservation:');
    console.log(`  📊 Success Rate: ${Math.round(overallSuccess)}%`);
    console.log(`  🧪 Tests Passed: ${overallTests.filter(Boolean).length}/${overallTests.length}`);
    
    if (overallSuccess >= 90) {
      console.log('  ✅ EXCELLENT: Authentication sessions fully preserved across providers');
    } else if (overallSuccess >= 70) {
      console.log('  ⚠️ GOOD: Most authentication data preserved, minor issues');
    } else {
      console.log('  ❌ NEEDS WORK: Authentication preservation has significant gaps');
    }

    return {
      authTest: authVerification,
      ecommerceTest: ecommerceTransfer.verification,
      multiTabTest: multiTabTransfer.verification,
      overallSuccess
    };

  } catch (error) {
    console.error('❌ Authentication test failed:', error.message);
    throw error;
  }
}

if (require.main === module) {
  testAuthenticationPreservation().catch(console.error);
}

module.exports = { testAuthenticationPreservation };