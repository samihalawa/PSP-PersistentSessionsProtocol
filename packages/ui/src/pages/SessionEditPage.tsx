import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  TextField,
  Typography,
  Alert,
  Tabs,
  Tab,
  Chip,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { PSPApiClient, Session } from '../api/pspApi';

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

export default function SessionEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [cookies, setCookies] = useState<any[]>([]);
  
  // Create API client
  const apiClient = new PSPApiClient();

  // Load session
  const loadSession = async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.getSession(id);
      setSession(response);
      
      // Initialize form state
      setName(response.metadata.name);
      setDescription(response.metadata.description || '');
      setTags(response.metadata.tags || []);
      setCookies(response.state.storage.cookies || []);
    } catch (err) {
      console.error('Error loading session:', err);
      setError('Failed to load session. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Load session on component mount
  useEffect(() => {
    loadSession();
  }, [id]);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Handle add tag
  const handleAddTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag('');
    }
  };

  // Handle remove tag
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Handle cookie change
  const handleCookieChange = (index: number, field: string, value: any) => {
    const newCookies = [...cookies];
    (newCookies[index] as any)[field] = value;
    setCookies(newCookies);
  };

  // Handle save session
  const handleSaveSession = async () => {
    if (!session) return;

    setSaving(true);
    setError(null);

    try {
      // Import validation functions
      const { validateSessionName, validateSessionDescription, validateTags, validateCookie } = await import('../utils/Validation');

      // Validate form
      const nameError = validateSessionName(name);
      if (nameError) {
        throw new Error(nameError);
      }

      const descriptionError = validateSessionDescription(description);
      if (descriptionError) {
        throw new Error(descriptionError);
      }

      const tagsError = validateTags(tags);
      if (tagsError) {
        throw new Error(tagsError);
      }

      // Validate cookies
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const cookieError = validateCookie(cookie);
        if (cookieError) {
          throw new Error(`Cookie #${i + 1}: ${cookieError}`);
        }
      }

      // Update session
      const updatedSession = {
        ...session,
        metadata: {
          ...session.metadata,
          name,
          description: description || undefined,
          tags,
          updatedAt: Date.now()
        },
        state: {
          ...session.state,
          storage: {
            ...session.state.storage,
            cookies
          }
        }
      };

      await apiClient.updateSession(session.metadata.id, updatedSession);

      navigate(`/sessions/${session.metadata.id}`);
    } catch (err: any) {
      console.error('Error saving session:', err);
      setError(err.message || 'Failed to save session. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    navigate(`/sessions/${id}`);
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate(`/sessions/${id}`)}
        >
          Back to Session
        </Button>
      </Box>
      
      <Typography variant="h4" gutterBottom>
        Edit Session
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <CircularProgress />
        </Box>
      ) : session ? (
        <>
          <Paper sx={{ mb: 3 }}>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Session Metadata
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Session Name"
                    variant="outlined"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    margin="normal"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    variant="outlined"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    multiline
                    rows={2}
                    margin="normal"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Tags
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                    {tags.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        onDelete={() => handleRemoveTag(tag)}
                        size="small"
                      />
                    ))}
                    {tags.length === 0 && (
                      <Typography variant="body2" color="textSecondary">
                        No tags
                      </Typography>
                    )}
                  </Box>
                  
                  <TextField
                    label="Add Tag"
                    variant="outlined"
                    size="small"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={handleAddTag} edge="end">
                            <AddIcon />
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
              </Grid>
            </Box>
          </Paper>
          
          <Paper sx={{ mb: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange} aria-label="session data tabs">
                <Tab label="Cookies" />
                <Tab label="Local Storage" disabled />
                <Tab label="Session Storage" disabled />
                <Tab label="Other Data" disabled />
              </Tabs>
            </Box>
            
            <TabPanel value={tabValue} index={0}>
              <Typography variant="subtitle1" gutterBottom>
                Edit Cookies
              </Typography>
              
              {cookies.map((cookie, index) => (
                <Paper key={index} sx={{ p: 2, mb: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Name"
                        variant="outlined"
                        value={cookie.name}
                        onChange={(e) => handleCookieChange(index, 'name', e.target.value)}
                        margin="dense"
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Value"
                        variant="outlined"
                        value={cookie.value}
                        onChange={(e) => handleCookieChange(index, 'value', e.target.value)}
                        margin="dense"
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Domain"
                        variant="outlined"
                        value={cookie.domain}
                        onChange={(e) => handleCookieChange(index, 'domain', e.target.value)}
                        margin="dense"
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Path"
                        variant="outlined"
                        value={cookie.path}
                        onChange={(e) => handleCookieChange(index, 'path', e.target.value)}
                        margin="dense"
                      />
                    </Grid>
                    
                    <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => setCookies(cookies.filter((_, i) => i !== index))}
                      >
                        Remove Cookie
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
              
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setCookies([...cookies, {
                    name: '',
                    value: '',
                    domain: '',
                    path: '/',
                    expires: null,
                    httpOnly: false,
                    secure: false,
                    sameSite: 'Lax' as 'Lax'
                  }])}
                >
                  Add Cookie
                </Button>
              </Box>
            </TabPanel>
          </Paper>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={handleCancel}
            >
              Cancel
            </Button>
            
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleSaveSession}
              disabled={saving || !name}
            >
              {saving ? 'Saving...' : 'Save Session'}
            </Button>
          </Box>
        </>
      ) : (
        <Alert severity="error">
          Session not found
        </Alert>
      )}
    </Box>
  );
}