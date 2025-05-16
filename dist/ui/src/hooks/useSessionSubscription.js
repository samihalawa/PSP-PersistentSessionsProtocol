"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSessionSubscription = useSessionSubscription;
const react_1 = require("react");
const apiConfig_1 = require("../api/apiConfig");
/**
 * Custom hook for subscribing to session updates via WebSocket
 * @param sessionId The session ID to subscribe to
 * @returns Object containing session data and loading/error states
 */
function useSessionSubscription(sessionId) {
    const [session, setSession] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    // Get API client
    const apiClient = (0, apiConfig_1.getApiClient)();
    // Effect for initial load and subscription
    (0, react_1.useEffect)(() => {
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
            }
            catch (err) {
                console.error('Error loading session:', err);
                if (isMounted) {
                    setError(err.message || 'Failed to load session');
                    setLoading(false);
                }
            }
        };
        // Session update handler
        const handleSessionUpdate = (updatedSession) => {
            if (isMounted) {
                console.log('Received session update:', updatedSession);
                setSession(updatedSession);
            }
        };
        // Error handler
        const handleError = (err) => {
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
        }
        catch (err) {
            console.error('Error refreshing session:', err);
            setError(err.message || 'Failed to refresh session');
        }
        finally {
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
