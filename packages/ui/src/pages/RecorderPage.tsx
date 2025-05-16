import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  TextField,
  Typography,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Videocam as VideocamIcon
} from '@mui/icons-material';
import { PSPApiClient } from '../api/pspApi';

export default function RecorderPage() {
  const [recording, setRecording] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [sessionName, setSessionName] = useState('');
  const [sessionDescription, setSessionDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create API client
  const apiClient = new PSPApiClient();

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
    } catch (err) {
      console.error('Error saving recording:', err);
      setError('Failed to save recording. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Clear recording
  const handleClearRecording = () => {
    setEvents([]);
    setError(null);
    setSuccess(null);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Session Recorder
      </Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Record Browser Session
        </Typography>
        
        <Typography color="textSecondary" paragraph>
          Record your browser interactions to create a new session that can be replayed or shared.
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Session Name"
              variant="outlined"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              disabled={recording}
              margin="normal"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Description (optional)"
              variant="outlined"
              value={sessionDescription}
              onChange={(e) => setSessionDescription(e.target.value)}
              disabled={recording}
              margin="normal"
            />
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          {!recording ? (
            <Button
              variant="contained"
              color="primary"
              startIcon={<PlayIcon />}
              onClick={handleStartRecording}
              disabled={loading}
            >
              Start Recording
            </Button>
          ) : (
            <Button
              variant="contained"
              color="error"
              startIcon={<StopIcon />}
              onClick={handleStopRecording}
            >
              Stop Recording
            </Button>
          )}
          
          <Button
            variant="outlined"
            startIcon={<SaveIcon />}
            onClick={handleSaveRecording}
            disabled={recording || events.length === 0 || loading}
          >
            Save Recording
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<DeleteIcon />}
            onClick={handleClearRecording}
            disabled={recording || events.length === 0 || loading}
          >
            Clear Recording
          </Button>
        </Box>
        
        {loading && (
          <Box sx={{ display: 'flex', mt: 2 }}>
            <CircularProgress size={24} sx={{ mr: 1 }} />
            <Typography>Saving recording...</Typography>
          </Box>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {success}
          </Alert>
        )}
      </Paper>
      
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Recorded Events
        </Typography>
        
        {events.length > 0 ? (
          <List>
            {events.map((event, index) => (
              <ListItem key={index} divider={index < events.length - 1}>
                <ListItemIcon>
                  <VideocamIcon />
                </ListItemIcon>
                <ListItemText
                  primary={`${event.type} - ${event.target || 'N/A'}`}
                  secondary={`Time: ${(event.timestamp / 1000).toFixed(2)}s | Data: ${JSON.stringify(event.data)}`}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography color="textSecondary">
            No events recorded yet. Click "Start Recording" to begin capturing browser interactions.
          </Typography>
        )}
      </Paper>
    </Box>
  );
}