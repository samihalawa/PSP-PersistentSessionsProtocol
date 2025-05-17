/**
 * React hooks for using PSP sessions
 */

import { useState, useEffect, useCallback } from 'react';
import { SessionApi } from './api';

interface UseSessionsOptions {
  /**
   * Initial limit for pagination
   */
  limit?: number;
  
  /**
   * Prefix filter for session IDs
   */
  prefix?: string;
  
  /**
   * Auto-refresh interval in milliseconds (0 to disable)
   */
  refreshInterval?: number;
}

interface UseSessionReturn {
  /**
   * Session data
   */
  session: any | null;
  
  /**
   * Whether the session is currently loading
   */
  loading: boolean;
  
  /**
   * Error message if loading failed
   */
  error: string | null;
  
  /**
   * Refresh the session data
   */
  refresh: () => Promise<void>;
  
  /**
   * Update the session data
   */
  updateSession: (data: any, metadata?: any) => Promise<void>;
  
  /**
   * Delete the session
   */
  deleteSession: () => Promise<void>;
}

interface UseSessionsReturn {
  /**
   * List of sessions
   */
  sessions: Array<{
    id: string;
    metadata?: any;
  }>;
  
  /**
   * Whether sessions are currently loading
   */
  loading: boolean;
  
  /**
   * Error message if loading failed
   */
  error: string | null;
  
  /**
   * Whether there are more sessions to load
   */
  hasMore: boolean;
  
  /**
   * Load more sessions
   */
  loadMore: () => Promise<void>;
  
  /**
   * Refresh the session list
   */
  refresh: () => Promise<void>;
  
  /**
   * Create a new session
   */
  createSession: (data: any, metadata?: any, id?: string) => Promise<string>;
  
  /**
   * Delete a session
   */
  deleteSession: (id: string) => Promise<void>;
}

/**
 * Hook for loading a single session by ID
 */
export function useSession(api: SessionApi, sessionId: string): UseSessionReturn {
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const refresh = useCallback(async () => {
    if (!sessionId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await api.getSession(sessionId);
      setSession(data);
    } catch (err) {
      setError(err.message || 'Failed to load session');
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [api, sessionId]);
  
  const updateSession = useCallback(async (data: any, metadata?: any) => {
    if (!sessionId) return;
    
    try {
      await api.updateSession(sessionId, data, metadata);
      // Refresh after updating
      await refresh();
    } catch (err) {
      setError(err.message || 'Failed to update session');
    }
  }, [api, sessionId, refresh]);
  
  const deleteSession = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      await api.deleteSession(sessionId);
      setSession(null);
    } catch (err) {
      setError(err.message || 'Failed to delete session');
    }
  }, [api, sessionId]);
  
  // Load session on mount and when sessionId changes
  useEffect(() => {
    refresh();
  }, [refresh]);
  
  return {
    session,
    loading,
    error,
    refresh,
    updateSession,
    deleteSession
  };
}

/**
 * Hook for listing available sessions
 */
export function useSessions(api: SessionApi, options: UseSessionsOptions = {}): UseSessionsReturn {
  const [sessions, setSessions] = useState<Array<{ id: string; metadata?: any }>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  
  const fetchSessions = useCallback(async (isRefresh = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.listSessions({
        prefix: options.prefix,
        limit: options.limit || 20,
        cursor: isRefresh ? undefined : cursor
      });
      
      setSessions(prev => isRefresh ? result.sessions : [...prev, ...result.sessions]);
      setCursor(result.cursor);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [api, options.prefix, options.limit, cursor]);
  
  const refresh = useCallback(async () => {
    await fetchSessions(true);
  }, [fetchSessions]);
  
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchSessions(false);
  }, [fetchSessions, hasMore, loading]);
  
  const createSession = useCallback(async (data: any, metadata?: any, id?: string): Promise<string> => {
    try {
      const sessionId = await api.createSession(data, metadata, id);
      // Refresh the list
      await refresh();
      return sessionId;
    } catch (err) {
      setError(err.message || 'Failed to create session');
      throw err;
    }
  }, [api, refresh]);
  
  const deleteSession = useCallback(async (id: string) => {
    try {
      await api.deleteSession(id);
      // Update local state
      setSessions(prev => prev.filter(session => session.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to delete session');
      throw err;
    }
  }, [api]);
  
  // Load sessions on mount and when dependencies change
  useEffect(() => {
    refresh();
  }, [refresh]);
  
  // Set up auto-refresh if enabled
  useEffect(() => {
    if (!options.refreshInterval) return;
    
    const intervalId = setInterval(() => {
      refresh();
    }, options.refreshInterval);
    
    return () => clearInterval(intervalId);
  }, [options.refreshInterval, refresh]);
  
  return {
    sessions,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    createSession,
    deleteSession
  };
}

/**
 * Hook for managing a session in a form
 */
export function useSessionForm(api: SessionApi, initialData: any = {}) {
  const [formData, setFormData] = useState(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const handleChange = useCallback((key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);
  
  const saveSession = useCallback(async (metadata?: any, id?: string) => {
    setIsSaving(true);
    setSaveError(null);
    
    try {
      const sessionId = await api.createSession(formData, metadata, id);
      setIsSaving(false);
      return sessionId;
    } catch (err) {
      setSaveError(err.message || 'Failed to save session');
      setIsSaving(false);
      throw err;
    }
  }, [api, formData]);
  
  const resetForm = useCallback(() => {
    setFormData(initialData);
    setSaveError(null);
  }, [initialData]);
  
  return {
    formData,
    setFormData,
    handleChange,
    isSaving,
    saveError,
    saveSession,
    resetForm
  };
}