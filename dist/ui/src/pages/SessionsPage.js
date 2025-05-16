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
exports.default = SessionsPage;
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const x_data_grid_1 = require("@mui/x-data-grid");
const apiConfig_1 = require("../api/apiConfig");
const useSessionsList_1 = require("../hooks/useSessionsList");
// Format date
const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
};
function SessionsPage() {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const [selectedSession, setSelectedSession] = (0, react_1.useState)(null);
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [createDialogOpen, setCreateDialogOpen] = (0, react_1.useState)(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = (0, react_1.useState)(false);
    const [newSessionName, setNewSessionName] = (0, react_1.useState)('');
    const [newSessionDescription, setNewSessionDescription] = (0, react_1.useState)('');
    const [newSessionTags, setNewSessionTags] = (0, react_1.useState)('');
    // Last updated timestamp for UI
    const [lastUpdated, setLastUpdated] = (0, react_1.useState)(Date.now());
    // Get API client
    const apiClient = (0, apiConfig_1.getApiClient)();
    // Use sessions list hook
    const { sessions, loading, error, filters, updateFilters, refreshSessions: loadSessions, autoRefresh, refreshInterval } = (0, useSessionsList_1.useSessionsList)();
    // Define table columns
    const columns = [
        { field: 'id', headerName: 'ID', width: 70 },
        { field: 'name', headerName: 'Name', width: 200 },
        { field: 'description', headerName: 'Description', width: 300 },
        {
            field: 'createdAt',
            headerName: 'Created',
            width: 200,
            valueFormatter: (params) => formatDate(params.value)
        },
        {
            field: 'updatedAt',
            headerName: 'Updated',
            width: 200,
            valueFormatter: (params) => formatDate(params.value)
        },
        {
            field: 'tags',
            headerName: 'Tags',
            width: 300,
            renderCell: (params) => {
                const tags = params.value || [];
                return (<material_1.Box sx={{ display: 'flex', gap: 0.5 }}>
            {tags.map((tag) => (<material_1.Chip key={tag} label={tag} size="small"/>))}
          </material_1.Box>);
            }
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 200,
            renderCell: (params) => {
                return (<material_1.Box>
            <material_1.IconButton size="small" onClick={() => navigate(`/sessions/${params.row.id}`)} title="View Session">
              <icons_material_1.Visibility fontSize="small"/>
            </material_1.IconButton>
            <material_1.IconButton size="small" onClick={() => handleCloneSession(params.row)} title="Clone Session">
              <icons_material_1.ContentCopy fontSize="small"/>
            </material_1.IconButton>
            <material_1.IconButton size="small" onClick={() => handleEditSession(params.row)} title="Edit Session">
              <icons_material_1.Edit fontSize="small"/>
            </material_1.IconButton>
            <material_1.IconButton size="small" onClick={() => handleDeleteClick(params.row)} title="Delete Session">
              <icons_material_1.Delete fontSize="small"/>
            </material_1.IconButton>
          </material_1.Box>);
            }
        }
    ];
    // Load sessions
    const loadSessions = async () => {
        setLoading(true);
        setError(null);
        try {
            // Build filter based on search query
            const filters = {};
            if (searchQuery) {
                filters.name = searchQuery;
            }
            const response = await apiClient.listSessions(filters);
            setSessions(response);
        }
        catch (err) {
            console.error('Error loading sessions:', err);
            setError('Failed to load sessions. Please try again later.');
        }
        finally {
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
        const { validateSessionName, validateSessionDescription, validateTagsString } = await Promise.resolve().then(() => __importStar(require('../utils/Validation')));
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
        }
        catch (err) {
            console.error('Error creating session:', err);
            setError('Failed to create session. Please try again later.');
        }
    };
    // Handle clone session
    const handleCloneSession = async (session) => {
        try {
            await apiClient.createSession({
                name: `${session.name} (Clone)`,
                description: session.description,
                tags: session.tags
            });
            loadSessions();
        }
        catch (err) {
            console.error('Error cloning session:', err);
            setError('Failed to clone session. Please try again later.');
        }
    };
    // Handle edit session
    const handleEditSession = (session) => {
        navigate(`/sessions/${session.id}/edit`);
    };
    // Handle delete dialog
    const handleDeleteClick = (session) => {
        setSelectedSession(session);
        setDeleteDialogOpen(true);
    };
    const handleDeleteDialogClose = () => {
        setDeleteDialogOpen(false);
        setSelectedSession(null);
    };
    // Handle delete session
    const handleDeleteSession = async () => {
        if (!selectedSession)
            return;
        try {
            await apiClient.deleteSession(selectedSession.id);
            handleDeleteDialogClose();
            loadSessions();
        }
        catch (err) {
            console.error('Error deleting session:', err);
            setError('Failed to delete session. Please try again later.');
        }
    };
    // Filter sessions based on search query
    const filteredSessions = sessions.filter(session => session.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (session.description && session.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (session.tags && session.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))));
    return (<material_1.Box>
      <material_1.Typography variant="h4" gutterBottom>
        Sessions
      </material_1.Typography>
      
      {error && (<material_1.Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </material_1.Alert>)}
      
      <material_1.Paper sx={{ p: 2, mb: 2 }}>
        <material_1.Grid container spacing={2} alignItems="center">
          <material_1.Grid item xs={12} md={6}>
            <material_1.TextField fullWidth label="Search sessions" variant="outlined" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyPress={(e) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        }} InputProps={{
            endAdornment: (<material_1.IconButton onClick={handleSearch}>
                    <icons_material_1.Search />
                  </material_1.IconButton>)
        }}/>
          </material_1.Grid>
          <material_1.Grid item xs={4} md={2}>
            <material_1.Tooltip title={autoRefresh ? `Auto-refreshing every ${refreshInterval} seconds` : 'Auto-refresh disabled'}>
              <material_1.Button fullWidth variant="outlined" startIcon={autoRefresh ? (<material_1.Badge color="success" variant="dot">
                      <icons_material_1.AutorenewOutlined />
                    </material_1.Badge>) : (<icons_material_1.Refresh />)} onClick={() => {
            loadSessions();
            setLastUpdated(Date.now());
        }}>
                Refresh
              </material_1.Button>
            </material_1.Tooltip>
          </material_1.Grid>
          <material_1.Grid item xs={4} md={2}>
            <material_1.Typography variant="caption" color="textSecondary" sx={{ display: 'block', textAlign: 'center' }}>
              {autoRefresh ? `Auto-refresh: ${refreshInterval}s` : ''}
              {!autoRefresh && lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleTimeString()}` : ''}
            </material_1.Typography>
          </material_1.Grid>
          <material_1.Grid item xs={4} md={2}>
            <material_1.Button fullWidth variant="contained" startIcon={<icons_material_1.Add />} onClick={handleCreateDialogOpen}>
              Create
            </material_1.Button>
          </material_1.Grid>
        </material_1.Grid>
      </material_1.Paper>
      
      <material_1.Paper sx={{ height: 600, width: '100%' }}>
        {loading ? (<material_1.Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <material_1.CircularProgress />
          </material_1.Box>) : (<x_data_grid_1.DataGrid rows={filteredSessions} columns={columns} initialState={{
                pagination: {
                    paginationModel: { page: 0, pageSize: 10 },
                },
            }} pageSizeOptions={[5, 10, 25, 50]} disableRowSelectionOnClick/>)}
      </material_1.Paper>
      
      {/* Create Session Dialog */}
      <material_1.Dialog open={createDialogOpen} onClose={handleCreateDialogClose}>
        <material_1.DialogTitle>Create New Session</material_1.DialogTitle>
        <material_1.DialogContent>
          <material_1.DialogContentText>
            Fill in the details to create a new session.
          </material_1.DialogContentText>
          <material_1.TextField autoFocus margin="dense" label="Session Name" fullWidth variant="outlined" value={newSessionName} onChange={(e) => setNewSessionName(e.target.value)} sx={{ mb: 2 }}/>
          <material_1.TextField margin="dense" label="Description" fullWidth variant="outlined" value={newSessionDescription} onChange={(e) => setNewSessionDescription(e.target.value)} sx={{ mb: 2 }}/>
          <material_1.TextField margin="dense" label="Tags (comma separated)" fullWidth variant="outlined" value={newSessionTags} onChange={(e) => setNewSessionTags(e.target.value)} helperText="Example: auth, testing, production"/>
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={handleCreateDialogClose}>Cancel</material_1.Button>
          <material_1.Button onClick={handleCreateSession} variant="contained" disabled={!newSessionName}>
            Create
          </material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>
      
      {/* Delete Session Dialog */}
      <material_1.Dialog open={deleteDialogOpen} onClose={handleDeleteDialogClose}>
        <material_1.DialogTitle>Delete Session</material_1.DialogTitle>
        <material_1.DialogContent>
          <material_1.DialogContentText>
            Are you sure you want to delete the session "{selectedSession?.name}"? This action cannot be undone.
          </material_1.DialogContentText>
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={handleDeleteDialogClose}>Cancel</material_1.Button>
          <material_1.Button onClick={handleDeleteSession} color="error">
            Delete
          </material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>
    </material_1.Box>);
}
