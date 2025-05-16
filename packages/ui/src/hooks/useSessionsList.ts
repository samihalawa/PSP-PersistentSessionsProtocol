import { useState, useEffect, useCallback } from 'react';
import { getApiClient } from '../api/apiConfig';
import { SessionMetadata } from '../api/pspApi';

/**
 * Custom hook for managing sessions list with real-time updates
 * @param initialFilters Initial filters for sessions list
 * @returns Object with sessions list and management functions
 */
export function useSessionsList(initialFilters: {
  name?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
} = {}) {
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(initialFilters);
  const [autoRefresh, setAutoRefresh] = useState(
    localStorage.getItem('psp-auto-refresh') === 'true'
  );
  const [refreshInterval, setRefreshInterval] = useState(
    parseInt(localStorage.getItem('psp-refresh-interval') || '30', 10) * 1000
  );

  // Get API client
  const apiClient = getApiClient();

  // Load sessions with current filters
  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.listSessions(filters);
      setSessions(response);
    } catch (err: any) {
      console.error('Error loading sessions:', err);
      setError(err.message || 'Failed to load sessions. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Update filters and reload sessions
  const updateFilters = useCallback((newFilters: typeof filters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Start auto refresh
  useEffect(() => {
    // Check if settings have been updated
    const storedAutoRefresh = localStorage.getItem('psp-auto-refresh') === 'true';
    const storedInterval = parseInt(localStorage.getItem('psp-refresh-interval') || '30', 10) * 1000;
    
    if (storedAutoRefresh !== autoRefresh) {
      setAutoRefresh(storedAutoRefresh);
    }
    
    if (storedInterval !== refreshInterval) {
      setRefreshInterval(storedInterval);
    }
    
    let intervalId: NodeJS.Timeout | null = null;
    
    if (autoRefresh) {
      // Setup interval for auto-refresh
      intervalId = setInterval(() => {
        console.log('Auto-refreshing sessions...');
        loadSessions();
      }, refreshInterval);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh, refreshInterval, loadSessions]);

  // Initial load
  useEffect(() => {
    loadSessions();
    
    // Listen for storage changes to update settings
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'psp-auto-refresh') {
        setAutoRefresh(e.newValue === 'true');
      } else if (e.key === 'psp-refresh-interval') {
        setRefreshInterval(parseInt(e.newValue || '30', 10) * 1000);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return {
    sessions,
    loading,
    error,
    filters,
    updateFilters,
    refreshSessions: loadSessions,
    autoRefresh,
    refreshInterval: refreshInterval / 1000
  };
}