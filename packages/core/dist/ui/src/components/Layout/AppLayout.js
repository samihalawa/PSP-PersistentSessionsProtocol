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
exports.default = AppLayout;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const react_router_dom_1 = require("react-router-dom");
// Width of the drawer
const drawerWidth = 240;
function AppLayout(props) {
    const { window } = props;
    const theme = (0, material_1.useTheme)();
    const isMobile = (0, material_1.useMediaQuery)(theme.breakpoints.down('sm'));
    const [mobileOpen, setMobileOpen] = (0, react_1.useState)(false);
    const navigate = (0, react_router_dom_1.useNavigate)();
    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };
    const handleNavigation = (path) => {
        navigate(path);
        if (isMobile) {
            setMobileOpen(false);
        }
    };
    const drawer = (<div>
      <material_1.Toolbar>
        <material_1.Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          PSP Dashboard
        </material_1.Typography>
        {isMobile && (<material_1.IconButton onClick={handleDrawerToggle}>
            <icons_material_1.Close />
          </material_1.IconButton>)}
      </material_1.Toolbar>
      <material_1.Divider />
      <material_1.List>
        <material_1.ListItem disablePadding>
          <material_1.ListItemButton onClick={() => handleNavigation('/')}>
            <material_1.ListItemIcon>
              <icons_material_1.Dashboard />
            </material_1.ListItemIcon>
            <material_1.ListItemText primary="Dashboard"/>
          </material_1.ListItemButton>
        </material_1.ListItem>
        <material_1.ListItem disablePadding>
          <material_1.ListItemButton onClick={() => handleNavigation('/sessions')}>
            <material_1.ListItemIcon>
              <icons_material_1.Storage />
            </material_1.ListItemIcon>
            <material_1.ListItemText primary="Sessions"/>
          </material_1.ListItemButton>
        </material_1.ListItem>
        <material_1.ListItem disablePadding>
          <material_1.ListItemButton onClick={() => handleNavigation('/recorder')}>
            <material_1.ListItemIcon>
              <icons_material_1.PlayCircle />
            </material_1.ListItemIcon>
            <material_1.ListItemText primary="Recorder"/>
          </material_1.ListItemButton>
        </material_1.ListItem>
        <material_1.ListItem disablePadding>
          <material_1.ListItemButton onClick={() => handleNavigation('/history')}>
            <material_1.ListItemIcon>
              <icons_material_1.History />
            </material_1.ListItemIcon>
            <material_1.ListItemText primary="History"/>
          </material_1.ListItemButton>
        </material_1.ListItem>
      </material_1.List>
      <material_1.Divider />
      <material_1.List>
        <material_1.ListItem disablePadding>
          <material_1.ListItemButton onClick={() => handleNavigation('/settings')}>
            <material_1.ListItemIcon>
              <icons_material_1.Settings />
            </material_1.ListItemIcon>
            <material_1.ListItemText primary="Settings"/>
          </material_1.ListItemButton>
        </material_1.ListItem>
      </material_1.List>
    </div>);
    const container = window !== undefined ? () => window().document.body : undefined;
    return (<material_1.Box sx={{ display: 'flex' }}>
      <material_1.CssBaseline />
      <material_1.AppBar position="fixed" sx={{
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            ml: { sm: `${drawerWidth}px` },
        }}>
        <material_1.Toolbar>
          <material_1.IconButton color="inherit" aria-label="open drawer" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { sm: 'none' } }}>
            <icons_material_1.Menu />
          </material_1.IconButton>
          <material_1.Typography variant="h6" noWrap component="div">
            Persistent Sessions Protocol
          </material_1.Typography>
        </material_1.Toolbar>
      </material_1.AppBar>
      <material_1.Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }} aria-label="navigation menu">
        {/* Mobile drawer */}
        <material_1.Drawer container={container} variant="temporary" open={mobileOpen} onClose={handleDrawerToggle} ModalProps={{
            keepMounted: true, // Better open performance on mobile
        }} sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}>
          {drawer}
        </material_1.Drawer>
        {/* Desktop drawer */}
        <material_1.Drawer variant="permanent" sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }} open>
          {drawer}
        </material_1.Drawer>
      </material_1.Box>
      <material_1.Box component="main" sx={{
            flexGrow: 1,
            p: 3,
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            marginTop: '64px' // AppBar height
        }}>
        <react_router_dom_1.Outlet />
      </material_1.Box>
    </material_1.Box>);
}
