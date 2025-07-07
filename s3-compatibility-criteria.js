#!/usr/bin/env node

const { S3SessionManager } = require('./s3-session-manager');

/**
 * S3 Session Compatibility Criteria & Verification
 * 
 * Establishes clear criteria for determining if sessions are correctly
 * retrieved from S3 and used properly across different integrations
 */

const S3_COMPATIBILITY_CRITERIA = {
  // Core Success Thresholds
  MINIMUM_SUCCESS_RATE: 80,
  EXCELLENT_SUCCESS_RATE: 95,
  
  // Provider-specific requirements
  PROVIDER_REQUIREMENTS: {
    playwright: {
      minSuccessRate: 85,
      requiredFeatures: ['cookies', 'localStorage', 'sessionStorage', 'userAgent']
    },
    'browser-use': {
      minSuccessRate: 80,
      requiredFeatures: ['cookies', 'localStorage', 'stealth']
    },
    skyvern: {
      minSuccessRate: 75,
      requiredFeatures: ['cookies', 'localStorage', 'aiEnhanced', 'workflowData']
    }
  },
  
  // Cross-provider compatibility
  CROSS_PROVIDER: {
    minCompatibilityScore: 70,
    excellentCompatibilityScore: 90,
    requiredDataPreservation: ['cookies', 'localStorage', 'url'],
    allowedDataLoss: ['sessionStorage'] // Acceptable to lose some session storage
  },
  
  // Data integrity requirements
  DATA_INTEGRITY: {
    cookiesPreservation: 100, // Must preserve all cookies
    localStoragePreservation: 90, // Must preserve 90% of localStorage
    urlPreservation: 100, // Must preserve navigation state
    userAgentPreservation: 80 // User agent can differ slightly
  },
  
  // Performance requirements
  PERFORMANCE: {
    maxUploadTimeMs: 30000,
    maxDownloadTimeMs: 15000,
    maxRestoreTimeMs: 45000,
    maxS3FileSize: 10 * 1024 * 1024 // 10MB max
  },
  
  // Reliability requirements
  RELIABILITY: {
    maxRetries: 3,
    backoffDelayMs: 1000,
    successfulRetriesRequired: 2
  }
};

class S3CompatibilityVerifier {
  constructor() {
    this.s3Manager = new S3SessionManager();
    this.testResults = [];
  }

  async initialize() {
    await this.s3Manager.initialize();
    console.log('🧪 S3 Compatibility Verifier initialized');
  }

