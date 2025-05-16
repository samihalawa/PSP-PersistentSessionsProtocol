/**
 * Cloudflare Worker Configuration
 * 
 * This file contains configuration settings for the PSP storage worker.
 * Settings can be controlled via environment variables in Cloudflare.
 */

export interface WorkerConfig {
  /** Maximum size in KB before using R2 instead of KV */
  maxKvSizeKb: number;
  
  /** Whether to enable CORS for all requests */
  enableCors: boolean;
  
  /** Default session expiration in seconds (0 = no expiration) */
  defaultExpiration: number;
  
  /** Whether to log detailed debug information */
  debug: boolean;
}

/**
 * Parse environment variables into typed configuration
 */
export function getConfig(env: any): WorkerConfig {
  return {
    // Maximum KV size before using R2 (default: 128KB)
    maxKvSizeKb: parseInt(env.MAX_KV_SIZE_KB || '128'),
    
    // CORS settings
    enableCors: (env.ENABLE_CORS || 'true').toLowerCase() === 'true',
    
    // Default expiration (0 = never expire)
    defaultExpiration: parseInt(env.DEFAULT_EXPIRATION || '0'),
    
    // Debug mode
    debug: (env.DEBUG || 'false').toLowerCase() === 'true'
  };
}

/**
 * Validate API key against configured keys
 */
export function isValidApiKey(apiKey: string, configuredKeys?: string): boolean {
  // If no API keys are configured, all requests are allowed
  if (!configuredKeys || configuredKeys.trim() === '') {
    return true;
  }
  
  // Check against the list of configured keys
  const keys = configuredKeys.split(',').map(key => key.trim());
  return keys.includes(apiKey);
}

/**
 * Get CORS headers for response
 */
export function getCORSHeaders(request: Request, enableCors: boolean = true): HeadersInit {
  if (!enableCors) {
    return {};
  }
  
  return {
    'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Build a standardized error response
 */
export function errorResponse(
  message: string, 
  status: number = 500, 
  corsHeaders: HeadersInit = {}
): Response {
  return new Response(
    JSON.stringify({
      error: message,
      status,
      time: new Date().toISOString()
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    }
  );
}