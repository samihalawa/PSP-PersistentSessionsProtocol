/**
 * PSP Simple UI Configuration
 * 
 * This file contains configuration settings for the PSP Simple UI.
 * You can replace these values directly or set environment variables.
 */

// Detect if we should use demo mode (no backend servers available)
const detectDemoMode = () => {
  // Auto-detect if we're loaded from file:// or have no configured endpoints
  if (window.location.protocol === 'file:' || 
      (localStorage.getItem('psp-api-endpoint') === null && 
       localStorage.getItem('psp-supabase-url') === null)) {
    return true;
  }
  // Allow explicit enabling via localStorage
  return localStorage.getItem('psp-demo-mode') === 'true';
};

// Use demo mode when no backends are configured
const DEMO_MODE = detectDemoMode();

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
    urlCapture: DEMO_MODE ? false : true, // Disable in demo mode
    sharing: true,               // Enable/disable session sharing
    cloudStorage: true,          // Enable/disable cloud storage options
    demoMode: DEMO_MODE          // Auto-detected demo mode
  },
  
  // UI customization
  ui: {
    theme: localStorage.getItem('psp-ui-theme') || 'light',  // 'light' or 'dark'
    logoUrl: '',                                 // Custom logo URL
    primaryColor: '#3498db',                     // Primary color
    title: DEMO_MODE ? 'PSP Session Manager (Demo Mode)' : 'PSP Session Manager',
    version: '1.0.0'                             // App version
  }
};

// Mock data for demo mode
if (DEMO_MODE) {
  console.log('Running in demo mode with sample data');
  
  // Sample sessions for demo
  window.MOCK_SESSIONS = [
    {
      id: 'demo1',
      name: 'GitHub Login Session',
      metadata: {
        name: 'GitHub Login Session',
        description: 'Authenticated session for GitHub',
        createdAt: new Date().toISOString(),
        origin: 'https://github.com',
        tags: ['demo', 'github', 'auth']
      }
    },
    {
      id: 'demo2',
      name: 'Gmail Session',
      metadata: {
        name: 'Gmail Session',
        description: 'Authenticated session for Google Mail',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        origin: 'https://mail.google.com',
        tags: ['demo', 'google', 'mail']
      }
    },
    {
      id: 'demo3',
      name: 'Twitter Dashboard',
      metadata: {
        name: 'Twitter Dashboard',
        description: 'Twitter account with dashboard access',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        origin: 'https://twitter.com',
        tags: ['demo', 'twitter', 'social']
      }
    }
  ];
}

// Export configuration
export { SUPABASE_CONFIG, DEFAULT_API_ENDPOINT, DEFAULT_API_KEY, CONFIG, DEMO_MODE };