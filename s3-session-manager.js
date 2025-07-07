#!/usr/bin/env node

const AWS = require('aws-sdk');
const fs = require('fs').promises;
const path = require('path');
const { ProductionPSP } = require('./production-psp-implementation');
const { SkyvernPSPAdapter } = require('./skyvern-psp-adapter');

/**
 * S3 Session Manager - Remote PSP Session Storage
 * 
 * Manages PSP sessions in Cloudflare R2 (S3-compatible) storage
 * Enables cross-machine session sharing and backup/restore capabilities
 */

class S3SessionManager {
  constructor(options = {}) {
    // Cloudflare R2 configuration
    this.s3 = new AWS.S3({
      endpoint: options.endpoint || process.env.CLOUDFLARE_R2_ENDPOINT || 'https://21d8251b2204f8dfa7df681246d76705.r2.cloudflarestorage.com',
      accessKeyId: options.accessKeyId || process.env.CLOUDFLARE_ACCESS_KEY_ID,
      secretAccessKey: options.secretAccessKey || process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
      signatureVersion: 'v4',
      region: 'auto', // Cloudflare R2 uses 'auto'
      s3ForcePathStyle: true
    });

    this.bucketName = options.bucketName || process.env.S3_BUCKET_NAME || 'psp-sessions';
    this.localSessionDir = options.localSessionDir || './psp-sessions';
    
    // Initialize PSP providers
    this.psp = new ProductionPSP({ sessionDir: this.localSessionDir });
    this.skyvernAdapter = new SkyvernPSPAdapter({ sessionDir: path.join(this.localSessionDir, 'skyvern') });
  }

  async initialize() {
    await this.psp.initialize();
    await this.skyvernAdapter.initialize();
    
    console.log('☁️ S3 Session Manager initialized');
    console.log(`  📡 Endpoint: ${this.s3.endpoint.href}`);
    console.log(`  🪣 Bucket: ${this.bucketName}`);
  }

