import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  Paper,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  History as HistoryIcon,
  Restore as RestoreIcon,
  Delete as DeleteIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { PSPApiClient, SessionMetadata } from '../api/pspApi';

// Format date
const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString();
};

export default function HistoryPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<SessionMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Create API client
  const apiClient = new PSPApiClient();

  // Load session history
  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would fetch the session history
      // with additional metadata about usage and interactions
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate loading session history
      const response = await apiClient.listSessions();
      
      // Sort by most recently updated
      const sortedHistory = [...response].sort((a, b) => b.updatedAt - a.updatedAt);
      
      setHistory(sortedHistory);
    } catch (err) {
      console.error('Error loading history:', err);
      setError('Failed to load session history. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Load history on component mount
  useEffect(() => {
    loadHistory();
  }, []);

  // Handle search
  const handleSearch = () => {
    loadHistory();
  };

  // Handle view session
  const handleViewSession = (sessionId: string) => {
    navigate(`/sessions/${sessionId}`);
  };

  // Handle delete from history
  const handleDeleteFromHistory = async (sessionId: string) => {
    // In a real implementation, this would remove the session from history
    // without deleting the actual session
    setHistory(history.filter(item => item.id !== sessionId));
  };

  // Filter history based on search query
  const filteredHistory = history.filter(session => 
    session.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (session.description && session.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (session.tags && session.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Session History
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={9}>
            <TextField
              fullWidth
              label="Search history"
              variant="outlined"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                endAdornment: (
                  <IconButton onClick={handleSearch}>
                    <SearchIcon />
                  </IconButton>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Button 
              fullWidth 
              variant="outlined" 
              startIcon={<HistoryIcon />}
              onClick={loadHistory}
            >
              Refresh History
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      <Paper sx={{ p: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
            <CircularProgress />
          </Box>
        ) : filteredHistory.length > 0 ? (
          <List>
            {filteredHistory.map((session) => (
              <ListItem 
                key={session.id} 
                divider 
                button 
                onClick={() => handleViewSession(session.id)}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="subtitle1">
                        {session.name}
                      </Typography>
                      {session.tags && session.tags.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, ml: 1 }}>
                          {session.tags.map((tag) => (
                            <Chip key={tag} label={tag} size="small" />
                          ))}
                        </Box>
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        {session.description || 'No description'}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Last updated: {formatDate(session.updatedAt)} | 
                        Created: {formatDate(session.createdAt)} | 
                        Framework: {session.createdWith || 'Unknown'}
                      </Typography>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton 
                    edge="end" 
                    aria-label="delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFromHistory(session.id);
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        ) : (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <HistoryIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="textSecondary">
              No session history found
            </Typography>
            <Typography color="textSecondary">
              {searchQuery ? 'Try adjusting your search criteria' : 'Create and use sessions to see them in your history'}
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}