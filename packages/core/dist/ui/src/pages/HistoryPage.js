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
exports.default = HistoryPage;
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const pspApi_1 = require("../api/pspApi");
// Format date
const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
};
function HistoryPage() {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const [history, setHistory] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    // Create API client
    const apiClient = new pspApi_1.PSPApiClient();
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
        }
        catch (err) {
            console.error('Error loading history:', err);
            setError('Failed to load session history. Please try again later.');
        }
        finally {
            setLoading(false);
        }
    };
    // Load history on component mount
    (0, react_1.useEffect)(() => {
        loadHistory();
    }, []);
    // Handle search
    const handleSearch = () => {
        loadHistory();
    };
    // Handle view session
    const handleViewSession = (sessionId) => {
        navigate(`/sessions/${sessionId}`);
    };
    // Handle delete from history
    const handleDeleteFromHistory = async (sessionId) => {
        // In a real implementation, this would remove the session from history
        // without deleting the actual session
        setHistory(history.filter(item => item.id !== sessionId));
    };
    // Filter history based on search query
    const filteredHistory = history.filter(session => session.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (session.description && session.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (session.tags && session.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))));
    return (<material_1.Box>
      <material_1.Typography variant="h4" gutterBottom>
        Session History
      </material_1.Typography>
      
      {error && (<material_1.Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </material_1.Alert>)}
      
      <material_1.Paper sx={{ p: 2, mb: 2 }}>
        <material_1.Grid container spacing={2} alignItems="center">
          <material_1.Grid item xs={12} md={9}>
            <material_1.TextField fullWidth label="Search history" variant="outlined" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} InputProps={{
            endAdornment: (<material_1.IconButton onClick={handleSearch}>
                    <icons_material_1.Search />
                  </material_1.IconButton>)
        }}/>
          </material_1.Grid>
          <material_1.Grid item xs={12} md={3}>
            <material_1.Button fullWidth variant="outlined" startIcon={<icons_material_1.History />} onClick={loadHistory}>
              Refresh History
            </material_1.Button>
          </material_1.Grid>
        </material_1.Grid>
      </material_1.Paper>
      
      <material_1.Paper sx={{ p: 2 }}>
        {loading ? (<material_1.Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
            <material_1.CircularProgress />
          </material_1.Box>) : filteredHistory.length > 0 ? (<material_1.List>
            {filteredHistory.map((session) => (<material_1.ListItem key={session.id} divider button onClick={() => handleViewSession(session.id)}>
                <material_1.ListItemText primary={<material_1.Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <material_1.Typography variant="subtitle1">
                        {session.name}
                      </material_1.Typography>
                      {session.tags && session.tags.length > 0 && (<material_1.Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, ml: 1 }}>
                          {session.tags.map((tag) => (<material_1.Chip key={tag} label={tag} size="small"/>))}
                        </material_1.Box>)}
                    </material_1.Box>} secondary={<material_1.Box>
                      <material_1.Typography variant="body2" color="textSecondary">
                        {session.description || 'No description'}
                      </material_1.Typography>
                      <material_1.Typography variant="caption" color="textSecondary">
                        Last updated: {formatDate(session.updatedAt)} | 
                        Created: {formatDate(session.createdAt)} | 
                        Framework: {session.createdWith || 'Unknown'}
                      </material_1.Typography>
                    </material_1.Box>}/>
                <material_1.ListItemSecondaryAction>
                  <material_1.IconButton edge="end" aria-label="delete" onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFromHistory(session.id);
                }}>
                    <icons_material_1.Delete />
                  </material_1.IconButton>
                </material_1.ListItemSecondaryAction>
              </material_1.ListItem>))}
          </material_1.List>) : (<material_1.Box sx={{ p: 4, textAlign: 'center' }}>
            <icons_material_1.History sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }}/>
            <material_1.Typography variant="h6" color="textSecondary">
              No session history found
            </material_1.Typography>
            <material_1.Typography color="textSecondary">
              {searchQuery ? 'Try adjusting your search criteria' : 'Create and use sessions to see them in your history'}
            </material_1.Typography>
          </material_1.Box>)}
      </material_1.Paper>
    </material_1.Box>);
}
