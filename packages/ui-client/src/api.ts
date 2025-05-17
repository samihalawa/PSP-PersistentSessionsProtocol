/**
 * API client for interacting with PSP storage backends
 */

interface SessionMetadata {
  name?: string;
  description?: string;
  origin?: string;
  tags?: string[];
  framework?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  expireAt?: string;
}

interface Session {
  id: string;
  version: string;
  timestamp: number;
  data: any;
  metadata?: SessionMetadata;
}

interface SessionList {
  sessions: Array<{
    id: string;
    metadata?: SessionMetadata;
  }>;
  cursor?: string;
  hasMore: boolean;
}

interface SessionApiOptions {
  /**
   * API endpoint URL
   */
  endpoint: string;
  
  /**
   * API key for authentication
   */
  apiKey?: string;
  
  /**
   * Custom fetch implementation
   */
  fetchFn?: typeof fetch;
  
  /**
   * Whether to automatically retry failed requests
   */
  autoRetry?: boolean;
  
  /**
   * Maximum number of retry attempts
   */
  maxRetries?: number;
  
  /**
   * Timeout for requests in milliseconds
   */
  timeout?: number;
}

/**
 * API client for PSP session management
 */
export class SessionApi {
  private endpoint: string;
  private apiKey?: string;
  private fetchFn: typeof fetch;
  private autoRetry: boolean;
  private maxRetries: number;
  private timeout: number;
  
  /**
   * Create a new API client
   */
  constructor(options: SessionApiOptions) {
    this.endpoint = options.endpoint.endsWith('/')
      ? options.endpoint.slice(0, -1)
      : options.endpoint;
    
    this.apiKey = options.apiKey;
    this.fetchFn = options.fetchFn || fetch;
    this.autoRetry = options.autoRetry || false;
    this.maxRetries = options.maxRetries || 3;
    this.timeout = options.timeout || 30000;
  }
  
  /**
   * Create a new session
   */
  async createSession(data: any, metadata?: SessionMetadata, id?: string): Promise<string> {
    const response = await this.request('/sessions', {
      method: 'POST',
      body: JSON.stringify({
        id,
        data,
        ...metadata
      })
    });
    
    const result = await response.json();
    return result.id;
  }
  
  /**
   * Get a session by ID
   */
  async getSession(id: string): Promise<Session> {
    const response = await this.request(`/sessions/${id}`, {
      method: 'GET'
    });
    
    return response.json();
  }
  
  /**
   * Update a session
   */
  async updateSession(id: string, data: any, metadata?: SessionMetadata): Promise<void> {
    await this.request(`/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        data,
        metadata
      })
    });
  }
  
  /**
   * Delete a session
   */
  async deleteSession(id: string): Promise<void> {
    await this.request(`/sessions/${id}`, {
      method: 'DELETE'
    });
  }
  
  /**
   * List available sessions
   */
  async listSessions(options?: {
    prefix?: string;
    limit?: number;
    cursor?: string;
  }): Promise<SessionList> {
    const queryParams = new URLSearchParams();
    
    if (options?.prefix) {
      queryParams.set('prefix', options.prefix);
    }
    
    if (options?.limit) {
      queryParams.set('limit', options.limit.toString());
    }
    
    if (options?.cursor) {
      queryParams.set('cursor', options.cursor);
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await this.request(`/sessions${query}`, {
      method: 'GET'
    });
    
    return response.json();
  }
  
  /**
   * Make an authenticated API request
   */
  private async request(
    path: string,
    options: RequestInit,
    retryCount = 0
  ): Promise<Response> {
    const url = `${this.endpoint}${path}`;
    
    // Add authentication header if API key is provided
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }
    
    // Create request with timeout
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      const response = await this.fetchFn(url, {
        ...options,
        headers,
        signal: controller.signal
      });
      
      // Clear timeout
      clearTimeout(id);
      
      // Handle successful response
      if (response.ok) {
        return response;
      }
      
      // Handle retriable errors
      if (
        this.autoRetry &&
        retryCount < this.maxRetries &&
        (response.status === 429 || response.status >= 500)
      ) {
        // Exponential backoff
        const delay = Math.min(1000 * 2 ** retryCount, 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry request
        return this.request(path, options, retryCount + 1);
      }
      
      // Handle client errors
      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication failed. Please check your API key.');
      }
      
      if (response.status === 404) {
        throw new Error('Resource not found.');
      }
      
      // Handle other errors
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    } catch (error) {
      // Clear timeout
      clearTimeout(id);
      
      // Handle timeout
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      
      // Handle network errors
      if (
        this.autoRetry &&
        retryCount < this.maxRetries &&
        error instanceof TypeError
      ) {
        // Exponential backoff
        const delay = Math.min(1000 * 2 ** retryCount, 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry request
        return this.request(path, options, retryCount + 1);
      }
      
      // Rethrow other errors
      throw error;
    }
  }
}