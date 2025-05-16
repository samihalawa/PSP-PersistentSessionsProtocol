import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Switch,
  TextField,
  Typography,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

export default function SettingsPage() {
  // Server settings
  const [serverUrl, setServerUrl] = useState('http://localhost:3000');
  const [storageType, setStorageType] = useState('local');
  const [redisUrl, setRedisUrl] = useState('redis://localhost:6379');
  
  // Storage settings
  const [storagePath, setStoragePath] = useState('~/.psp/sessions');
  const [useCompression, setUseCompression] = useState(true);
  const [useEncryption, setUseEncryption] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState('');
  
  // UI settings
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [darkMode, setDarkMode] = useState(false);
  
  // Other state
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Load settings (simulated)
  useEffect(() => {
    // In a real implementation, this would load settings from localStorage or an API
    const loadedSettings = {
      serverUrl: localStorage.getItem('psp-server-url') || 'http://localhost:3000',
      storageType: localStorage.getItem('psp-storage-type') || 'local',
      redisUrl: localStorage.getItem('psp-redis-url') || 'redis://localhost:6379',
      storagePath: localStorage.getItem('psp-storage-path') || '~/.psp/sessions',
      useCompression: localStorage.getItem('psp-use-compression') !== 'false',
      useEncryption: localStorage.getItem('psp-use-encryption') === 'true',
      encryptionKey: localStorage.getItem('psp-encryption-key') || '',
      autoRefresh: localStorage.getItem('psp-auto-refresh') === 'true',
      refreshInterval: parseInt(localStorage.getItem('psp-refresh-interval') || '30', 10),
      darkMode: localStorage.getItem('psp-dark-mode') === 'true'
    };
    
    setServerUrl(loadedSettings.serverUrl);
    setStorageType(loadedSettings.storageType);
    setRedisUrl(loadedSettings.redisUrl);
    setStoragePath(loadedSettings.storagePath);
    setUseCompression(loadedSettings.useCompression);
    setUseEncryption(loadedSettings.useEncryption);
    setEncryptionKey(loadedSettings.encryptionKey);
    setAutoRefresh(loadedSettings.autoRefresh);
    setRefreshInterval(loadedSettings.refreshInterval);
    setDarkMode(loadedSettings.darkMode);
  }, []);
  
  // Handle storage type change
  const handleStorageTypeChange = (event: SelectChangeEvent<string>) => {
    setStorageType(event.target.value);
  };
  
  // Handle save settings
  const handleSaveSettings = () => {
    setLoading(true);
    setSuccess(null);
    setError(null);
    
    try {
      // Validate settings
      if (storageType === 'redis' && !redisUrl) {
        throw new Error('Redis URL is required when using Redis storage');
      }
      
      if (useEncryption && !encryptionKey) {
        throw new Error('Encryption key is required when encryption is enabled');
      }
      
      // In a real implementation, this would save settings to localStorage or an API
      localStorage.setItem('psp-server-url', serverUrl);
      localStorage.setItem('psp-storage-type', storageType);
      localStorage.setItem('psp-redis-url', redisUrl);
      localStorage.setItem('psp-storage-path', storagePath);
      localStorage.setItem('psp-use-compression', useCompression.toString());
      localStorage.setItem('psp-use-encryption', useEncryption.toString());
      localStorage.setItem('psp-encryption-key', encryptionKey);
      localStorage.setItem('psp-auto-refresh', autoRefresh.toString());
      localStorage.setItem('psp-refresh-interval', refreshInterval.toString());
      localStorage.setItem('psp-dark-mode', darkMode.toString());
      
      setSuccess('Settings saved successfully');
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setError(err.message || 'Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle reset settings
  const handleResetSettings = () => {
    if (window.confirm('Are you sure you want to reset all settings to default values?')) {
      setServerUrl('http://localhost:3000');
      setStorageType('local');
      setRedisUrl('redis://localhost:6379');
      setStoragePath('~/.psp/sessions');
      setUseCompression(true);
      setUseEncryption(false);
      setEncryptionKey('');
      setAutoRefresh(false);
      setRefreshInterval(30);
      setDarkMode(false);
      
      // Clear all from localStorage
      localStorage.removeItem('psp-server-url');
      localStorage.removeItem('psp-storage-type');
      localStorage.removeItem('psp-redis-url');
      localStorage.removeItem('psp-storage-path');
      localStorage.removeItem('psp-use-compression');
      localStorage.removeItem('psp-use-encryption');
      localStorage.removeItem('psp-encryption-key');
      localStorage.removeItem('psp-auto-refresh');
      localStorage.removeItem('psp-refresh-interval');
      localStorage.removeItem('psp-dark-mode');
      
      setSuccess('Settings reset to defaults');
    }
  };
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
        message={success}
      />
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Server Settings
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Server URL"
              variant="outlined"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              helperText="URL of the PSP server API"
              margin="normal"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="storage-type-label">Storage Type</InputLabel>
              <Select
                labelId="storage-type-label"
                value={storageType}
                label="Storage Type"
                onChange={handleStorageTypeChange}
              >
                <MenuItem value="local">Local Filesystem</MenuItem>
                <MenuItem value="redis">Redis</MenuItem>
                <MenuItem value="database">Database</MenuItem>
                <MenuItem value="cloud">Cloud Storage</MenuItem>
              </Select>
              <FormHelperText>Storage backend for session data</FormHelperText>
            </FormControl>
          </Grid>
          
          {storageType === 'redis' && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Redis URL"
                variant="outlined"
                value={redisUrl}
                onChange={(e) => setRedisUrl(e.target.value)}
                helperText="Redis connection URL (e.g., redis://localhost:6379)"
                margin="normal"
                required
              />
            </Grid>
          )}
        </Grid>
      </Paper>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Storage Settings
        </Typography>
        
        <Grid container spacing={3}>
          {storageType === 'local' && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Storage Path"
                variant="outlined"
                value={storagePath}
                onChange={(e) => setStoragePath(e.target.value)}
                helperText="Local path where sessions will be stored"
                margin="normal"
              />
            </Grid>
          )}
          
          <Grid item xs={12} md={6}>
            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={useCompression}
                    onChange={(e) => setUseCompression(e.target.checked)}
                  />
                }
                label="Enable Compression"
              />
              <FormHelperText>Compress session data to reduce storage size</FormHelperText>
            </FormGroup>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={useEncryption}
                    onChange={(e) => setUseEncryption(e.target.checked)}
                  />
                }
                label="Enable Encryption"
              />
              <FormHelperText>Encrypt session data for additional security</FormHelperText>
            </FormGroup>
          </Grid>
          
          {useEncryption && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Encryption Key"
                variant="outlined"
                type="password"
                value={encryptionKey}
                onChange={(e) => setEncryptionKey(e.target.value)}
                helperText="Key used to encrypt session data (keep this secure)"
                margin="normal"
                required
              />
            </Grid>
          )}
        </Grid>
      </Paper>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          UI Settings
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                  />
                }
                label="Auto-refresh Sessions"
              />
              <FormHelperText>Automatically refresh session lists periodically</FormHelperText>
            </FormGroup>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={darkMode}
                    onChange={(e) => setDarkMode(e.target.checked)}
                  />
                }
                label="Dark Mode"
              />
              <FormHelperText>Use dark theme for the UI (requires reload)</FormHelperText>
            </FormGroup>
          </Grid>
          
          {autoRefresh && (
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Refresh Interval (seconds)"
                variant="outlined"
                type="number"
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(parseInt(e.target.value, 10))}
                inputProps={{ min: 5, max: 300 }}
                margin="normal"
              />
            </Grid>
          )}
        </Grid>
      </Paper>
      
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={handleResetSettings}
        >
          Reset to Defaults
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => window.location.reload()}
        >
          Reload Page
        </Button>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={handleSaveSettings}
          disabled={loading}
        >
          Save Settings
        </Button>
      </Box>
    </Box>
  );
}