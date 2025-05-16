"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSessionsList = useSessionsList;
const react_1 = require("react");
const apiConfig_1 = require("../api/apiConfig");
/**
 * Custom hook for managing sessions list with real-time updates
 * @param initialFilters Initial filters for sessions list
 * @returns Object with sessions list and management functions
 */
function useSessionsList(initialFilters = {}) {
    const [sessions, setSessions] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [filters, setFilters] = (0, react_1.useState)(initialFilters);
    const [autoRefresh, setAutoRefresh] = (0, react_1.useState)(localStorage.getItem('psp-auto-refresh') === 'true');
    const [refreshInterval, setRefreshInterval] = (0, react_1.useState)(parseInt(localStorage.getItem('psp-refresh-interval') || '30', 10) * 1000);
    // Get API client
    const apiClient = (0, apiConfig_1.getApiClient)();
    // Load sessions with current filters
    const loadSessions = (0, react_1.useCallback)(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.listSessions(filters);
            setSessions(response);
        }
        catch (err) {
            console.error('Error loading sessions:', err);
            setError(err.message || 'Failed to load sessions. Please try again later.');
        }
        finally {
            setLoading(false);
        }
    }, [filters]);
    // Update filters and reload sessions
    const updateFilters = (0, react_1.useCallback)((newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    }, []);
    // Start auto refresh
    (0, react_1.useEffect)(() => {
        // Check if settings have been updated
        const storedAutoRefresh = localStorage.getItem('psp-auto-refresh') === 'true';
        const storedInterval = parseInt(localStorage.getItem('psp-refresh-interval') || '30', 10) * 1000;
        if (storedAutoRefresh !== autoRefresh) {
            setAutoRefresh(storedAutoRefresh);
        }
        if (storedInterval !== refreshInterval) {
            setRefreshInterval(storedInterval);
        }
        let intervalId = null;
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
    (0, react_1.useEffect)(() => {
        loadSessions();
        // Listen for storage changes to update settings
        const handleStorageChange = (e) => {
            if (e.key === 'psp-auto-refresh') {
                setAutoRefresh(e.newValue === 'true');
            }
            else if (e.key === 'psp-refresh-interval') {
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
