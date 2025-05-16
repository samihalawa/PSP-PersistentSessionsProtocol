/**
 * Persistent Sessions Protocol (PSP) Configuration
 * 
 * This file contains configuration settings for the PSP demos.
 * Edit this file to match your environment setup.
 */

module.exports = {
  /**
   * Local Storage Configuration
   */
  local: {
    // Directory to store session files
    storagePath: './sessions'
  },
  
  /**
   * Cloud Storage Configuration (Optional)
   * 
   * Uncomment and configure these sections if you want to use
   * remote storage options.
   */
  
  // Cloudflare Worker Storage
  cloudflare: {
    enabled: false,
    // Worker URL (if using Cloudflare Workers)
    endpoint: 'https://psp-worker.your-domain.workers.dev',
    // Optional API key for secured endpoints
    apiKey: ''
  },
  
  // S3-Compatible Storage
  s3: {
    enabled: false,
    // AWS S3 or compatible service configuration
    region: 'us-east-1',
    bucket: 'your-bucket-name',
    prefix: 'psp-sessions/',
    // Credentials (ideally use environment variables instead)
    // accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    // secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    // Optional endpoint for S3-compatible services like MinIO
    // endpoint: 'https://s3.your-service.com'
  },
  
  // Supabase Storage
  supabase: {
    enabled: false,
    // Supabase project URL
    url: 'https://your-project.supabase.co',
    // Supabase API key (anon key for public operations)
    apiKey: 'your-supabase-api-key',
    // Storage bucket for sessions
    bucket: 'sessions',
    // Optional prefix path in bucket
    prefix: 'browser-sessions/'
  },
  
  /**
   * Browser Configuration
   */
  browser: {
    // Default options for Playwright browser launch
    launchOptions: {
      headless: false,
      slowMo: 0,
      // More options: https://playwright.dev/docs/api/class-browsertype#browser-type-launch
    }
  }
};