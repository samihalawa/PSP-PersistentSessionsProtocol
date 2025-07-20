/**
 * Common API types for the server
 */

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: number;
    requestId?: string;
    version?: string;
  };
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CreateSessionRequest {
  name: string;
  description?: string;
  tags?: string[];
  storage?: 'local' | 'redis' | 'database' | 'cloud';
  storageOptions?: Record<string, any>;
  features?: {
    cookies?: boolean;
    localStorage?: boolean;
    sessionStorage?: boolean;
    history?: boolean;
    network?: boolean;
    dom?: boolean;
    indexedDB?: boolean;
  };
  expireIn?: number;
}

export interface UpdateSessionRequest {
  name?: string;
  description?: string;
  tags?: string[];
}

export interface SessionListQuery {
  page?: number;
  limit?: number;
  name?: string;
  tags?: string[];
  createdFrom?: number;
  createdTo?: number;
  updatedFrom?: number;
  updatedTo?: number;
}

export interface CaptureSessionRequest {
  sessionId: string;
  features?: {
    cookies?: boolean;
    localStorage?: boolean;
    sessionStorage?: boolean;
    history?: boolean;
    network?: boolean;
    dom?: boolean;
    indexedDB?: boolean;
  };
}

export interface RestoreSessionRequest {
  sessionId: string;
  features?: {
    cookies?: boolean;
    localStorage?: boolean;
    sessionStorage?: boolean;
    history?: boolean;
    network?: boolean;
    dom?: boolean;
    indexedDB?: boolean;
  };
}

export interface RecordingStartRequest {
  sessionId: string;
  options?: {
    events?: {
      click?: boolean;
      input?: boolean;
      keypress?: boolean;
      navigation?: boolean;
      scroll?: boolean;
      network?: boolean;
    };
    maxEvents?: number;
    maxDuration?: number;
  };
}

export interface PlaybackRequest {
  sessionId: string;
  options?: {
    speed?: number;
    simulateNetwork?: boolean;
    validateTargets?: boolean;
    actionTimeout?: number;
    skipEvents?: string[];
  };
}

export interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
}