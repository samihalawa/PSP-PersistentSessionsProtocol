import { useState, useEffect } from 'react';
import { getApiClient } from '../api/apiConfig';
import { Session } from '../api/pspApi';

/**
 * Custom hook for subscribing to session updates via WebSocket
 * @param sessionId The session ID to subscribe to
 * @returns Object containing session data and loading/error states
 */
export function useSessionSubscription(sessionId: string) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get API client
  const apiClient = getApiClient();

  // Effect for initial load and subscription
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    // Load initial session data
    const loadSession = async () => {
      try {
        const sessionData = await apiClient.getSession(sessionId);
        if (isMounted) {
          setSession(sessionData);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Error loading session:', err);
        if (isMounted) {
          setError(err.message || 'Failed to load session');
          setLoading(false);
        }
      }
    };

    // Session update handler
    const handleSessionUpdate = (updatedSession: Session) => {
      if (isMounted) {
        console.log('Received session update:', updatedSession);
        setSession(updatedSession);
      }
    };

    // Error handler
    const handleError = (err: any) => {
      console.error('WebSocket error:', err);
      if (isMounted) {
        setError('WebSocket connection error');
      }
    };

    // Load initial data and subscribe to updates
    loadSession();
    apiClient.addSessionListener(sessionId, handleSessionUpdate);
    apiClient.addErrorListener(handleError);

    // Clean up on unmount
    return () => {
      isMounted = false;
      apiClient.removeSessionListener(sessionId, handleSessionUpdate);
      apiClient.removeErrorListener(handleError);
    };
  }, [sessionId]);

  /**
   * Manually refresh the session data
   */
  const refreshSession = async () => {
    setLoading(true);
    setError(null);

    try {
      const sessionData = await apiClient.getSession(sessionId);
      setSession(sessionData);
    } catch (err: any) {
      console.error('Error refreshing session:', err);
      setError(err.message || 'Failed to refresh session');
    } finally {
      setLoading(false);
    }
  };

  return {
    session,
    loading,
    error,
    refreshSession
  };
}