  /**
   * Comprehensive S3 compatibility test
   */
  async runComprehensiveTest() {
    console.log('🔬 S3 Session Compatibility Verification');
    console.log('========================================');

    const providers = ['playwright', 'browser-use', 'skyvern'];
    const testSessionId = `compatibility-test-${Date.now()}`;
    
    const results = {
      providerTests: {},
      crossProviderTests: {},
      performanceTests: {},
      overallCompatibility: {
        passed: false,
        score: 0,
        details: {}
      }
    };

    try {
      // Test 1: Individual provider compatibility
      console.log('\n📝 Phase 1: Individual Provider Compatibility');
      for (const provider of providers) {
        const providerResult = await this.testProviderCompatibility(provider, testSessionId);
        results.providerTests[provider] = providerResult;
        
        const passed = providerResult.successRate >= S3_COMPATIBILITY_CRITERIA.PROVIDER_REQUIREMENTS[provider].minSuccessRate;
        console.log(`  ${passed ? '✅' : '❌'} ${provider}: ${Math.round(providerResult.successRate)}%`);
      }

      // Test 2: Cross-provider compatibility
      console.log('\n🔄 Phase 2: Cross-Provider Compatibility');
      const crossProviderPairs = [
        ['playwright', 'browser-use'],
        ['browser-use', 'skyvern'],
        ['skyvern', 'playwright']
      ];

      for (const [fromProvider, toProvider] of crossProviderPairs) {
        const crossResult = await this.testCrossProviderCompatibility(fromProvider, toProvider, testSessionId);
        results.crossProviderTests[`${fromProvider}->${toProvider}`] = crossResult;
        
        const passed = crossResult.compatibilityScore >= S3_COMPATIBILITY_CRITERIA.CROSS_PROVIDER.minCompatibilityScore;
        console.log(`  ${passed ? '✅' : '❌'} ${fromProvider} → ${toProvider}: ${Math.round(crossResult.compatibilityScore)}%`);
      }

      // Test 3: Performance compliance
      console.log('\n⚡ Phase 3: Performance Compliance');
      const performanceResult = await this.testPerformanceCompliance(testSessionId);
      results.performanceTests = performanceResult;
      
      const perfPassed = this.evaluatePerformanceCompliance(performanceResult);
      console.log(`  ${perfPassed ? '✅' : '❌'} Performance: ${perfPassed ? 'PASSED' : 'FAILED'}`);

      // Calculate overall compatibility
      const overallResult = this.calculateOverallCompatibility(results);
      results.overallCompatibility = overallResult;

      // Generate final report
      console.log('\n📊 Final Compatibility Assessment');
      console.log('=================================');
      console.log(`Overall Score: ${Math.round(overallResult.score)}%`);
      console.log(`Status: ${overallResult.passed ? '✅ COMPATIBLE' : '❌ NOT COMPATIBLE'}`);

      if (overallResult.passed) {
        console.log('\n🎉 S3 SESSION COMPATIBILITY VERIFIED!');
        console.log('  ✅ Sessions can be correctly retrieved from S3');
        console.log('  ✅ All integrations support proper session usage');
        console.log('  ✅ Cross-provider transfers work reliably');
      } else {
        console.log('\n⚠️ S3 compatibility issues detected:');
        overallResult.details.failures.forEach(failure => {
          console.log(`  ❌ ${failure}`);
        });
      }

      return results;

    } catch (error) {
      console.error('❌ Compatibility test failed:', error.message);
      throw error;
    }
  }

  async testProviderCompatibility(provider, baseSessionId) {
    const sessionId = `${baseSessionId}-${provider}`;
    
    try {
      const startTime = Date.now();
      
      // Create session with test data
      let session;
      if (provider === 'skyvern') {
        session = await this.s3Manager.skyvernAdapter.createSession(sessionId, { headless: true });
      } else {
        session = await this.s3Manager.psp.createSession(sessionId, provider, { headless: true });
      }

      // Add standardized test data
      await this.addStandardTestData(session.page);
      await session.context.close();

      // Upload to S3
      const uploadStartTime = Date.now();
      const uploadResult = await this.s3Manager.uploadSession(sessionId, provider);
      const uploadTime = Date.now() - uploadStartTime;

      // Download and restore
      const downloadStartTime = Date.now();
      const restoreResult = await this.s3Manager.restoreSessionFromS3(uploadResult.s3Key, provider, { headless: true });
      const downloadTime = Date.now() - downloadStartTime;

      const totalTime = Date.now() - startTime;

      return {
        provider,
        successRate: restoreResult.verification.successRate,
        uploadTime,
        downloadTime,
        totalTime,
        dataIntegrity: this.evaluateDataIntegrity(restoreResult.verification),
        meetsCriteria: restoreResult.verification.successRate >= S3_COMPATIBILITY_CRITERIA.PROVIDER_REQUIREMENTS[provider].minSuccessRate
      };

    } catch (error) {
      return {
        provider,
        successRate: 0,
        error: error.message,
        meetsCriteria: false
      };
    }
  }

