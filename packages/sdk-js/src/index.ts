import axios, { AxiosInstance } from 'axios';
import { EventEmitter } from 'eventemitter3';

/**
 * PSP JavaScript SDK
 * 
 * Client library for integrating with PSP (Persistent Sessions Protocol)
 * Works in both Node.js and browser environments
 */

export interface PSPConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}

export interface SessionData {
  id: string;
  name: string;
  url: string;
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires?: number;
  }>;
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  metadata: {
    createdAt: string;
    updatedAt: string;
    userAgent?: string;
    platform?: string;
  };
}

export interface CreateSessionOptions {
  name: string;
  url: string;
  autoCapture?: boolean;
  tags?: string[];
}

export interface SessionFilter {
  tags?: string[];
  url?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export class PSPClient extends EventEmitter {
  private http: AxiosInstance;
  private config: PSPConfig;

  constructor(config: PSPConfig) {
    super();
    this.config = config;
    
    this.http = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` })
      }
    });

    this.setupInterceptors();
  }

  /**
   * Create a new session
   */
  async createSession(options: CreateSessionOptions): Promise<SessionData> {
    this.emit('session:creating', options);
    
    try {
      const response = await this.http.post('/sessions', options);
      const session = response.data;
      
      this.emit('session:created', session);
      return session;
    } catch (error) {
      this.emit('session:error', error);
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<SessionData> {
    try {
      const response = await this.http.get(`/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      this.emit('session:error', error);
      throw error;
    }
  }

  /**
   * List sessions with optional filtering
   */
  async listSessions(filter: SessionFilter = {}): Promise<SessionData[]> {
    try {
      const response = await this.http.get('/sessions', { params: filter });
      return response.data;
    } catch (error) {
      this.emit('session:error', error);
      throw error;
    }
  }

  /**
   * Update session data
   */
  async updateSession(sessionId: string, updates: Partial<SessionData>): Promise<SessionData> {
    this.emit('session:updating', { sessionId, updates });
    
    try {
      const response = await this.http.put(`/sessions/${sessionId}`, updates);
      const session = response.data;
      
      this.emit('session:updated', session);
      return session;
    } catch (error) {
      this.emit('session:error', error);
      throw error;
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    this.emit('session:deleting', { sessionId });
    
    try {
      await this.http.delete(`/sessions/${sessionId}`);
      this.emit('session:deleted', { sessionId });
    } catch (error) {
      this.emit('session:error', error);
      throw error;
    }
  }

  /**
   * Restore session in current browser context
   * (Browser-only functionality)
   */
  async restoreSession(sessionId: string): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('restoreSession is only available in browser environments');
    }

    const session = await this.getSession(sessionId);
    
    // Restore cookies
    for (const cookie of session.cookies) {
      document.cookie = `${cookie.name}=${cookie.value}; domain=${cookie.domain}; path=${cookie.path}`;
    }

    // Restore localStorage
    for (const [key, value] of Object.entries(session.localStorage)) {
      window.localStorage.setItem(key, value);
    }

    // Restore sessionStorage
    for (const [key, value] of Object.entries(session.sessionStorage)) {
      window.sessionStorage.setItem(key, value);
    }

    this.emit('session:restored', session);
  }

  /**
   * Capture current session from browser
   * (Browser-only functionality)
   */
  async captureSession(options: CreateSessionOptions): Promise<SessionData> {
    if (typeof window === 'undefined') {
      throw new Error('captureSession is only available in browser environments');
    }

    // Capture current browser state
    const cookies = this.getCookies();
    const localStorage = this.getLocalStorage();
    const sessionStorage = this.getSessionStorage();

    const sessionData = {
      ...options,
      cookies,
      localStorage,
      sessionStorage,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
        platform: navigator.platform
      }
    };

    return this.createSession(sessionData);
  }

  /**
   * Set up request/response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.http.interceptors.request.use(
      (config) => {
        this.emit('request:start', config);
        return config;
      },
      (error) => {
        this.emit('request:error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.http.interceptors.response.use(
      (response) => {
        this.emit('response:success', response);
        return response;
      },
      (error) => {
        this.emit('response:error', error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get all cookies from current domain
   */
  private getCookies() {
    const cookies: Array<any> = [];
    if (typeof document !== 'undefined') {
      document.cookie.split(';').forEach(cookie => {
        const [name, ...rest] = cookie.trim().split('=');
        if (name) {
          cookies.push({
            name,
            value: rest.join('='),
            domain: window.location.hostname,
            path: '/'
          });
        }
      });
    }
    return cookies;
  }

  /**
   * Get all localStorage items
   */
  private getLocalStorage(): Record<string, string> {
    const storage: Record<string, string> = {};
    if (typeof window !== 'undefined' && window.localStorage) {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          storage[key] = window.localStorage.getItem(key) || '';
        }
      }
    }
    return storage;
  }

  /**
   * Get all sessionStorage items
   */
  private getSessionStorage(): Record<string, string> {
    const storage: Record<string, string> = {};
    if (typeof window !== 'undefined' && window.sessionStorage) {
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key) {
          storage[key] = window.sessionStorage.getItem(key) || '';
        }
      }
    }
    return storage;
  }
}

// Default export for easy import
export default PSPClient;

// Browser global
if (typeof window !== 'undefined') {
  (window as any).PSPClient = PSPClient;
}