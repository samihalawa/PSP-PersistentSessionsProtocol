/**
 * PSP Simple UI Configuration
 *
 * This file contains configuration settings for the PSP Simple UI.
 * You can replace these values directly or set environment variables.
 */

// Supabase configuration for authentication
const SUPABASE_CONFIG = {
  // Priority order: Environment variable > localStorage > hardcoded default
  url: process.env.PSP_SUPABASE_URL ||
       localStorage.getItem('psp-supabase-url') ||
       'https://your-supabase-project.supabase.co',

  key: process.env.PSP_SUPABASE_KEY ||
       localStorage.getItem('psp-supabase-key') ||
       'your-supabase-anon-key',
};

// API endpoint for session storage (Cloudflare Worker or other API)
const DEFAULT_API_ENDPOINT = process.env.PSP_API_ENDPOINT ||
                            localStorage.getItem('psp-api-endpoint') ||
                            'https://psp-worker.your-domain.workers.dev';

// Optional API key for secured endpoints
const DEFAULT_API_KEY = process.env.PSP_API_KEY ||
                       localStorage.getItem('psp-api-key') ||
                       '';

// Additional configuration options
const CONFIG = {
  // Feature flags
  features: {
    captureCurrentTab: true,     // Enable/disable current tab capture
    fileUpload: true,            // Enable/disable file upload for sessions
    urlCapture: false,           // Enable/disable URL capture (requires extension)
    sharing: true,               // Enable/disable session sharing
    cloudStorage: true           // Enable/disable cloud storage options
  },

  // UI customization
  ui: {
    theme: localStorage.getItem('psp-ui-theme') || 'light',  // 'light' or 'dark'
    logoUrl: '',                                             // Custom logo URL
    primaryColor: '#3498db',                                 // Primary color
    title: 'PSP Session Manager'                             // App title
  }
};

// Export configuration
export { SUPABASE_CONFIG, DEFAULT_API_ENDPOINT, DEFAULT_API_KEY, CONFIG };