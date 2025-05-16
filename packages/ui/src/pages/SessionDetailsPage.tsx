import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Paper,
  Tab,
  Tabs,
  Typography,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Snackbar
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
  ContentCopy as CloneIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { getApiClient } from '../api/apiConfig';
import { useSessionSubscription } from '../hooks/useSessionSubscription';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Format date
const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString();
};

export default function SessionDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [editingMetadata, setEditingMetadata] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedTags, setEditedTags] = useState('');
  const [updateNotification, setUpdateNotification] = useState<string | null>(null);

  // Get API client
  const apiClient = getApiClient();

  // Use session subscription hook for real-time updates
  const {
    session,
    loading,
    error,
    refreshSession: loadSession
  } = useSessionSubscription(id || '');

  // Update editing fields when session changes
  React.useEffect(() => {
    if (session) {
      setEditedName(session.metadata.name);
      setEditedDescription(session.metadata.description || '');
      setEditedTags((session.metadata.tags || []).join(', '));

      // Show notification if this is a session update
      if (!loading && !editingMetadata) {
        setUpdateNotification('Session updated in real-time');
        // Auto-hide after 3 seconds
        setTimeout(() => setUpdateNotification(null), 3000);
      }
    }
  }, [session?.metadata.updatedAt]);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Handle edit metadata
  const handleEditMetadata = () => {
    setEditingMetadata(true);
  };

  // Handle save metadata
  const handleSaveMetadata = async () => {
    if (!session) return;
    
    try {
      const tags = editedTags.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
      
      const updatedMetadata = {
        ...session.metadata,
        name: editedName,
        description: editedDescription || undefined,
        tags
      };
      
      await apiClient.updateSession(session.metadata.id, { 
        metadata: updatedMetadata,
        state: session.state
      });
      
      setEditingMetadata(false);
      loadSession();
    } catch (err) {
      console.error('Error updating session metadata:', err);
      setError('Failed to update session metadata. Please try again later.');
    }
  };

  // Handle cancel edit metadata
  const handleCancelEditMetadata = () => {
    if (!session) return;
    
    setEditedName(session.metadata.name);
    setEditedDescription(session.metadata.description || '');
    setEditedTags((session.metadata.tags || []).join(', '));
    setEditingMetadata(false);
  };

  // Handle delete session
  const handleDeleteSession = async () => {
    if (!session) return;
    
    if (window.confirm(`Are you sure you want to delete session "${session.metadata.name}"?`)) {
      try {
        await apiClient.deleteSession(session.metadata.id);
        navigate('/sessions');
      } catch (err) {
        console.error('Error deleting session:', err);
        setError('Failed to delete session. Please try again later.');
      }
    }
  };

  // Handle clone session
  const handleCloneSession = async () => {
    if (!session) return;
    
    try {
      await apiClient.createSession({
        name: `${session.metadata.name} (Clone)`,
        description: session.metadata.description,
        tags: session.metadata.tags
      });
      
      navigate('/sessions');
    } catch (err) {
      console.error('Error cloning session:', err);
      setError('Failed to clone session. Please try again later.');
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/sessions')}
        >
          Back to Sessions
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Snackbar
        open={!!updateNotification}
        autoHideDuration={3000}
        onClose={() => setUpdateNotification(null)}
        message={updateNotification}
        sx={{
          '& .MuiSnackbarContent-root': {
            bgcolor: 'success.main',
            color: 'white'
          }
        }}
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <CircularProgress />
        </Box>
      ) : session ? (
        <>
          <Paper sx={{ mb: 3 }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                {editingMetadata ? (
                  <TextField
                    fullWidth
                    label="Session Name"
                    variant="outlined"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                ) : (
                  <Typography variant="h4" gutterBottom>
                    {session.metadata.name}
                  </Typography>
                )}
                
                {editingMetadata ? (
                  <TextField
                    fullWidth
                    label="Description"
                    variant="outlined"
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                ) : (
                  <Typography color="textSecondary" gutterBottom>
                    {session.metadata.description || 'No description'}
                  </Typography>
                )}
                
                {editingMetadata ? (
                  <TextField
                    fullWidth
                    label="Tags (comma separated)"
                    variant="outlined"
                    value={editedTags}
                    onChange={(e) => setEditedTags(e.target.value)}
                    helperText="Example: auth, testing, production"
                  />
                ) : (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                    {session.metadata.tags?.map((tag) => (
                      <Chip key={tag} label={tag} size="small" />
                    )) || 'No tags'}
                  </Box>
                )}
              </Box>
              
              <Box>
                {editingMetadata ? (
                  <>
                    <Button 
                      variant="contained" 
                      color="primary" 
                      startIcon={<SaveIcon />}
                      onClick={handleSaveMetadata}
                      sx={{ mr: 1 }}
                    >
                      Save
                    </Button>
                    <Button 
                      variant="outlined" 
                      onClick={handleCancelEditMetadata}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      variant="outlined" 
                      startIcon={<RefreshIcon />}
                      onClick={loadSession}
                      sx={{ mr: 1 }}
                    >
                      Refresh
                    </Button>
                    <Button 
                      variant="outlined" 
                      startIcon={<EditIcon />}
                      onClick={handleEditMetadata}
                      sx={{ mr: 1 }}
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="outlined" 
                      startIcon={<CloneIcon />}
                      onClick={handleCloneSession}
                      sx={{ mr: 1 }}
                    >
                      Clone
                    </Button>
                    <Button 
                      variant="outlined" 
                      color="error" 
                      startIcon={<DeleteIcon />}
                      onClick={handleDeleteSession}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </Box>
            </Box>
            
            <Divider />
            
            <Box sx={{ p: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2">ID</Typography>
                  <Typography variant="body2">{session.metadata.id}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2">Created</Typography>
                  <Typography variant="body2">{formatDate(session.metadata.createdAt)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2">Updated</Typography>
                  <Typography variant="body2">{formatDate(session.metadata.updatedAt)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2">Framework</Typography>
                  <Typography variant="body2">{session.metadata.createdWith || 'Unknown'}</Typography>
                </Grid>
              </Grid>
            </Box>
          </Paper>
          
          <Paper>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange} aria-label="session tabs">
                <Tab label="Cookies" />
                <Tab label="Local Storage" />
                <Tab label="Session Storage" />
                <Tab label="Network" />
                <Tab label="DOM" />
                <Tab label="Recording" />
              </Tabs>
            </Box>
            
            <TabPanel value={tabValue} index={0}>
              <Typography variant="h6" gutterBottom>
                Cookies
              </Typography>
              
              {session.state.storage.cookies.length > 0 ? (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Value</TableCell>
                        <TableCell>Domain</TableCell>
                        <TableCell>Path</TableCell>
                        <TableCell>Expires</TableCell>
                        <TableCell>Flags</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {session.state.storage.cookies.map((cookie, index) => (
                        <TableRow key={index}>
                          <TableCell>{cookie.name}</TableCell>
                          <TableCell>{cookie.value}</TableCell>
                          <TableCell>{cookie.domain}</TableCell>
                          <TableCell>{cookie.path}</TableCell>
                          <TableCell>
                            {cookie.expires ? formatDate(cookie.expires) : 'Session'}
                          </TableCell>
                          <TableCell>
                            {cookie.httpOnly && <Chip label="HttpOnly" size="small" sx={{ mr: 0.5 }} />}
                            {cookie.secure && <Chip label="Secure" size="small" sx={{ mr: 0.5 }} />}
                            <Chip label={`SameSite=${cookie.sameSite}`} size="small" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="textSecondary">No cookies available</Typography>
              )}
            </TabPanel>
            
            <TabPanel value={tabValue} index={1}>
              <Typography variant="h6" gutterBottom>
                Local Storage
              </Typography>
              
              {Object.keys(session.state.storage.localStorage).length > 0 ? (
                Object.entries(session.state.storage.localStorage).map(([origin, storage]) => (
                  <Box key={origin} sx={{ mb: 4 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      {origin}
                    </Typography>
                    
                    <TableContainer component={Paper}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Key</TableCell>
                            <TableCell>Value</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.entries(storage).map(([key, value]) => (
                            <TableRow key={key}>
                              <TableCell>{key}</TableCell>
                              <TableCell>{value}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                ))
              ) : (
                <Typography color="textSecondary">No localStorage data available</Typography>
              )}
            </TabPanel>
            
            <TabPanel value={tabValue} index={2}>
              <Typography variant="h6" gutterBottom>
                Session Storage
              </Typography>
              
              {Object.keys(session.state.storage.sessionStorage).length > 0 ? (
                Object.entries(session.state.storage.sessionStorage).map(([origin, storage]) => (
                  <Box key={origin} sx={{ mb: 4 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      {origin}
                    </Typography>
                    
                    <TableContainer component={Paper}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Key</TableCell>
                            <TableCell>Value</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.entries(storage).map(([key, value]) => (
                            <TableRow key={key}>
                              <TableCell>{key}</TableCell>
                              <TableCell>{value}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                ))
              ) : (
                <Typography color="textSecondary">No sessionStorage data available</Typography>
              )}
            </TabPanel>
            
            <TabPanel value={tabValue} index={3}>
              <Typography variant="h6" gutterBottom>
                Network
              </Typography>
              
              {session.state.network && session.state.network.captures?.length > 0 ? (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Method</TableCell>
                        <TableCell>URL</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Timing</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {session.state.network.captures.map((capture, index) => (
                        <TableRow key={index}>
                          <TableCell>{capture.request.method}</TableCell>
                          <TableCell>{capture.request.url}</TableCell>
                          <TableCell>{capture.response.status}</TableCell>
                          <TableCell>
                            {capture.response.headers['content-type'] || 'unknown'}
                          </TableCell>
                          <TableCell>
                            {(capture.timing.endTime - capture.timing.startTime).toFixed(2)}ms
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="textSecondary">No network data available</Typography>
              )}
            </TabPanel>
            
            <TabPanel value={tabValue} index={4}>
              <Typography variant="h6" gutterBottom>
                DOM State
              </Typography>
              
              {session.state.dom ? (
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Scroll Position
                  </Typography>
                  <Typography>
                    X: {session.state.dom.scrollPosition?.x || 0}, 
                    Y: {session.state.dom.scrollPosition?.y || 0}
                  </Typography>
                  
                  {session.state.dom.activeElement && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Active Element
                      </Typography>
                      <Typography>
                        Selector: {session.state.dom.activeElement.selector}
                      </Typography>
                      {session.state.dom.activeElement.value && (
                        <Typography>
                          Value: {session.state.dom.activeElement.value}
                        </Typography>
                      )}
                    </Box>
                  )}
                  
                  {session.state.dom.formData && Object.keys(session.state.dom.formData).length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Form Data
                      </Typography>
                      <TableContainer component={Paper}>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Selector</TableCell>
                              <TableCell>Value</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {Object.entries(session.state.dom.formData).map(([selector, value]) => (
                              <TableRow key={selector}>
                                <TableCell>{selector}</TableCell>
                                <TableCell>{value}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}
                </Box>
              ) : (
                <Typography color="textSecondary">No DOM state available</Typography>
              )}
            </TabPanel>
            
            <TabPanel value={tabValue} index={5}>
              <Typography variant="h6" gutterBottom>
                Recording
              </Typography>

              {session.state.recording ? (
                <Box>
                  {/* Import the SessionPlayer component dynamically to avoid bundling it when not needed */}
                  {React.lazy(() => import('../components/Playback/SessionPlayer'))}
                  <React.Suspense fallback={<CircularProgress />}>
                    {(() => {
                      // This is a dynamic import workaround
                      const SessionPlayer = React.lazy(() => import('../components/Playback/SessionPlayer'));
                      return (
                        <SessionPlayer
                          sessionData={session.state.recording}
                          onComplete={() => console.log('Playback complete')}
                        />
                      );
                    })()}
                  </React.Suspense>

                  <Typography variant="subtitle1" gutterBottom sx={{ mt: 4 }}>
                    Events Timeline
                  </Typography>

                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Time</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Target</TableCell>
                          <TableCell>Details</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {session.state.recording.events.map((event, index) => (
                          <TableRow key={index}>
                            <TableCell>{(event.timestamp / 1000).toFixed(2)}s</TableCell>
                            <TableCell>{event.type}</TableCell>
                            <TableCell>{event.target || 'N/A'}</TableCell>
                            <TableCell>
                              {event.data && JSON.stringify(event.data)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ) : (
                <Typography color="textSecondary">No recording data available</Typography>
              )}
            </TabPanel>
          </Paper>
        </>
      ) : (
        <Alert severity="error">
          Session not found
        </Alert>
      )}
    </Box>
  );
}