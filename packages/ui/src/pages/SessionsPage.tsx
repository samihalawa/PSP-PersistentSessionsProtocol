import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Paper,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  Badge,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ContentCopy as CloneIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  AutorenewOutlined as AutoRefreshIcon
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { getApiClient } from '../api/apiConfig';
import { useSessionsList } from '../hooks/useSessionsList';

// Format date
const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString();
};

export default function SessionsPage() {
  const navigate = useNavigate();
  const [selectedSession, setSelectedSession] = useState<SessionMetadata | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionDescription, setNewSessionDescription] = useState('');
  const [newSessionTags, setNewSessionTags] = useState('');

  // Last updated timestamp for UI
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  // Get API client
  const apiClient = getApiClient();

  // Use sessions list hook
  const {
    sessions,
    loading,
    error,
    filters,
    updateFilters,
    refreshSessions: loadSessions,
    autoRefresh,
    refreshInterval
  } = useSessionsList();

  // Define table columns
  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Name', width: 200 },
    { field: 'description', headerName: 'Description', width: 300 },
    { 
      field: 'createdAt', 
      headerName: 'Created', 
      width: 200,
      valueFormatter: (params) => formatDate(params.value as number)
    },
    { 
      field: 'updatedAt', 
      headerName: 'Updated', 
      width: 200,
      valueFormatter: (params) => formatDate(params.value as number)
    },
    {
      field: 'tags',
      headerName: 'Tags',
      width: 300,
      renderCell: (params: GridRenderCellParams) => {
        const tags = params.value as string[] || [];
        return (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {tags.map((tag) => (
              <Chip key={tag} label={tag} size="small" />
            ))}
          </Box>
        );
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      renderCell: (params: GridRenderCellParams) => {
        return (
          <Box>
            <IconButton 
              size="small" 
              onClick={() => navigate(`/sessions/${params.row.id}`)}
              title="View Session"
            >
              <ViewIcon fontSize="small" />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => handleCloneSession(params.row as SessionMetadata)}
              title="Clone Session"
            >
              <CloneIcon fontSize="small" />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => handleEditSession(params.row as SessionMetadata)}
              title="Edit Session"
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => handleDeleteClick(params.row as SessionMetadata)}
              title="Delete Session"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        );
      }
    }
  ];

  // Load sessions
  const loadSessions = async () => {
    setLoading(true);
    setError(null);

    try {
      // Build filter based on search query
      const filters: { name?: string } = {};

      if (searchQuery) {
        filters.name = searchQuery;
      }

      const response = await apiClient.listSessions(filters);
      setSessions(response);
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError('Failed to load sessions. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Load sessions on component mount
  useEffect(() => {
    loadSessions();
  }, []);

  // Handle search
  const handleSearch = () => {
    updateFilters({ name: searchQuery });
  };

  // Handle create session dialog
  const handleCreateDialogOpen = () => {
    setCreateDialogOpen(true);
  };

  const handleCreateDialogClose = () => {
    setCreateDialogOpen(false);
  };

  // Handle create session
  const handleCreateSession = async () => {
    // Import validation functions
    const { validateSessionName, validateSessionDescription, validateTagsString } = await import('../utils/Validation');

    // Validate input
    const nameError = validateSessionName(newSessionName);
    if (nameError) {
      setError(nameError);
      return;
    }

    const descriptionError = validateSessionDescription(newSessionDescription);
    if (descriptionError) {
      setError(descriptionError);
      return;
    }

    const { tags, errors } = validateTagsString(newSessionTags);
    if (errors.length > 0) {
      setError(errors[0]);
      return;
    }

    try {
      await apiClient.createSession({
        name: newSessionName,
        description: newSessionDescription,
        tags
      });

      handleCreateDialogClose();
      setNewSessionName('');
      setNewSessionDescription('');
      setNewSessionTags('');

      loadSessions();
    } catch (err) {
      console.error('Error creating session:', err);
      setError('Failed to create session. Please try again later.');
    }
  };

  // Handle clone session
  const handleCloneSession = async (session: SessionMetadata) => {
    try {
      await apiClient.createSession({
        name: `${session.name} (Clone)`,
        description: session.description,
        tags: session.tags
      });
      
      loadSessions();
    } catch (err) {
      console.error('Error cloning session:', err);
      setError('Failed to clone session. Please try again later.');
    }
  };

  // Handle edit session
  const handleEditSession = (session: SessionMetadata) => {
    navigate(`/sessions/${session.id}/edit`);
  };

  // Handle delete dialog
  const handleDeleteClick = (session: SessionMetadata) => {
    setSelectedSession(session);
    setDeleteDialogOpen(true);
  };

  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setSelectedSession(null);
  };

  // Handle delete session
  const handleDeleteSession = async () => {
    if (!selectedSession) return;
    
    try {
      await apiClient.deleteSession(selectedSession.id);
      handleDeleteDialogClose();
      loadSessions();
    } catch (err) {
      console.error('Error deleting session:', err);
      setError('Failed to delete session. Please try again later.');
    }
  };

  // Filter sessions based on search query
  const filteredSessions = sessions.filter(session => 
    session.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (session.description && session.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (session.tags && session.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Sessions
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Search sessions"
              variant="outlined"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              InputProps={{
                endAdornment: (
                  <IconButton onClick={handleSearch}>
                    <SearchIcon />
                  </IconButton>
                )
              }}
            />
          </Grid>
          <Grid item xs={4} md={2}>
            <Tooltip title={autoRefresh ? `Auto-refreshing every ${refreshInterval} seconds` : 'Auto-refresh disabled'}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={
                  autoRefresh ? (
                    <Badge color="success" variant="dot">
                      <AutoRefreshIcon />
                    </Badge>
                  ) : (
                    <RefreshIcon />
                  )
                }
                onClick={() => {
                  loadSessions();
                  setLastUpdated(Date.now());
                }}
              >
                Refresh
              </Button>
            </Tooltip>
          </Grid>
          <Grid item xs={4} md={2}>
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', textAlign: 'center' }}>
              {autoRefresh ? `Auto-refresh: ${refreshInterval}s` : ''}
              {!autoRefresh && lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleTimeString()}` : ''}
            </Typography>
          </Grid>
          <Grid item xs={4} md={2}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateDialogOpen}
            >
              Create
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      <Paper sx={{ height: 600, width: '100%' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : (
          <DataGrid
            rows={filteredSessions}
            columns={columns}
            initialState={{
              pagination: {
                paginationModel: { page: 0, pageSize: 10 },
              },
            }}
            pageSizeOptions={[5, 10, 25, 50]}
            disableRowSelectionOnClick
          />
        )}
      </Paper>
      
      {/* Create Session Dialog */}
      <Dialog open={createDialogOpen} onClose={handleCreateDialogClose}>
        <DialogTitle>Create New Session</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Fill in the details to create a new session.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Session Name"
            fullWidth
            variant="outlined"
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            variant="outlined"
            value={newSessionDescription}
            onChange={(e) => setNewSessionDescription(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Tags (comma separated)"
            fullWidth
            variant="outlined"
            value={newSessionTags}
            onChange={(e) => setNewSessionTags(e.target.value)}
            helperText="Example: auth, testing, production"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateDialogClose}>Cancel</Button>
          <Button 
            onClick={handleCreateSession} 
            variant="contained"
            disabled={!newSessionName}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Session Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteDialogClose}>
        <DialogTitle>Delete Session</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the session "{selectedSession?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose}>Cancel</Button>
          <Button onClick={handleDeleteSession} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}