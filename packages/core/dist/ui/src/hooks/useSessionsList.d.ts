/**
 * Custom hook for managing sessions list with real-time updates
 * @param initialFilters Initial filters for sessions list
 * @returns Object with sessions list and management functions
 */
export declare function useSessionsList(initialFilters?: {
    name?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
}): {
    sessions: any;
    loading: any;
    error: any;
    filters: any;
    updateFilters: any;
    refreshSessions: any;
    autoRefresh: any;
    refreshInterval: number;
};
