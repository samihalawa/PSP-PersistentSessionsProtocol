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
exports.default = RecorderPage;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const pspApi_1 = require("../api/pspApi");
function RecorderPage() {
    const [recording, setRecording] = (0, react_1.useState)(false);
    const [events, setEvents] = (0, react_1.useState)([]);
    const [sessionName, setSessionName] = (0, react_1.useState)('');
    const [sessionDescription, setSessionDescription] = (0, react_1.useState)('');
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [success, setSuccess] = (0, react_1.useState)(null);
    // Create API client
    const apiClient = new pspApi_1.PSPApiClient();
    // Start recording
    const handleStartRecording = () => {
        setRecording(true);
        setEvents([]);
        setError(null);
        setSuccess(null);
        // In a real implementation, this would connect to the PSP API
        // and start capturing browser events
        console.log('Recording started');
    };
    // Stop recording
    const handleStopRecording = () => {
        setRecording(false);
        // In a real implementation, this would stop the recording
        // and retrieve the captured events
        console.log('Recording stopped');
        // Simulate some captured events
        setEvents([
            { type: 'navigation', timestamp: 0, data: { url: 'https://example.com' } },
            { type: 'click', timestamp: 1200, target: 'button#login', data: { x: 150, y: 200 } },
            { type: 'input', timestamp: 2500, target: 'input#username', data: { value: 'user@example.com' } },
            { type: 'click', timestamp: 4000, target: 'button#submit', data: { x: 150, y: 300 } },
        ]);
    };
    // Save recording
    const handleSaveRecording = async () => {
        if (!sessionName) {
            setError('Please enter a session name');
            return;
        }
        if (events.length === 0) {
            setError('No events to save');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            // In a real implementation, this would create a new session
            // and save the recorded events
            await new Promise(resolve => setTimeout(resolve, 1000));
            setSuccess(`Recording saved as "${sessionName}"`);
            setSessionName('');
            setSessionDescription('');
            setEvents([]);
        }
        catch (err) {
            console.error('Error saving recording:', err);
            setError('Failed to save recording. Please try again.');
        }
        finally {
            setLoading(false);
        }
    };
    // Clear recording
    const handleClearRecording = () => {
        setEvents([]);
        setError(null);
        setSuccess(null);
    };
    return (<material_1.Box>
      <material_1.Typography variant="h4" gutterBottom>
        Session Recorder
      </material_1.Typography>
      
      <material_1.Paper sx={{ p: 2, mb: 3 }}>
        <material_1.Typography variant="h6" gutterBottom>
          Record Browser Session
        </material_1.Typography>
        
        <material_1.Typography color="textSecondary" paragraph>
          Record your browser interactions to create a new session that can be replayed or shared.
        </material_1.Typography>
        
        <material_1.Grid container spacing={2}>
          <material_1.Grid item xs={12} md={6}>
            <material_1.TextField fullWidth label="Session Name" variant="outlined" value={sessionName} onChange={(e) => setSessionName(e.target.value)} disabled={recording} margin="normal"/>
          </material_1.Grid>
          <material_1.Grid item xs={12} md={6}>
            <material_1.TextField fullWidth label="Description (optional)" variant="outlined" value={sessionDescription} onChange={(e) => setSessionDescription(e.target.value)} disabled={recording} margin="normal"/>
          </material_1.Grid>
        </material_1.Grid>
        
        <material_1.Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          {!recording ? (<material_1.Button variant="contained" color="primary" startIcon={<icons_material_1.PlayArrow />} onClick={handleStartRecording} disabled={loading}>
              Start Recording
            </material_1.Button>) : (<material_1.Button variant="contained" color="error" startIcon={<icons_material_1.Stop />} onClick={handleStopRecording}>
              Stop Recording
            </material_1.Button>)}
          
          <material_1.Button variant="outlined" startIcon={<icons_material_1.Save />} onClick={handleSaveRecording} disabled={recording || events.length === 0 || loading}>
            Save Recording
          </material_1.Button>
          
          <material_1.Button variant="outlined" startIcon={<icons_material_1.Delete />} onClick={handleClearRecording} disabled={recording || events.length === 0 || loading}>
            Clear Recording
          </material_1.Button>
        </material_1.Box>
        
        {loading && (<material_1.Box sx={{ display: 'flex', mt: 2 }}>
            <material_1.CircularProgress size={24} sx={{ mr: 1 }}/>
            <material_1.Typography>Saving recording...</material_1.Typography>
          </material_1.Box>)}
        
        {error && (<material_1.Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </material_1.Alert>)}
        
        {success && (<material_1.Alert severity="success" sx={{ mt: 2 }}>
            {success}
          </material_1.Alert>)}
      </material_1.Paper>
      
      <material_1.Paper sx={{ p: 2 }}>
        <material_1.Typography variant="h6" gutterBottom>
          Recorded Events
        </material_1.Typography>
        
        {events.length > 0 ? (<material_1.List>
            {events.map((event, index) => (<material_1.ListItem key={index} divider={index < events.length - 1}>
                <material_1.ListItemIcon>
                  <icons_material_1.Videocam />
                </material_1.ListItemIcon>
                <material_1.ListItemText primary={`${event.type} - ${event.target || 'N/A'}`} secondary={`Time: ${(event.timestamp / 1000).toFixed(2)}s | Data: ${JSON.stringify(event.data)}`}/>
              </material_1.ListItem>))}
          </material_1.List>) : (<material_1.Typography color="textSecondary">
            No events recorded yet. Click "Start Recording" to begin capturing browser interactions.
          </material_1.Typography>)}
      </material_1.Paper>
    </material_1.Box>);
}
