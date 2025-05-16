/**
 * Custom hook for subscribing to session updates via WebSocket
 * @param sessionId The session ID to subscribe to
 * @returns Object containing session data and loading/error states
 */
export declare function useSessionSubscription(sessionId: string): {
    session: any;
    loading: any;
    error: any;
    refreshSession: () => Promise<void>;
};
