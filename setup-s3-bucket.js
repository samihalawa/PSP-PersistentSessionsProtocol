#!/usr/bin/env node

const AWS = require('aws-sdk');
require('dotenv').config();

/**
 * Setup S3 Bucket for PSP Sessions
 * Creates the necessary bucket in Cloudflare R2 for PSP session storage
 */

async function setupS3Bucket() {
  const s3 = new AWS.S3({
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
    signatureVersion: 'v4',
    region: 'auto',
    s3ForcePathStyle: true
  });

  const bucketName = process.env.S3_BUCKET_NAME || 'psp-sessions';

  try {
    console.log('🪣 Setting up S3 bucket for PSP sessions...');
    console.log(`  📍 Endpoint: ${process.env.CLOUDFLARE_R2_ENDPOINT}`);
    console.log(`  🪣 Bucket name: ${bucketName}`);

    // Check if bucket exists
    try {
      await s3.headBucket({ Bucket: bucketName }).promise();
      console.log('  ✅ Bucket already exists');
    } catch (error) {
      if (error.statusCode === 404) {
        console.log('  📝 Creating new bucket...');
        
        // Create bucket
        await s3.createBucket({ 
          Bucket: bucketName,
          CreateBucketConfiguration: {
            LocationConstraint: 'us-east-1' // R2 uses us-east-1 as default
          }
        }).promise();
        
        console.log('  ✅ Bucket created successfully');
      } else {
        throw error;
      }
    }

    // Set bucket policy for PSP session access
    const bucketPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PSPSessionAccess',
          Effect: 'Allow',
          Principal: '*',
          Action: [
            's3:GetObject',
            's3:PutObject',
            's3:DeleteObject',
            's3:ListBucket'
          ],
          Resource: [
            `arn:aws:s3:::${bucketName}`,
            `arn:aws:s3:::${bucketName}/*`
          ]
        }
      ]
    };

    try {
      await s3.putBucketPolicy({
        Bucket: bucketName,
        Policy: JSON.stringify(bucketPolicy)
      }).promise();
      console.log('  ✅ Bucket policy configured');
    } catch (policyError) {
      console.log('  ⚠️ Bucket policy setup skipped (may not be needed for R2)');
    }

    // Test bucket access
    console.log('  🧪 Testing bucket access...');
    
    const testKey = 'test/psp-setup-test.json';
    const testData = {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'PSP S3 setup test'
    };

    // Upload test file
    await s3.upload({
      Bucket: bucketName,
      Key: testKey,
      Body: JSON.stringify(testData),
      ContentType: 'application/json'
    }).promise();

    console.log('  ✅ Test upload successful');

    // Download test file
    const downloadResult = await s3.getObject({
      Bucket: bucketName,
      Key: testKey
    }).promise();

    const downloadedData = JSON.parse(downloadResult.Body.toString());
    console.log('  ✅ Test download successful');

    // Clean up test file
    await s3.deleteObject({
      Bucket: bucketName,
      Key: testKey
    }).promise();

    console.log('  ✅ Test cleanup completed');

    console.log('\n🎉 S3 bucket setup completed successfully!');
    console.log('  📍 PSP sessions can now be stored remotely');
    console.log('  🔄 Cross-machine session sharing enabled');

    return { success: true, bucketName, endpoint: process.env.CLOUDFLARE_R2_ENDPOINT };

  } catch (error) {
    console.error('❌ S3 bucket setup failed:', error.message);
    console.error('  🔍 Check your Cloudflare R2 credentials and endpoint');
    throw error;
  }
}

if (require.main === module) {
  setupS3Bucket().catch(console.error);
}

module.exports = { setupS3Bucket };