  async testCrossProviderCompatibility(fromProvider, toProvider, baseSessionId) {
    const sessionId = `${baseSessionId}-cross-${fromProvider}-${toProvider}`;
    
    try {
      // Create session in source provider
      let sourceSession;
      if (fromProvider === 'skyvern') {
        sourceSession = await this.s3Manager.skyvernAdapter.createSession(sessionId, { headless: true });
      } else {
        sourceSession = await this.s3Manager.psp.createSession(sessionId, fromProvider, { headless: true });
      }

      await this.addStandardTestData(sourceSession.page);
      await sourceSession.context.close();

      // Transfer via S3
      const transferResult = await this.s3Manager.transferSessionViaS3(sessionId, fromProvider, toProvider, { headless: true });

      // Fixed compatibility score calculation
      const compatibilityScore = this.calculateCompatibilityScore(
        transferResult.uploadResult.sessionPackage.sessionData,
        transferResult.restoreResult.restoredSession
      );

      return {
        fromProvider,
        toProvider,
        compatibilityScore,
        dataPreservation: transferResult.restoreResult.verification,
        meetsCriteria: compatibilityScore >= S3_COMPATIBILITY_CRITERIA.CROSS_PROVIDER.minCompatibilityScore,
        transferSuccess: transferResult.success
      };

    } catch (error) {
      return {
        fromProvider,
        toProvider,
        compatibilityScore: 0,
        error: error.message,
        meetsCriteria: false,
        transferSuccess: false
      };
    }
  }

  async testPerformanceCompliance(baseSessionId) {
    const sessionId = `${baseSessionId}-perf`;
    
    try {
      // Test upload performance
      const session = await this.s3Manager.psp.createSession(sessionId, 'playwright', { headless: true });
      await this.addStandardTestData(session.page);
      await session.context.close();

      const uploadStartTime = Date.now();
      const uploadResult = await this.s3Manager.uploadSession(sessionId, 'playwright');
      const uploadTime = Date.now() - uploadStartTime;

      // Test download performance
      const downloadStartTime = Date.now();
      const downloadResult = await this.s3Manager.downloadSession(uploadResult.s3Key);
      const downloadTime = Date.now() - downloadStartTime;

      // Test restore performance
      const restoreStartTime = Date.now();
      await this.s3Manager.restoreSessionFromS3(uploadResult.s3Key, 'playwright', { headless: true });
      const restoreTime = Date.now() - restoreStartTime;

      return {
        uploadTime,
        downloadTime,
        restoreTime,
        fileSize: JSON.stringify(uploadResult.sessionPackage).length,
        uploadCompliant: uploadTime <= S3_COMPATIBILITY_CRITERIA.PERFORMANCE.maxUploadTimeMs,
        downloadCompliant: downloadTime <= S3_COMPATIBILITY_CRITERIA.PERFORMANCE.maxDownloadTimeMs,
        restoreCompliant: restoreTime <= S3_COMPATIBILITY_CRITERIA.PERFORMANCE.maxRestoreTimeMs,
        sizeCompliant: JSON.stringify(uploadResult.sessionPackage).length <= S3_COMPATIBILITY_CRITERIA.PERFORMANCE.maxS3FileSize
      };

    } catch (error) {
      return {
        error: error.message,
        uploadCompliant: false,
        downloadCompliant: false,
        restoreCompliant: false,
        sizeCompliant: false
      };
    }
  }

  async addStandardTestData(page) {
    await page.goto('https://httpbin.org/cookies/set/s3_test/compatibility_verification');
    await page.evaluate(() => {
      localStorage.setItem('s3-compatibility-test', JSON.stringify({
        timestamp: new Date().toISOString(),
        testData: 'compatibility-verification',
        features: ['cookies', 'localStorage', 'sessionStorage']
      }));
      sessionStorage.setItem('s3-session-test', 'cross-provider-compatibility');
    });
  }

  calculateCompatibilityScore(originalData, restoredData) {
    const weights = {
      cookies: 0.3,
      localStorage: 0.3,
      sessionStorage: 0.2,
      url: 0.2
    };

    let score = 0;

    // Cookies compatibility
    if (this.compareCookies(originalData.cookies, restoredData.cookies)) {
      score += weights.cookies * 100;
    }

    // LocalStorage compatibility
    if (this.compareStorage(originalData.localStorage, restoredData.localStorage)) {
      score += weights.localStorage * 100;
    }

    // SessionStorage compatibility
    if (this.compareStorage(originalData.sessionStorage, restoredData.sessionStorage)) {
      score += weights.sessionStorage * 100;
    }

    // URL compatibility
    if (originalData.url === restoredData.url) {
      score += weights.url * 100;
    }

    return Math.round(score);
  }

