/**
 * PSP Session Blob Schema
 * 
 * Defines the standardized structure for PSP session data with validation,
 * versioning, and TTL support as specified in Phase 1.3.1
 */

const Ajv = require('ajv');
const addFormats = require('ajv-formats');

/**
 * PSP Session Schema v1.0
 * JSON Schema definition for PSP session blobs
 */
const PSP_SESSION_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://psp.protocol/schemas/session/v1.0.json',
  title: 'PSP Session Blob',
  type: 'object',
  required: ['version', 'sessionId', 'timestamp', 'sessionData', 'metadata'],
  
  properties: {
    // Core session identification
    version: {
      type: 'string',
      pattern: '^\\d+\\.\\d+(\\.\\d+)?$',
      description: 'PSP schema version (semver)'
    },
    
    sessionId: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
      description: 'Unique session identifier'
    },
    
    timestamp: {
      type: 'string',
      format: 'date-time',
      description: 'Session creation timestamp (ISO 8601)'
    },
    
    // TTL and expiration
    ttl: {
      type: 'object',
      properties: {
        globalTtl: {
          type: 'integer',
          minimum: 0,
          description: 'Global TTL in seconds, 0 = no expiration'
        },
        fieldTtl: {
          type: 'object',
          patternProperties: {
            '^[a-zA-Z0-9_.-]+$': {
              type: 'integer',
              minimum: 0
            }
          },
          description: 'Per-field TTL overrides'
        },
        expiresAt: {
          type: 'string',
          format: 'date-time',
          description: 'Absolute expiration timestamp'
        }
      }
    },
    
    // Core session data
    sessionData: {
      type: 'object',
      required: ['provider'],
      properties: {
        provider: {
          type: 'string',
          enum: ['playwright', 'puppeteer', 'selenium', 'browser-use', 'skyvern', 'custom'],
          description: 'Source automation provider'
        },
        
        // Browser state
        cookies: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'value', 'domain'],
            properties: {
              name: { type: 'string' },
              value: { type: 'string' },
              domain: { type: 'string' },
              path: { type: 'string' },
              expires: { type: 'number' },
              httpOnly: { type: 'boolean' },
              secure: { type: 'boolean' },
              sameSite: { type: 'string', enum: ['Strict', 'Lax', 'None'] }
            }
          }
        },
        
        localStorage: {
          type: 'object',
          patternProperties: {
            '^.*$': { type: 'string' }
          }
        },
        
        sessionStorage: {
          type: 'object',
          patternProperties: {
            '^.*$': { type: 'string' }
          }
        },
        
        // Navigation state
        url: {
          type: 'string',
          format: 'uri',
          description: 'Current page URL'
        },
        
        userAgent: {
          type: 'string',
          description: 'Browser user agent string'
        },
        
        viewport: {
          type: 'object',
          properties: {
            width: { type: 'integer', minimum: 1 },
            height: { type: 'integer', minimum: 1 }
          }
        },
        
        // Authentication state
        authState: {
          type: 'object',
          properties: {
            tokens: {
              type: 'object',
              patternProperties: {
                '^.*$': { type: 'string' }
              }
            },
            credentials: {
              type: 'object',
              properties: {
                username: { type: 'string' },
                encrypted: { type: 'boolean' }
              }
            }
          }
        }
      }
    },
    
    // Metadata and extensions
    metadata: {
      type: 'object',
      required: ['platform', 'captureMethod'],
      properties: {
        platform: {
          type: 'string',
          description: 'Operating system platform'
        },
        
        captureMethod: {
          type: 'string',
          description: 'Method used to capture session'
        },
        
        compatibility: {
          type: 'array',
          items: { type: 'string' },
          description: 'Compatible providers for this session'
        },
        
        features: {
          type: 'object',
          properties: {
            encryption: { type: 'boolean' },
            compression: { type: 'boolean' },
            aiEnhanced: { type: 'boolean' },
            workflowCapable: { type: 'boolean' }
          }
        },
        
        performance: {
          type: 'object',
          properties: {
            captureTime: { type: 'number' },
            dataSize: { type: 'number' },
            compressionRatio: { type: 'number' }
          }
        }
      }
    },
    
    // Binary data sections (Base64 encoded)
    binaryData: {
      type: 'object',
      properties: {
        screenshots: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              mimeType: { type: 'string' },
              data: { type: 'string', contentEncoding: 'base64' },
              timestamp: { type: 'string', format: 'date-time' }
            }
          }
        },
        
        recordings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              format: { type: 'string', enum: ['har', 'json', 'video'] },
              data: { type: 'string', contentEncoding: 'base64' },
              metadata: { type: 'object' }
            }
          }
        }
      }
    },
    
    // Provider-specific extensions
    extensions: {
      type: 'object',
      patternProperties: {
        '^[a-zA-Z0-9_-]+$': {
          type: 'object',
          description: 'Provider-specific extension data'
        }
      }
    }
  }
};

