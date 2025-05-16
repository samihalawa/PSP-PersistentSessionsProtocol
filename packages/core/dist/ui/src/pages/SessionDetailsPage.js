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
exports.default = SessionDetailsPage;
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const apiConfig_1 = require("../api/apiConfig");
const useSessionSubscription_1 = require("../hooks/useSessionSubscription");
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (<div role="tabpanel" hidden={value !== index} id={`tabpanel-${index}`} aria-labelledby={`tab-${index}`} {...other}>
      {value === index && (<material_1.Box sx={{ p: 3 }}>
          {children}
        </material_1.Box>)}
    </div>);
}
// Format date
const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
};
function SessionDetailsPage() {
    const { id } = (0, react_router_dom_1.useParams)();
    const navigate = (0, react_router_dom_1.useNavigate)();
    const [tabValue, setTabValue] = (0, react_1.useState)(0);
    const [editingMetadata, setEditingMetadata] = (0, react_1.useState)(false);
    const [editedName, setEditedName] = (0, react_1.useState)('');
    const [editedDescription, setEditedDescription] = (0, react_1.useState)('');
    const [editedTags, setEditedTags] = (0, react_1.useState)('');
    const [updateNotification, setUpdateNotification] = (0, react_1.useState)(null);
    // Get API client
    const apiClient = (0, apiConfig_1.getApiClient)();
    // Use session subscription hook for real-time updates
    const { session, loading, error, refreshSession: loadSession } = (0, useSessionSubscription_1.useSessionSubscription)(id || '');
    // Update editing fields when session changes
    react_1.default.useEffect(() => {
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
    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };
    // Handle edit metadata
    const handleEditMetadata = () => {
        setEditingMetadata(true);
    };
    // Handle save metadata
    const handleSaveMetadata = async () => {
        if (!session)
            return;
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
        }
        catch (err) {
            console.error('Error updating session metadata:', err);
            setError('Failed to update session metadata. Please try again later.');
        }
    };
    // Handle cancel edit metadata
    const handleCancelEditMetadata = () => {
        if (!session)
            return;
        setEditedName(session.metadata.name);
        setEditedDescription(session.metadata.description || '');
        setEditedTags((session.metadata.tags || []).join(', '));
        setEditingMetadata(false);
    };
    // Handle delete session
    const handleDeleteSession = async () => {
        if (!session)
            return;
        if (window.confirm(`Are you sure you want to delete session "${session.metadata.name}"?`)) {
            try {
                await apiClient.deleteSession(session.metadata.id);
                navigate('/sessions');
            }
            catch (err) {
                console.error('Error deleting session:', err);
                setError('Failed to delete session. Please try again later.');
            }
        }
    };
    // Handle clone session
    const handleCloneSession = async () => {
        if (!session)
            return;
        try {
            await apiClient.createSession({
                name: `${session.metadata.name} (Clone)`,
                description: session.metadata.description,
                tags: session.metadata.tags
            });
            navigate('/sessions');
        }
        catch (err) {
            console.error('Error cloning session:', err);
            setError('Failed to clone session. Please try again later.');
        }
    };
    return (<material_1.Box>
      <material_1.Box sx={{ mb: 3 }}>
        <material_1.Button startIcon={<icons_material_1.ArrowBack />} onClick={() => navigate('/sessions')}>
          Back to Sessions
        </material_1.Button>
      </material_1.Box>

      {error && (<material_1.Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </material_1.Alert>)}

      <material_1.Snackbar open={!!updateNotification} autoHideDuration={3000} onClose={() => setUpdateNotification(null)} message={updateNotification} sx={{
            '& .MuiSnackbarContent-root': {
                bgcolor: 'success.main',
                color: 'white'
            }
        }}/>

      {loading ? (<material_1.Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <material_1.CircularProgress />
        </material_1.Box>) : session ? (<>
          <material_1.Paper sx={{ mb: 3 }}>
            <material_1.Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <material_1.Box>
                {editingMetadata ? (<material_1.TextField fullWidth label="Session Name" variant="outlined" value={editedName} onChange={(e) => setEditedName(e.target.value)} sx={{ mb: 2 }}/>) : (<material_1.Typography variant="h4" gutterBottom>
                    {session.metadata.name}
                  </material_1.Typography>)}
                
                {editingMetadata ? (<material_1.TextField fullWidth label="Description" variant="outlined" value={editedDescription} onChange={(e) => setEditedDescription(e.target.value)} sx={{ mb: 2 }}/>) : (<material_1.Typography color="textSecondary" gutterBottom>
                    {session.metadata.description || 'No description'}
                  </material_1.Typography>)}
                
                {editingMetadata ? (<material_1.TextField fullWidth label="Tags (comma separated)" variant="outlined" value={editedTags} onChange={(e) => setEditedTags(e.target.value)} helperText="Example: auth, testing, production"/>) : (<material_1.Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                    {session.metadata.tags?.map((tag) => (<material_1.Chip key={tag} label={tag} size="small"/>)) || 'No tags'}
                  </material_1.Box>)}
              </material_1.Box>
              
              <material_1.Box>
                {editingMetadata ? (<>
                    <material_1.Button variant="contained" color="primary" startIcon={<icons_material_1.Save />} onClick={handleSaveMetadata} sx={{ mr: 1 }}>
                      Save
                    </material_1.Button>
                    <material_1.Button variant="outlined" onClick={handleCancelEditMetadata}>
                      Cancel
                    </material_1.Button>
                  </>) : (<>
                    <material_1.Button variant="outlined" startIcon={<icons_material_1.Refresh />} onClick={loadSession} sx={{ mr: 1 }}>
                      Refresh
                    </material_1.Button>
                    <material_1.Button variant="outlined" startIcon={<icons_material_1.Edit />} onClick={handleEditMetadata} sx={{ mr: 1 }}>
                      Edit
                    </material_1.Button>
                    <material_1.Button variant="outlined" startIcon={<icons_material_1.ContentCopy />} onClick={handleCloneSession} sx={{ mr: 1 }}>
                      Clone
                    </material_1.Button>
                    <material_1.Button variant="outlined" color="error" startIcon={<icons_material_1.Delete />} onClick={handleDeleteSession}>
                      Delete
                    </material_1.Button>
                  </>)}
              </material_1.Box>
            </material_1.Box>
            
            <material_1.Divider />
            
            <material_1.Box sx={{ p: 2 }}>
              <material_1.Grid container spacing={2}>
                <material_1.Grid item xs={12} sm={6} md={3}>
                  <material_1.Typography variant="subtitle2">ID</material_1.Typography>
                  <material_1.Typography variant="body2">{session.metadata.id}</material_1.Typography>
                </material_1.Grid>
                <material_1.Grid item xs={12} sm={6} md={3}>
                  <material_1.Typography variant="subtitle2">Created</material_1.Typography>
                  <material_1.Typography variant="body2">{formatDate(session.metadata.createdAt)}</material_1.Typography>
                </material_1.Grid>
                <material_1.Grid item xs={12} sm={6} md={3}>
                  <material_1.Typography variant="subtitle2">Updated</material_1.Typography>
                  <material_1.Typography variant="body2">{formatDate(session.metadata.updatedAt)}</material_1.Typography>
                </material_1.Grid>
                <material_1.Grid item xs={12} sm={6} md={3}>
                  <material_1.Typography variant="subtitle2">Framework</material_1.Typography>
                  <material_1.Typography variant="body2">{session.metadata.createdWith || 'Unknown'}</material_1.Typography>
                </material_1.Grid>
              </material_1.Grid>
            </material_1.Box>
          </material_1.Paper>
          
          <material_1.Paper>
            <material_1.Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <material_1.Tabs value={tabValue} onChange={handleTabChange} aria-label="session tabs">
                <material_1.Tab label="Cookies"/>
                <material_1.Tab label="Local Storage"/>
                <material_1.Tab label="Session Storage"/>
                <material_1.Tab label="Network"/>
                <material_1.Tab label="DOM"/>
                <material_1.Tab label="Recording"/>
              </material_1.Tabs>
            </material_1.Box>
            
            <TabPanel value={tabValue} index={0}>
              <material_1.Typography variant="h6" gutterBottom>
                Cookies
              </material_1.Typography>
              
              {session.state.storage.cookies.length > 0 ? (<material_1.TableContainer component={material_1.Paper}>
                  <material_1.Table>
                    <material_1.TableHead>
                      <material_1.TableRow>
                        <material_1.TableCell>Name</material_1.TableCell>
                        <material_1.TableCell>Value</material_1.TableCell>
                        <material_1.TableCell>Domain</material_1.TableCell>
                        <material_1.TableCell>Path</material_1.TableCell>
                        <material_1.TableCell>Expires</material_1.TableCell>
                        <material_1.TableCell>Flags</material_1.TableCell>
                      </material_1.TableRow>
                    </material_1.TableHead>
                    <material_1.TableBody>
                      {session.state.storage.cookies.map((cookie, index) => (<material_1.TableRow key={index}>
                          <material_1.TableCell>{cookie.name}</material_1.TableCell>
                          <material_1.TableCell>{cookie.value}</material_1.TableCell>
                          <material_1.TableCell>{cookie.domain}</material_1.TableCell>
                          <material_1.TableCell>{cookie.path}</material_1.TableCell>
                          <material_1.TableCell>
                            {cookie.expires ? formatDate(cookie.expires) : 'Session'}
                          </material_1.TableCell>
                          <material_1.TableCell>
                            {cookie.httpOnly && <material_1.Chip label="HttpOnly" size="small" sx={{ mr: 0.5 }}/>}
                            {cookie.secure && <material_1.Chip label="Secure" size="small" sx={{ mr: 0.5 }}/>}
                            <material_1.Chip label={`SameSite=${cookie.sameSite}`} size="small"/>
                          </material_1.TableCell>
                        </material_1.TableRow>))}
                    </material_1.TableBody>
                  </material_1.Table>
                </material_1.TableContainer>) : (<material_1.Typography color="textSecondary">No cookies available</material_1.Typography>)}
            </TabPanel>
            
            <TabPanel value={tabValue} index={1}>
              <material_1.Typography variant="h6" gutterBottom>
                Local Storage
              </material_1.Typography>
              
              {Object.keys(session.state.storage.localStorage).length > 0 ? (Object.entries(session.state.storage.localStorage).map(([origin, storage]) => (<material_1.Box key={origin} sx={{ mb: 4 }}>
                    <material_1.Typography variant="subtitle1" gutterBottom>
                      {origin}
                    </material_1.Typography>
                    
                    <material_1.TableContainer component={material_1.Paper}>
                      <material_1.Table>
                        <material_1.TableHead>
                          <material_1.TableRow>
                            <material_1.TableCell>Key</material_1.TableCell>
                            <material_1.TableCell>Value</material_1.TableCell>
                          </material_1.TableRow>
                        </material_1.TableHead>
                        <material_1.TableBody>
                          {Object.entries(storage).map(([key, value]) => (<material_1.TableRow key={key}>
                              <material_1.TableCell>{key}</material_1.TableCell>
                              <material_1.TableCell>{value}</material_1.TableCell>
                            </material_1.TableRow>))}
                        </material_1.TableBody>
                      </material_1.Table>
                    </material_1.TableContainer>
                  </material_1.Box>))) : (<material_1.Typography color="textSecondary">No localStorage data available</material_1.Typography>)}
            </TabPanel>
            
            <TabPanel value={tabValue} index={2}>
              <material_1.Typography variant="h6" gutterBottom>
                Session Storage
              </material_1.Typography>
              
              {Object.keys(session.state.storage.sessionStorage).length > 0 ? (Object.entries(session.state.storage.sessionStorage).map(([origin, storage]) => (<material_1.Box key={origin} sx={{ mb: 4 }}>
                    <material_1.Typography variant="subtitle1" gutterBottom>
                      {origin}
                    </material_1.Typography>
                    
                    <material_1.TableContainer component={material_1.Paper}>
                      <material_1.Table>
                        <material_1.TableHead>
                          <material_1.TableRow>
                            <material_1.TableCell>Key</material_1.TableCell>
                            <material_1.TableCell>Value</material_1.TableCell>
                          </material_1.TableRow>
                        </material_1.TableHead>
                        <material_1.TableBody>
                          {Object.entries(storage).map(([key, value]) => (<material_1.TableRow key={key}>
                              <material_1.TableCell>{key}</material_1.TableCell>
                              <material_1.TableCell>{value}</material_1.TableCell>
                            </material_1.TableRow>))}
                        </material_1.TableBody>
                      </material_1.Table>
                    </material_1.TableContainer>
                  </material_1.Box>))) : (<material_1.Typography color="textSecondary">No sessionStorage data available</material_1.Typography>)}
            </TabPanel>
            
            <TabPanel value={tabValue} index={3}>
              <material_1.Typography variant="h6" gutterBottom>
                Network
              </material_1.Typography>
              
              {session.state.network && session.state.network.captures?.length > 0 ? (<material_1.TableContainer component={material_1.Paper}>
                  <material_1.Table>
                    <material_1.TableHead>
                      <material_1.TableRow>
                        <material_1.TableCell>Method</material_1.TableCell>
                        <material_1.TableCell>URL</material_1.TableCell>
                        <material_1.TableCell>Status</material_1.TableCell>
                        <material_1.TableCell>Type</material_1.TableCell>
                        <material_1.TableCell>Timing</material_1.TableCell>
                      </material_1.TableRow>
                    </material_1.TableHead>
                    <material_1.TableBody>
                      {session.state.network.captures.map((capture, index) => (<material_1.TableRow key={index}>
                          <material_1.TableCell>{capture.request.method}</material_1.TableCell>
                          <material_1.TableCell>{capture.request.url}</material_1.TableCell>
                          <material_1.TableCell>{capture.response.status}</material_1.TableCell>
                          <material_1.TableCell>
                            {capture.response.headers['content-type'] || 'unknown'}
                          </material_1.TableCell>
                          <material_1.TableCell>
                            {(capture.timing.endTime - capture.timing.startTime).toFixed(2)}ms
                          </material_1.TableCell>
                        </material_1.TableRow>))}
                    </material_1.TableBody>
                  </material_1.Table>
                </material_1.TableContainer>) : (<material_1.Typography color="textSecondary">No network data available</material_1.Typography>)}
            </TabPanel>
            
            <TabPanel value={tabValue} index={4}>
              <material_1.Typography variant="h6" gutterBottom>
                DOM State
              </material_1.Typography>
              
              {session.state.dom ? (<material_1.Box>
                  <material_1.Typography variant="subtitle1" gutterBottom>
                    Scroll Position
                  </material_1.Typography>
                  <material_1.Typography>
                    X: {session.state.dom.scrollPosition?.x || 0}, 
                    Y: {session.state.dom.scrollPosition?.y || 0}
                  </material_1.Typography>
                  
                  {session.state.dom.activeElement && (<material_1.Box sx={{ mt: 2 }}>
                      <material_1.Typography variant="subtitle1" gutterBottom>
                        Active Element
                      </material_1.Typography>
                      <material_1.Typography>
                        Selector: {session.state.dom.activeElement.selector}
                      </material_1.Typography>
                      {session.state.dom.activeElement.value && (<material_1.Typography>
                          Value: {session.state.dom.activeElement.value}
                        </material_1.Typography>)}
                    </material_1.Box>)}
                  
                  {session.state.dom.formData && Object.keys(session.state.dom.formData).length > 0 && (<material_1.Box sx={{ mt: 2 }}>
                      <material_1.Typography variant="subtitle1" gutterBottom>
                        Form Data
                      </material_1.Typography>
                      <material_1.TableContainer component={material_1.Paper}>
                        <material_1.Table>
                          <material_1.TableHead>
                            <material_1.TableRow>
                              <material_1.TableCell>Selector</material_1.TableCell>
                              <material_1.TableCell>Value</material_1.TableCell>
                            </material_1.TableRow>
                          </material_1.TableHead>
                          <material_1.TableBody>
                            {Object.entries(session.state.dom.formData).map(([selector, value]) => (<material_1.TableRow key={selector}>
                                <material_1.TableCell>{selector}</material_1.TableCell>
                                <material_1.TableCell>{value}</material_1.TableCell>
                              </material_1.TableRow>))}
                          </material_1.TableBody>
                        </material_1.Table>
                      </material_1.TableContainer>
                    </material_1.Box>)}
                </material_1.Box>) : (<material_1.Typography color="textSecondary">No DOM state available</material_1.Typography>)}
            </TabPanel>
            
            <TabPanel value={tabValue} index={5}>
              <material_1.Typography variant="h6" gutterBottom>
                Recording
              </material_1.Typography>

              {session.state.recording ? (<material_1.Box>
                  {/* Import the SessionPlayer component dynamically to avoid bundling it when not needed */}
                  {react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('../components/Playback/SessionPlayer'))))}
                  <react_1.default.Suspense fallback={<material_1.CircularProgress />}>
                    {(() => {
                    // This is a dynamic import workaround
                    const SessionPlayer = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('../components/Playback/SessionPlayer'))));
                    return (<SessionPlayer sessionData={session.state.recording} onComplete={() => console.log('Playback complete')}/>);
                })()}
                  </react_1.default.Suspense>

                  <material_1.Typography variant="subtitle1" gutterBottom sx={{ mt: 4 }}>
                    Events Timeline
                  </material_1.Typography>

                  <material_1.TableContainer component={material_1.Paper}>
                    <material_1.Table>
                      <material_1.TableHead>
                        <material_1.TableRow>
                          <material_1.TableCell>Time</material_1.TableCell>
                          <material_1.TableCell>Type</material_1.TableCell>
                          <material_1.TableCell>Target</material_1.TableCell>
                          <material_1.TableCell>Details</material_1.TableCell>
                        </material_1.TableRow>
                      </material_1.TableHead>
                      <material_1.TableBody>
                        {session.state.recording.events.map((event, index) => (<material_1.TableRow key={index}>
                            <material_1.TableCell>{(event.timestamp / 1000).toFixed(2)}s</material_1.TableCell>
                            <material_1.TableCell>{event.type}</material_1.TableCell>
                            <material_1.TableCell>{event.target || 'N/A'}</material_1.TableCell>
                            <material_1.TableCell>
                              {event.data && JSON.stringify(event.data)}
                            </material_1.TableCell>
                          </material_1.TableRow>))}
                      </material_1.TableBody>
                    </material_1.Table>
                  </material_1.TableContainer>
                </material_1.Box>) : (<material_1.Typography color="textSecondary">No recording data available</material_1.Typography>)}
            </TabPanel>
          </material_1.Paper>
        </>) : (<material_1.Alert severity="error">
          Session not found
        </material_1.Alert>)}
    </material_1.Box>);
}
