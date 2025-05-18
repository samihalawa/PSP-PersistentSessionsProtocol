import React, { useState } from 'react';
import { 
  AppBar, 
  Box, 
  CssBaseline, 
  Divider, 
  Drawer, 
  IconButton, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Toolbar, 
  Typography,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  Storage as StorageIcon,
  PlayCircle as PlayCircleIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { Outlet, useNavigate } from 'react-router-dom';

// Width of the drawer
const drawerWidth = 240;

interface AppLayoutProps {
  window?: () => Window;
}

export default function AppLayout(props: AppLayoutProps) {
  const { window } = props;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const drawerContent = (
    <div className={`h-full ${theme.palette.mode === 'dark' ? 'bg-neutral-800 text-neutral-100' : 'bg-neutral-50 text-neutral-800'}`}>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          PSP Dashboard
        </Typography>
        {isMobile && (
          <IconButton onClick={handleDrawerToggle} className={`${theme.palette.mode === 'dark' ? 'text-neutral-100' : 'text-neutral-800'}`}>
            <CloseIcon />
          </IconButton>
        )}
      </Toolbar>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={() => handleNavigation('/')}>
            <ListItemIcon className={`${theme.palette.mode === 'dark' ? 'text-sky-400' : 'text-sky-600'}`}>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={() => handleNavigation('/sessions')}>
            <ListItemIcon className={`${theme.palette.mode === 'dark' ? 'text-sky-400' : 'text-sky-600'}`}>
              <StorageIcon />
            </ListItemIcon>
            <ListItemText primary="Sessions" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={() => handleNavigation('/recorder')}>
            <ListItemIcon className={`${theme.palette.mode === 'dark' ? 'text-sky-400' : 'text-sky-600'}`}>
              <PlayCircleIcon />
            </ListItemIcon>
            <ListItemText primary="Recorder" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={() => handleNavigation('/history')}>
            <ListItemIcon className={`${theme.palette.mode === 'dark' ? 'text-sky-400' : 'text-sky-600'}`}>
              <HistoryIcon />
            </ListItemIcon>
            <ListItemText primary="History" />
          </ListItemButton>
        </ListItem>
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={() => handleNavigation('/settings')}>
            <ListItemIcon className={`${theme.palette.mode === 'dark' ? 'text-sky-400' : 'text-sky-600'}`}>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  );

  const container = window !== undefined ? () => window().document.body : undefined;

  return (
    <Box sx={{ display: 'flex' }} className={`min-h-screen ${theme.palette.mode === 'dark' ? 'bg-neutral-900 text-neutral-50' : 'bg-neutral-100 text-neutral-900'}`}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
        elevation={1}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Persistent Sessions Protocol
          </Typography>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="navigation menu"
      >
        <Drawer
          container={container}
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
            },
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth, 
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          marginTop: '64px'
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}