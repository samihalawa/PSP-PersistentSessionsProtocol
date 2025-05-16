import React, { useMemo, useState, useEffect, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { lazyRoute } from './utils/LazyLoading';
import AppLayout from './components/Layout/AppLayout';

// Lazy load all pages to reduce initial bundle size
const DashboardPage = lazyRoute(() => import('./pages/DashboardPage'));
const SessionsPage = lazyRoute(() => import('./pages/SessionsPage'));
const SessionDetailsPage = lazyRoute(() => import('./pages/SessionDetailsPage'));
const SessionEditPage = lazyRoute(() => import('./pages/SessionEditPage'));
const RecorderPage = lazyRoute(() => import('./pages/RecorderPage'));
const HistoryPage = lazyRoute(() => import('./pages/HistoryPage'));
const SettingsPage = lazyRoute(() => import('./pages/SettingsPage'));

function App() {
  // Get dark mode setting from localStorage
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('psp-dark-mode') === 'true';
  });

  // Create theme with dark mode support
  const theme = useMemo(() => createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#0066cc',
      },
      secondary: {
        main: '#f50057',
      },
    },
    // Optimize typography for performance
    typography: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
    },
    // Optimize component defaults for performance
    components: {
      MuiButtonBase: {
        defaultProps: {
          disableRipple: true, // Disable ripple effect for better performance
        },
      },
      MuiTableCell: {
        defaultProps: {
          size: 'small', // Use small sized table cells by default
        },
      },
    },
  }), [darkMode]);

  // Initialize performance tracking
  useEffect(() => {
    // Import performance tracking utils dynamically
    import('./utils/Performance').then(({ trackPerformance }) => {
      trackPerformance();

      // Log performance metrics after load
      setTimeout(() => {
        import('./utils/Performance').then(({ getPerformanceData }) => {
          console.log('Performance metrics:', getPerformanceData());
        });
      }, 5000);
    });
  }, []);

  // Listen for dark mode setting changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'psp-dark-mode') {
        setDarkMode(e.newValue === 'true');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="sessions/:id" element={<SessionDetailsPage />} />
            <Route path="sessions/:id/edit" element={<SessionEditPage />} />
            <Route path="recorder" element={<RecorderPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;