  /**
   * Upload PSP session to S3/R2
   */
  async uploadSession(sessionId, provider = 'playwright', metadata = {}) {
    try {
      console.log(`☁️ Uploading session ${sessionId} to S3...`);

      // Capture current session data
      const sessionData = provider === 'skyvern' 
        ? await this.skyvernAdapter.captureSession(sessionId)
        : await this.psp.captureSession(sessionId, provider);

      // Create comprehensive S3 session package
      const s3SessionPackage = {
        sessionId,
        provider,
        uploadTime: new Date().toISOString(),
        metadata: {
          platform: process.platform,
          nodeVersion: process.version,
          uploadLocation: process.cwd(),
          ...metadata
        },
        pspFormat: provider === 'skyvern' 
          ? this.skyvernAdapter.convertToPSPFormat(sessionData, 'skyvern')
          : this.psp.convertToPSPFormat(sessionData, provider),
        sessionData,
        
        // Session validation data
        validation: {
          cookieCount: sessionData.cookies?.length || 0,
          localStorageKeys: Object.keys(sessionData.localStorage || {}),
          sessionStorageKeys: Object.keys(sessionData.sessionStorage || {}),
          hasUrl: !!sessionData.url,
          hasUserAgent: !!sessionData.userAgent
        }
      };

      // Upload to S3
      const s3Key = `sessions/${provider}/${sessionId}/${Date.now()}.json`;
      
      const uploadParams = {
        Bucket: this.bucketName,
        Key: s3Key,
        Body: JSON.stringify(s3SessionPackage, null, 2),
        ContentType: 'application/json',
        Metadata: {
          'session-id': sessionId,
          'provider': provider,
          'upload-time': new Date().toISOString(),
          'psp-version': '1.0'
        }
      };

      const result = await this.s3.upload(uploadParams).promise();
      
      console.log(`  ✅ Session uploaded successfully`);
      console.log(`  📍 S3 Location: ${result.Location}`);
      console.log(`  🔑 S3 Key: ${s3Key}`);
      console.log(`  📊 Data size: ${JSON.stringify(s3SessionPackage).length} bytes`);

      return {
        success: true,
        s3Location: result.Location,
        s3Key,
        sessionPackage: s3SessionPackage,
        uploadMetadata: result
      };

    } catch (error) {
      console.error(`❌ Session upload failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Download PSP session from S3/R2
   */
  async downloadSession(s3Key, targetProvider = 'playwright') {
    try {
      console.log(`☁️ Downloading session from S3: ${s3Key}`);

      const downloadParams = {
        Bucket: this.bucketName,
        Key: s3Key
      };

      const result = await this.s3.getObject(downloadParams).promise();
      const s3SessionPackage = JSON.parse(result.Body.toString());

      console.log(`  ✅ Session downloaded successfully`);
      console.log(`  📅 Original upload: ${s3SessionPackage.uploadTime}`);
      console.log(`  🔧 Original provider: ${s3SessionPackage.provider}`);
      console.log(`  🎯 Target provider: ${targetProvider}`);

      // Validate session integrity
      const validation = this.validateSessionIntegrity(s3SessionPackage);
      if (!validation.isValid) {
        throw new Error(`Session validation failed: ${validation.errors.join(', ')}`);
      }

      return {
        success: true,
        sessionPackage: s3SessionPackage,
        validation,
        downloadMetadata: {
          lastModified: result.LastModified,
          contentLength: result.ContentLength,
          etag: result.ETag
        }
      };

    } catch (error) {
      console.error(`❌ Session download failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Restore session from S3 to local provider
   */
  async restoreSessionFromS3(s3Key, targetProvider = 'playwright', options = {}) {
    try {
      console.log(`🔄 Restoring session from S3 to ${targetProvider}...`);

      // Download session from S3
      const downloadResult = await this.downloadSession(s3Key, targetProvider);
      const sessionPackage = downloadResult.sessionPackage;

      // Generate new local session ID
      const localSessionId = `s3-restore-${sessionPackage.sessionId}-${Date.now()}`;
      const sessionPath = path.join(this.localSessionDir, localSessionId);

      // Restore based on target provider
      let restoredSession;
      
      if (targetProvider === 'skyvern') {
        restoredSession = await this.skyvernAdapter.restoreSession(
          sessionPath, 
          sessionPackage.pspFormat, 
          options
        );
      } else {
        const targetProviderInstance = this.psp.providers[targetProvider];
        if (!targetProviderInstance) {
          throw new Error(`Provider ${targetProvider} not supported`);
        }
        
        restoredSession = await targetProviderInstance.restoreSession(
          sessionPath,
          sessionPackage.pspFormat,
          options
        );
      }

      // Verify restoration
      const verification = await this.verifyS3SessionRestore(
        sessionPackage.sessionData,
        restoredSession
      );

      console.log(`  ✅ Session restored successfully`);
      console.log(`  🆔 Local session ID: ${localSessionId}`);
      console.log(`  🎯 Restoration success rate: ${Math.round(verification.successRate)}%`);

      return {
        localSessionId,
        restoredSession,
        verification,
        originalPackage: sessionPackage
      };

    } catch (error) {
      console.error(`❌ Session restoration failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * List all sessions in S3
   */
  async listS3Sessions(provider = null) {
    try {
      const prefix = provider ? `sessions/${provider}/` : 'sessions/';
      
      const listParams = {
        Bucket: this.bucketName,
        Prefix: prefix,
        MaxKeys: 1000
      };

      const result = await this.s3.listObjectsV2(listParams).promise();
      
      const sessions = result.Contents.map(obj => ({
        key: obj.Key,
        lastModified: obj.LastModified,
        size: obj.Size,
        etag: obj.ETag,
        provider: obj.Key.split('/')[1],
        sessionId: obj.Key.split('/')[2]
      }));

      console.log(`📋 Found ${sessions.length} sessions in S3`);
      if (provider) {
        console.log(`  🔧 Filtered by provider: ${provider}`);
      }

      return sessions;

    } catch (error) {
      console.error(`❌ Failed to list S3 sessions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cross-provider session transfer via S3
   */
  async transferSessionViaS3(sessionId, fromProvider, toProvider, options = {}) {
    try {
      console.log(`🌐 Cross-provider transfer via S3: ${fromProvider} → ${toProvider}`);

      // Step 1: Upload current session to S3
      const uploadResult = await this.uploadSession(sessionId, fromProvider, {
        transferSource: fromProvider,
        transferTarget: toProvider,
        transferInitiated: new Date().toISOString()
      });

      // Step 2: Download and restore to target provider
      const restoreResult = await this.restoreSessionFromS3(
        uploadResult.s3Key,
        toProvider,
        options
      );

      // Step 3: Verify cross-provider compatibility
      const crossProviderVerification = await this.verifyCrossProviderCompatibility(
        uploadResult.sessionPackage,
        restoreResult.restoredSession
      );

      console.log(`  ✅ Cross-provider transfer completed`);
      console.log(`  📊 Compatibility score: ${Math.round(crossProviderVerification.compatibilityScore)}%`);

      return {
        transferId: `transfer-${Date.now()}`,
        uploadResult,
        restoreResult,
        crossProviderVerification,
        success: crossProviderVerification.compatibilityScore >= 80
      };

    } catch (error) {
      console.error(`❌ Cross-provider transfer failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate session integrity
   */
  validateSessionIntegrity(sessionPackage) {
    const errors = [];
    const checks = {
      hasSessionId: !!sessionPackage.sessionId,
      hasProvider: !!sessionPackage.provider,
      hasPSPFormat: !!sessionPackage.pspFormat,
      hasSessionData: !!sessionPackage.sessionData,
      hasValidation: !!sessionPackage.validation
    };

    Object.entries(checks).forEach(([check, passed]) => {
      if (!passed) {
        errors.push(`Missing ${check.replace('has', '').toLowerCase()}`);
      }
    });

    // Additional validation
    if (sessionPackage.pspFormat) {
      if (!sessionPackage.pspFormat.version) {
        errors.push('Missing PSP format version');
      }
      if (!sessionPackage.pspFormat.sessionData) {
        errors.push('Missing PSP session data');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      checks,
      validationScore: Object.values(checks).filter(Boolean).length / Object.keys(checks).length * 100
    };
  }

  /**
   * Verify S3 session restoration
   */
  async verifyS3SessionRestore(original, restored) {
    const verification = {
      cookies_match: this.compareCookies(original.cookies, restored.cookies),
      localStorage_match: this.compareStorage(original.localStorage, restored.localStorage),
      sessionStorage_match: this.compareStorage(original.sessionStorage, restored.sessionStorage),
      url_match: original.url === restored.url,
      userAgent_match: original.userAgent === restored.userAgent
    };

    const successCount = Object.values(verification).filter(Boolean).length;
    const successRate = (successCount / Object.keys(verification).length) * 100;

    return { ...verification, successRate };
  }

  /**
   * Verify cross-provider compatibility
   */
  async verifyCrossProviderCompatibility(originalPackage, restoredSession) {
    const compatibility = {
      data_preservation: this.verifyS3SessionRestore(originalPackage.sessionData, restoredSession),
      provider_compatibility: originalPackage.provider !== restoredSession.provider,
      metadata_integrity: !!originalPackage.metadata && !!originalPackage.pspFormat,
      validation_passed: originalPackage.validation && Object.keys(originalPackage.validation).length > 0
    };

    const compatibilityScore = (
      compatibility.data_preservation.successRate * 0.6 +  // 60% weight on data
      (compatibility.provider_compatibility ? 100 : 0) * 0.2 +  // 20% weight on provider switch
      (compatibility.metadata_integrity ? 100 : 0) * 0.1 +  // 10% weight on metadata
      (compatibility.validation_passed ? 100 : 0) * 0.1   // 10% weight on validation
    );

    return {
      ...compatibility,
      compatibilityScore
    };
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
}

// S3 Session Compatibility Criteria
const S3_SESSION_COMPATIBILITY_CRITERIA = {
  // Minimum requirements for successful S3 session retrieval
  MINIMUM_SUCCESS_RATE: 80,
  
  // Required data preservation
  REQUIRED_PRESERVATION: [
    'cookies_match',
    'localStorage_match', 
    'url_match'
  ],
  
  // Cross-provider compatibility thresholds
  CROSS_PROVIDER_MINIMUM: 70,
  SAME_PROVIDER_MINIMUM: 95,
  
  // Data integrity checks
  INTEGRITY_CHECKS: [
    'hasSessionId',
    'hasProvider', 
    'hasPSPFormat',
    'hasSessionData'
  ],
  
  // Performance criteria
  MAX_DOWNLOAD_TIME_MS: 30000,
  MAX_RESTORE_TIME_MS: 60000
};

// Test S3 integration across all providers
async function testS3Integration() {
  console.log('☁️ S3 Session Manager Integration Test');
  console.log('=====================================');

  const s3Manager = new S3SessionManager();
  await s3Manager.initialize();

  const testSessionId = `s3-integration-test-${Date.now()}`;

  try {
    // Test with multiple providers
    const providers = ['playwright', 'browser-use', 'skyvern'];
    const results = {};

    for (const provider of providers) {
      console.log(`\n🧪 Testing ${provider} integration...`);

      // Create session
      let session;
      if (provider === 'skyvern') {
        session = await s3Manager.skyvernAdapter.createSession(`${testSessionId}-${provider}`, { headless: false });
      } else {
        session = await s3Manager.psp.createSession(`${testSessionId}-${provider}`, provider, { headless: false });
      }

      // Add test data
      await session.page.goto('https://httpbin.org/cookies/set/s3_test/working');
      await session.page.evaluate(() => {
        localStorage.setItem('s3-test', JSON.stringify({
          provider: window.location.hostname,
          timestamp: new Date().toISOString(),
          testData: 's3-integration-working'
        }));
      });

      await session.context.close();

      // Upload to S3
      const uploadResult = await s3Manager.uploadSession(`${testSessionId}-${provider}`, provider, {
        testRun: true,
        provider: provider
      });

      // Download and restore
      const restoreResult = await s3Manager.restoreSessionFromS3(
        uploadResult.s3Key,
        provider,
        { headless: false }
      );

      results[provider] = {
        upload: uploadResult.success,
        download: restoreResult.verification.successRate >= S3_SESSION_COMPATIBILITY_CRITERIA.MINIMUM_SUCCESS_RATE,
        successRate: restoreResult.verification.successRate
      };

      console.log(`  ✅ ${provider}: ${Math.round(restoreResult.verification.successRate)}% success rate`);
    }

    // Test cross-provider transfers
    console.log('\n🔄 Testing cross-provider transfers via S3...');
    
    const transferResult = await s3Manager.transferSessionViaS3(
      `${testSessionId}-playwright`,
      'playwright',
      'browser-use',
      { headless: false }
    );

    results.crossProvider = {
      success: transferResult.success,
      compatibilityScore: transferResult.crossProviderVerification.compatibilityScore
    };

    // Final assessment
    console.log('\n📊 S3 Integration Assessment:');
    console.log('============================');
    
    Object.entries(results).forEach(([test, result]) => {
      if (test === 'crossProvider') {
        const status = result.success ? '✅' : '❌';
        console.log(`  ${status} Cross-provider transfer: ${Math.round(result.compatibilityScore)}%`);
      } else {
        const status = result.download ? '✅' : '❌';
        console.log(`  ${status} ${test}: ${Math.round(result.successRate)}%`);
      }
    });

    const overallSuccess = Object.values(results).every(r => 
      r.download !== undefined ? r.download : r.success
    );

    if (overallSuccess) {
      console.log('\n🎉 S3 integration is WORKING across all providers!');
    } else {
      console.log('\n⚠️ S3 integration has some issues - check individual results');
    }

    return results;

  } catch (error) {
    console.error('❌ S3 integration test failed:', error.message);
    throw error;
  }
}

if (require.main === module) {
  testS3Integration().catch(console.error);
}

module.exports = { 
  S3SessionManager, 
  S3_SESSION_COMPATIBILITY_CRITERIA,
  testS3Integration 
};