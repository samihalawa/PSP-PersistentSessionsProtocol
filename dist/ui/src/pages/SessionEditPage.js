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
exports.default = SessionEditPage;
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const pspApi_1 = require("../api/pspApi");
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (<div role="tabpanel" hidden={value !== index} id={`tabpanel-${index}`} aria-labelledby={`tab-${index}`} {...other}>
      {value === index && (<material_1.Box sx={{ p: 3 }}>
          {children}
        </material_1.Box>)}
    </div>);
}
function SessionEditPage() {
    const { id } = (0, react_router_dom_1.useParams)();
    const navigate = (0, react_router_dom_1.useNavigate)();
    const [session, setSession] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [saving, setSaving] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [tabValue, setTabValue] = (0, react_1.useState)(0);
    // Form state
    const [name, setName] = (0, react_1.useState)('');
    const [description, setDescription] = (0, react_1.useState)('');
    const [tags, setTags] = (0, react_1.useState)([]);
    const [newTag, setNewTag] = (0, react_1.useState)('');
    const [cookies, setCookies] = (0, react_1.useState)([]);
    // Create API client
    const apiClient = new pspApi_1.PSPApiClient();
    // Load session
    const loadSession = async () => {
        if (!id)
            return;
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
        }
        catch (err) {
            console.error('Error loading session:', err);
            setError('Failed to load session. Please try again later.');
        }
        finally {
            setLoading(false);
        }
    };
    // Load session on component mount
    (0, react_1.useEffect)(() => {
        loadSession();
    }, [id]);
    // Handle tab change
    const handleTabChange = (event, newValue) => {
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
    const handleRemoveTag = (tagToRemove) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };
    // Handle cookie change
    const handleCookieChange = (index, field, value) => {
        const newCookies = [...cookies];
        newCookies[index][field] = value;
        setCookies(newCookies);
    };
    // Handle save session
    const handleSaveSession = async () => {
        if (!session)
            return;
        setSaving(true);
        setError(null);
        try {
            // Import validation functions
            const { validateSessionName, validateSessionDescription, validateTags, validateCookie } = await Promise.resolve().then(() => __importStar(require('../utils/Validation')));
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
        }
        catch (err) {
            console.error('Error saving session:', err);
            setError(err.message || 'Failed to save session. Please try again.');
        }
        finally {
            setSaving(false);
        }
    };
    // Handle cancel
    const handleCancel = () => {
        navigate(`/sessions/${id}`);
    };
    return (<material_1.Box>
      <material_1.Box sx={{ mb: 3 }}>
        <material_1.Button startIcon={<icons_material_1.ArrowBack />} onClick={() => navigate(`/sessions/${id}`)}>
          Back to Session
        </material_1.Button>
      </material_1.Box>
      
      <material_1.Typography variant="h4" gutterBottom>
        Edit Session
      </material_1.Typography>
      
      {error && (<material_1.Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </material_1.Alert>)}
      
      {loading ? (<material_1.Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <material_1.CircularProgress />
        </material_1.Box>) : session ? (<>
          <material_1.Paper sx={{ mb: 3 }}>
            <material_1.Box sx={{ p: 2 }}>
              <material_1.Typography variant="h6" gutterBottom>
                Session Metadata
              </material_1.Typography>
              
              <material_1.Grid container spacing={2}>
                <material_1.Grid item xs={12}>
                  <material_1.TextField fullWidth label="Session Name" variant="outlined" value={name} onChange={(e) => setName(e.target.value)} required margin="normal"/>
                </material_1.Grid>
                
                <material_1.Grid item xs={12}>
                  <material_1.TextField fullWidth label="Description" variant="outlined" value={description} onChange={(e) => setDescription(e.target.value)} multiline rows={2} margin="normal"/>
                </material_1.Grid>
                
                <material_1.Grid item xs={12}>
                  <material_1.Typography variant="subtitle2" gutterBottom>
                    Tags
                  </material_1.Typography>
                  
                  <material_1.Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                    {tags.map((tag) => (<material_1.Chip key={tag} label={tag} onDelete={() => handleRemoveTag(tag)} size="small"/>))}
                    {tags.length === 0 && (<material_1.Typography variant="body2" color="textSecondary">
                        No tags
                      </material_1.Typography>)}
                  </material_1.Box>
                  
                  <material_1.TextField label="Add Tag" variant="outlined" size="small" value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyPress={(e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                }
            }} InputProps={{
                endAdornment: (<material_1.InputAdornment position="end">
                          <material_1.IconButton onClick={handleAddTag} edge="end">
                            <icons_material_1.Add />
                          </material_1.IconButton>
                        </material_1.InputAdornment>)
            }}/>
                </material_1.Grid>
              </material_1.Grid>
            </material_1.Box>
          </material_1.Paper>
          
          <material_1.Paper sx={{ mb: 3 }}>
            <material_1.Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <material_1.Tabs value={tabValue} onChange={handleTabChange} aria-label="session data tabs">
                <material_1.Tab label="Cookies"/>
                <material_1.Tab label="Local Storage" disabled/>
                <material_1.Tab label="Session Storage" disabled/>
                <material_1.Tab label="Other Data" disabled/>
              </material_1.Tabs>
            </material_1.Box>
            
            <TabPanel value={tabValue} index={0}>
              <material_1.Typography variant="subtitle1" gutterBottom>
                Edit Cookies
              </material_1.Typography>
              
              {cookies.map((cookie, index) => (<material_1.Paper key={index} sx={{ p: 2, mb: 2 }}>
                  <material_1.Grid container spacing={2}>
                    <material_1.Grid item xs={12} md={6}>
                      <material_1.TextField fullWidth label="Name" variant="outlined" value={cookie.name} onChange={(e) => handleCookieChange(index, 'name', e.target.value)} margin="dense"/>
                    </material_1.Grid>
                    
                    <material_1.Grid item xs={12} md={6}>
                      <material_1.TextField fullWidth label="Value" variant="outlined" value={cookie.value} onChange={(e) => handleCookieChange(index, 'value', e.target.value)} margin="dense"/>
                    </material_1.Grid>
                    
                    <material_1.Grid item xs={12} md={6}>
                      <material_1.TextField fullWidth label="Domain" variant="outlined" value={cookie.domain} onChange={(e) => handleCookieChange(index, 'domain', e.target.value)} margin="dense"/>
                    </material_1.Grid>
                    
                    <material_1.Grid item xs={12} md={6}>
                      <material_1.TextField fullWidth label="Path" variant="outlined" value={cookie.path} onChange={(e) => handleCookieChange(index, 'path', e.target.value)} margin="dense"/>
                    </material_1.Grid>
                    
                    <material_1.Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <material_1.Button variant="outlined" color="error" startIcon={<icons_material_1.Delete />} onClick={() => setCookies(cookies.filter((_, i) => i !== index))}>
                        Remove Cookie
                      </material_1.Button>
                    </material_1.Grid>
                  </material_1.Grid>
                </material_1.Paper>))}
              
              <material_1.Box sx={{ mt: 2 }}>
                <material_1.Button variant="outlined" startIcon={<icons_material_1.Add />} onClick={() => setCookies([...cookies, {
                    name: '',
                    value: '',
                    domain: '',
                    path: '/',
                    expires: null,
                    httpOnly: false,
                    secure: false,
                    sameSite: 'Lax'
                }])}>
                  Add Cookie
                </material_1.Button>
              </material_1.Box>
            </TabPanel>
          </material_1.Paper>
          
          <material_1.Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <material_1.Button variant="outlined" startIcon={<icons_material_1.Cancel />} onClick={handleCancel}>
              Cancel
            </material_1.Button>
            
            <material_1.Button variant="contained" color="primary" startIcon={<icons_material_1.Save />} onClick={handleSaveSession} disabled={saving || !name}>
              {saving ? 'Saving...' : 'Save Session'}
            </material_1.Button>
          </material_1.Box>
        </>) : (<material_1.Alert severity="error">
          Session not found
        </material_1.Alert>)}
    </material_1.Box>);
}