/**
 * PSP Schema Validator
 */
class PSPSchemaValidator {
  constructor() {
    this.ajv = new Ajv({ 
      allErrors: true, 
      verbose: true,
      strict: false 
    });
    addFormats(this.ajv);
    this.validate = this.ajv.compile(PSP_SESSION_SCHEMA);
  }

  /**
   * Validate PSP session blob against schema
   */
  validateSession(sessionBlob) {
    const isValid = this.validate(sessionBlob);
    
    return {
      valid: isValid,
      errors: this.validate.errors || [],
      schema: PSP_SESSION_SCHEMA.$id
    };
  }

  /**
   * Validate and sanitize session data
   */
  sanitizeSession(sessionBlob) {
    const validation = this.validateSession(sessionBlob);
    
    if (!validation.valid) {
      throw new Error(`PSP session validation failed: ${this.formatErrors(validation.errors)}`);
    }

    // Apply TTL logic
    const sanitized = this.applyTTL(sessionBlob);
    
    // Remove expired fields
    return this.removeExpiredFields(sanitized);
  }

  /**
   * Apply TTL logic to session data
   */
  applyTTL(sessionBlob) {
    const now = Date.now();
    const session = JSON.parse(JSON.stringify(sessionBlob)); // Deep clone

    // Check global expiration
    if (session.ttl?.expiresAt) {
      const expiresAt = new Date(session.ttl.expiresAt).getTime();
      if (now > expiresAt) {
        throw new Error('Session has expired (global TTL)');
      }
    }

    // Check global TTL
    if (session.ttl?.globalTtl) {
      const sessionTime = new Date(session.timestamp).getTime();
      const expiration = sessionTime + (session.ttl.globalTtl * 1000);
      if (now > expiration) {
        throw new Error('Session has expired (global TTL)');
      }
    }

    return session;
  }

  /**
   * Remove expired fields based on field-level TTL
   */
  removeExpiredFields(sessionBlob) {
    if (!sessionBlob.ttl?.fieldTtl) {
      return sessionBlob;
    }

    const now = Date.now();
    const sessionTime = new Date(sessionBlob.timestamp).getTime();
    const session = JSON.parse(JSON.stringify(sessionBlob));

    Object.entries(sessionBlob.ttl.fieldTtl).forEach(([fieldPath, ttl]) => {
      const expiration = sessionTime + (ttl * 1000);
      if (now > expiration) {
        this.deleteNestedField(session, fieldPath);
      }
    });

    return session;
  }

  /**
   * Delete nested field by dot notation path
   */
  deleteNestedField(obj, path) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => current?.[key], obj);
    
    if (target && lastKey) {
      delete target[lastKey];
    }
  }

  /**
   * Format validation errors for human reading
   */
  formatErrors(errors) {
    return errors.map(error => 
      `${error.instancePath || 'root'}: ${error.message}`
    ).join('; ');
  }

  /**
   * Get schema version
   */
  getSchemaVersion() {
    return PSP_SESSION_SCHEMA.$id.split('/').pop().replace('.json', '');
  }
}

/**
 * PSP Session Builder
 * Helper class for creating valid PSP session blobs
 */
class PSPSessionBuilder {
  constructor() {
    this.session = {
      version: '1.0',
      sessionId: '',
      timestamp: new Date().toISOString(),
      sessionData: {
        provider: 'custom'
      },
      metadata: {
        platform: process.platform,
        captureMethod: 'psp-builder'
      }
    };
  }

  sessionId(id) {
    this.session.sessionId = id;
    return this;
  }

  provider(provider) {
    this.session.sessionData.provider = provider;
    return this;
  }

  cookies(cookies) {
    this.session.sessionData.cookies = cookies;
    return this;
  }

  localStorage(data) {
    this.session.sessionData.localStorage = data;
    return this;
  }

  sessionStorage(data) {
    this.session.sessionData.sessionStorage = data;
    return this;
  }

  url(url) {
    this.session.sessionData.url = url;
    return this;
  }

  userAgent(ua) {
    this.session.sessionData.userAgent = ua;
    return this;
  }

  viewport(width, height) {
    this.session.sessionData.viewport = { width, height };
    return this;
  }

  ttl(globalTtl, fieldTtl = {}, expiresAt = null) {
    this.session.ttl = {
      globalTtl,
      fieldTtl
    };
    if (expiresAt) {
      this.session.ttl.expiresAt = expiresAt;
    }
    return this;
  }

  metadata(key, value) {
    this.session.metadata[key] = value;
    return this;
  }

  extension(provider, data) {
    if (!this.session.extensions) {
      this.session.extensions = {};
    }
    this.session.extensions[provider] = data;
    return this;
  }

  build() {
    const validator = new PSPSchemaValidator();
    return validator.sanitizeSession(this.session);
  }
}

module.exports = {
  PSP_SESSION_SCHEMA,
  PSPSchemaValidator,
  PSPSessionBuilder
};