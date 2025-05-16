"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SettingsPage;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
function SettingsPage() {
    // Server settings
    const [serverUrl, setServerUrl] = (0, react_1.useState)('http://localhost:3000');
    const [storageType, setStorageType] = (0, react_1.useState)('local');
    const [redisUrl, setRedisUrl] = (0, react_1.useState)('redis://localhost:6379');
    // Storage settings
    const [storagePath, setStoragePath] = (0, react_1.useState)('~/.psp/sessions');
    const [useCompression, setUseCompression] = (0, react_1.useState)(true);
    const [useEncryption, setUseEncryption] = (0, react_1.useState)(false);
    const [encryptionKey, setEncryptionKey] = (0, react_1.useState)('');
    // UI settings
    const [autoRefresh, setAutoRefresh] = (0, react_1.useState)(false);
    const [refreshInterval, setRefreshInterval] = (0, react_1.useState)(30);
    const [darkMode, setDarkMode] = (0, react_1.useState)(false);
    // Other state
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [success, setSuccess] = (0, react_1.useState)(null);
    const [error, setError] = (0, react_1.useState)(null);
    // Load settings (simulated)
    (0, react_1.useEffect)(() => {
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
    const handleStorageTypeChange = (event) => {
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
        }
        catch (err) {
            console.error('Error saving settings:', err);
            setError(err.message || 'Failed to save settings. Please try again.');
        }
        finally {
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
    return (<material_1.Box>
      <material_1.Typography variant="h4" gutterBottom>
        Settings
      </material_1.Typography>
      
      {error && (<material_1.Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </material_1.Alert>)}
      
      <material_1.Snackbar open={!!success} autoHideDuration={6000} onClose={() => setSuccess(null)} message={success}/>
      
      <material_1.Paper sx={{ p: 2, mb: 3 }}>
        <material_1.Typography variant="h6" gutterBottom>
          Server Settings
        </material_1.Typography>
        
        <material_1.Grid container spacing={3}>
          <material_1.Grid item xs={12} md={6}>
            <material_1.TextField fullWidth label="Server URL" variant="outlined" value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} helperText="URL of the PSP server API" margin="normal"/>
          </material_1.Grid>
          
          <material_1.Grid item xs={12} md={6}>
            <material_1.FormControl fullWidth margin="normal">
              <material_1.InputLabel id="storage-type-label">Storage Type</material_1.InputLabel>
              <material_1.Select labelId="storage-type-label" value={storageType} label="Storage Type" onChange={handleStorageTypeChange}>
                <material_1.MenuItem value="local">Local Filesystem</material_1.MenuItem>
                <material_1.MenuItem value="redis">Redis</material_1.MenuItem>
                <material_1.MenuItem value="database">Database</material_1.MenuItem>
                <material_1.MenuItem value="cloud">Cloud Storage</material_1.MenuItem>
              </material_1.Select>
              <material_1.FormHelperText>Storage backend for session data</material_1.FormHelperText>
            </material_1.FormControl>
          </material_1.Grid>
          
          {storageType === 'redis' && (<material_1.Grid item xs={12}>
              <material_1.TextField fullWidth label="Redis URL" variant="outlined" value={redisUrl} onChange={(e) => setRedisUrl(e.target.value)} helperText="Redis connection URL (e.g., redis://localhost:6379)" margin="normal" required/>
            </material_1.Grid>)}
        </material_1.Grid>
      </material_1.Paper>
      
      <material_1.Paper sx={{ p: 2, mb: 3 }}>
        <material_1.Typography variant="h6" gutterBottom>
          Storage Settings
        </material_1.Typography>
        
        <material_1.Grid container spacing={3}>
          {storageType === 'local' && (<material_1.Grid item xs={12}>
              <material_1.TextField fullWidth label="Storage Path" variant="outlined" value={storagePath} onChange={(e) => setStoragePath(e.target.value)} helperText="Local path where sessions will be stored" margin="normal"/>
            </material_1.Grid>)}
          
          <material_1.Grid item xs={12} md={6}>
            <material_1.FormGroup>
              <material_1.FormControlLabel control={<material_1.Switch checked={useCompression} onChange={(e) => setUseCompression(e.target.checked)}/>} label="Enable Compression"/>
              <material_1.FormHelperText>Compress session data to reduce storage size</material_1.FormHelperText>
            </material_1.FormGroup>
          </material_1.Grid>
          
          <material_1.Grid item xs={12} md={6}>
            <material_1.FormGroup>
              <material_1.FormControlLabel control={<material_1.Switch checked={useEncryption} onChange={(e) => setUseEncryption(e.target.checked)}/>} label="Enable Encryption"/>
              <material_1.FormHelperText>Encrypt session data for additional security</material_1.FormHelperText>
            </material_1.FormGroup>
          </material_1.Grid>
          
          {useEncryption && (<material_1.Grid item xs={12}>
              <material_1.TextField fullWidth label="Encryption Key" variant="outlined" type="password" value={encryptionKey} onChange={(e) => setEncryptionKey(e.target.value)} helperText="Key used to encrypt session data (keep this secure)" margin="normal" required/>
            </material_1.Grid>)}
        </material_1.Grid>
      </material_1.Paper>
      
      <material_1.Paper sx={{ p: 2, mb: 3 }}>
        <material_1.Typography variant="h6" gutterBottom>
          UI Settings
        </material_1.Typography>
        
        <material_1.Grid container spacing={3}>
          <material_1.Grid item xs={12} md={6}>
            <material_1.FormGroup>
              <material_1.FormControlLabel control={<material_1.Switch checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)}/>} label="Auto-refresh Sessions"/>
              <material_1.FormHelperText>Automatically refresh session lists periodically</material_1.FormHelperText>
            </material_1.FormGroup>
          </material_1.Grid>
          
          <material_1.Grid item xs={12} md={6}>
            <material_1.FormGroup>
              <material_1.FormControlLabel control={<material_1.Switch checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)}/>} label="Dark Mode"/>
              <material_1.FormHelperText>Use dark theme for the UI (requires reload)</material_1.FormHelperText>
            </material_1.FormGroup>
          </material_1.Grid>
          
          {autoRefresh && (<material_1.Grid item xs={12} md={6}>
              <material_1.TextField fullWidth label="Refresh Interval (seconds)" variant="outlined" type="number" value={refreshInterval} onChange={(e) => setRefreshInterval(parseInt(e.target.value, 10))} inputProps={{ min: 5, max: 300 }} margin="normal"/>
            </material_1.Grid>)}
        </material_1.Grid>
      </material_1.Paper>
      
      <material_1.Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <material_1.Button variant="outlined" color="error" startIcon={<icons_material_1.Delete />} onClick={handleResetSettings}>
          Reset to Defaults
        </material_1.Button>
        
        <material_1.Button variant="outlined" startIcon={<icons_material_1.Refresh />} onClick={() => window.location.reload()}>
          Reload Page
        </material_1.Button>
        
        <material_1.Button variant="contained" color="primary" startIcon={<icons_material_1.Save />} onClick={handleSaveSettings} disabled={loading}>
          Save Settings
        </material_1.Button>
      </material_1.Box>
    </material_1.Box>);
}
