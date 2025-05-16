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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const material_1 = require("@mui/material");
const LazyLoading_1 = require("./utils/LazyLoading");
const AppLayout_1 = __importDefault(require("./components/Layout/AppLayout"));
// Lazy load all pages to reduce initial bundle size
const DashboardPage = (0, LazyLoading_1.lazyRoute)(() => Promise.resolve().then(() => __importStar(require('./pages/DashboardPage'))));
const SessionsPage = (0, LazyLoading_1.lazyRoute)(() => Promise.resolve().then(() => __importStar(require('./pages/SessionsPage'))));
const SessionDetailsPage = (0, LazyLoading_1.lazyRoute)(() => Promise.resolve().then(() => __importStar(require('./pages/SessionDetailsPage'))));
const SessionEditPage = (0, LazyLoading_1.lazyRoute)(() => Promise.resolve().then(() => __importStar(require('./pages/SessionEditPage'))));
const RecorderPage = (0, LazyLoading_1.lazyRoute)(() => Promise.resolve().then(() => __importStar(require('./pages/RecorderPage'))));
const HistoryPage = (0, LazyLoading_1.lazyRoute)(() => Promise.resolve().then(() => __importStar(require('./pages/HistoryPage'))));
const SettingsPage = (0, LazyLoading_1.lazyRoute)(() => Promise.resolve().then(() => __importStar(require('./pages/SettingsPage'))));
function App() {
    // Get dark mode setting from localStorage
    const [darkMode, setDarkMode] = (0, react_1.useState)(() => {
        return localStorage.getItem('psp-dark-mode') === 'true';
    });
    // Create theme with dark mode support
    const theme = (0, react_1.useMemo)(() => (0, material_1.createTheme)({
        palette: {
            mode: darkMode ? 'dark' : 'light',
            primary: {
                main: '#0066cc',
            },
            secondary: {
                main: '#f50057',
            },
        },
        // Optimize typography for performance
        typography: {
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
        },
        // Optimize component defaults for performance
        components: {
            MuiButtonBase: {
                defaultProps: {
                    disableRipple: true, // Disable ripple effect for better performance
                },
            },
            MuiTableCell: {
                defaultProps: {
                    size: 'small', // Use small sized table cells by default
                },
            },
        },
    }), [darkMode]);
    // Initialize performance tracking
    (0, react_1.useEffect)(() => {
        // Import performance tracking utils dynamically
        Promise.resolve().then(() => __importStar(require('./utils/Performance'))).then(({ trackPerformance }) => {
            trackPerformance();
            // Log performance metrics after load
            setTimeout(() => {
                Promise.resolve().then(() => __importStar(require('./utils/Performance'))).then(({ getPerformanceData }) => {
                    console.log('Performance metrics:', getPerformanceData());
                });
            }, 5000);
        });
    }, []);
    // Listen for dark mode setting changes
    (0, react_1.useEffect)(() => {
        const handleStorageChange = (e) => {
            if (e.key === 'psp-dark-mode') {
                setDarkMode(e.newValue === 'true');
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);
    return (<material_1.ThemeProvider theme={theme}>
      <material_1.CssBaseline />
      <react_router_dom_1.BrowserRouter>
        <react_router_dom_1.Routes>
          <react_router_dom_1.Route path="/" element={<AppLayout_1.default />}>
            <react_router_dom_1.Route index element={<DashboardPage />}/>
            <react_router_dom_1.Route path="sessions" element={<SessionsPage />}/>
            <react_router_dom_1.Route path="sessions/:id" element={<SessionDetailsPage />}/>
            <react_router_dom_1.Route path="sessions/:id/edit" element={<SessionEditPage />}/>
            <react_router_dom_1.Route path="recorder" element={<RecorderPage />}/>
            <react_router_dom_1.Route path="history" element={<HistoryPage />}/>
            <react_router_dom_1.Route path="settings" element={<SettingsPage />}/>
            <react_router_dom_1.Route path="*" element={<react_router_dom_1.Navigate to="/" replace/>}/>
          </react_router_dom_1.Route>
        </react_router_dom_1.Routes>
      </react_router_dom_1.BrowserRouter>
    </material_1.ThemeProvider>);
}
exports.default = App;