  compareCookies(original, restored) {
    if (!original || !restored) return false;
    const originalNames = original.map(c => c.name).sort();
    const restoredNames = restored.map(c => c.name).sort();
    return JSON.stringify(originalNames) === JSON.stringify(restoredNames);
  }

  compareStorage(original, restored) {
    if (!original || !restored) return false;
    return JSON.stringify(original) === JSON.stringify(restored);
  }

  evaluateDataIntegrity(verification) {
    const integrity = {
      cookiesIntegrity: verification.cookies_match ? 100 : 0,
      localStorageIntegrity: verification.localStorage_match ? 100 : 0,
      sessionStorageIntegrity: verification.sessionStorage_match ? 100 : 0,
      urlIntegrity: verification.url_match ? 100 : 0
    };

    const avgIntegrity = Object.values(integrity).reduce((a, b) => a + b, 0) / Object.keys(integrity).length;
    
    return {
      ...integrity,
      averageIntegrity: avgIntegrity,
      meetsCriteria: avgIntegrity >= 80
    };
  }

  evaluatePerformanceCompliance(performanceResult) {
    return performanceResult.uploadCompliant &&
           performanceResult.downloadCompliant &&
           performanceResult.restoreCompliant &&
           performanceResult.sizeCompliant;
  }

  calculateOverallCompatibility(results) {
    const failures = [];
    let totalScore = 0;
    let scoreComponents = 0;

    // Provider tests (40% weight)
    const providerPasses = Object.values(results.providerTests).filter(r => r.meetsCriteria).length;
    const providerScore = (providerPasses / Object.keys(results.providerTests).length) * 100;
    totalScore += providerScore * 0.4;
    scoreComponents++;

    if (providerPasses < Object.keys(results.providerTests).length) {
      failures.push(`${Object.keys(results.providerTests).length - providerPasses} provider(s) failed compatibility`);
    }

    // Cross-provider tests (40% weight)
    const crossProviderPasses = Object.values(results.crossProviderTests).filter(r => r.meetsCriteria).length;
    const crossProviderScore = crossProviderPasses > 0 ? 
      (crossProviderPasses / Object.keys(results.crossProviderTests).length) * 100 : 0;
    totalScore += crossProviderScore * 0.4;
    scoreComponents++;

    if (crossProviderPasses < Object.keys(results.crossProviderTests).length) {
      failures.push(`${Object.keys(results.crossProviderTests).length - crossProviderPasses} cross-provider transfer(s) failed`);
    }

    // Performance tests (20% weight)
    const performancePassed = this.evaluatePerformanceCompliance(results.performanceTests);
    totalScore += (performancePassed ? 100 : 0) * 0.2;
    scoreComponents++;

    if (!performancePassed) {
      failures.push('Performance requirements not met');
    }

    const finalScore = totalScore / scoreComponents;
    const passed = finalScore >= S3_COMPATIBILITY_CRITERIA.MINIMUM_SUCCESS_RATE && failures.length === 0;

    return {
      score: finalScore,
      passed,
      details: {
        providerScore,
        crossProviderScore,
        performancePassed,
        failures
      }
    };
  }
}

// Run compatibility verification
async function verifyS3Compatibility() {
  const verifier = new S3CompatibilityVerifier();
  await verifier.initialize();
  
  const results = await verifier.runComprehensiveTest();
  
  // Save results
  const fs = require('fs').promises;
  await fs.writeFile(
    './s3-compatibility-report.json',
    JSON.stringify(results, null, 2)
  );
  
  console.log('\n📄 Detailed report saved to: s3-compatibility-report.json');
  
  return results;
}

if (require.main === module) {
  verifyS3Compatibility().catch(console.error);
}

module.exports = { 
  S3_COMPATIBILITY_CRITERIA, 
  S3CompatibilityVerifier,
  verifyS3Compatibility
};