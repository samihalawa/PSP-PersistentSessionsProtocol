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
exports.default = DashboardPage;
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const pspApi_1 = require("../api/pspApi");
const chart_js_1 = require("chart.js");
const react_chartjs_2_1 = require("react-chartjs-2");
// Register ChartJS components
chart_js_1.Chart.register(chart_js_1.ArcElement, chart_js_1.Tooltip, chart_js_1.Legend, chart_js_1.CategoryScale, chart_js_1.LinearScale, chart_js_1.BarElement, chart_js_1.Title);
// Format date
const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
};
// Get random color
const getRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
};
function DashboardPage() {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const [sessions, setSessions] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [stats, setStats] = (0, react_1.useState)({
        totalSessions: 0,
        activeToday: 0,
        averageAge: 0,
        tagsCount: {}
    });
    // Create API client
    const apiClient = new pspApi_1.PSPApiClient();
    // Load sessions
    const loadSessions = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.listSessions();
            setSessions(response);
            // Calculate stats
            const now = Date.now();
            const oneDayAgo = now - 24 * 60 * 60 * 1000;
            // Count sessions active today
            const activeToday = response.filter(session => session.updatedAt >= oneDayAgo).length;
            // Calculate average age in days
            const totalAgeMs = response.reduce((sum, session) => sum + (now - session.createdAt), 0);
            const averageAgeMs = response.length > 0 ? totalAgeMs / response.length : 0;
            const averageAgeDays = Math.floor(averageAgeMs / (24 * 60 * 60 * 1000));
            // Count tags
            const tagsCount = {};
            response.forEach(session => {
                if (session.tags) {
                    session.tags.forEach(tag => {
                        tagsCount[tag] = (tagsCount[tag] || 0) + 1;
                    });
                }
            });
            setStats({
                totalSessions: response.length,
                activeToday,
                averageAge: averageAgeDays,
                tagsCount
            });
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
    (0, react_1.useEffect)(() => {
        loadSessions();
    }, []);
    // Prepare data for tags pie chart
    const tagsChartData = {
        labels: Object.keys(stats.tagsCount),
        datasets: [
            {
                label: 'Number of sessions',
                data: Object.values(stats.tagsCount),
                backgroundColor: Object.keys(stats.tagsCount).map(() => getRandomColor()),
                borderWidth: 1,
            },
        ],
    };
    // Prepare data for frameworks bar chart
    const frameworksCount = {};
    sessions.forEach(session => {
        if (session.createdWith) {
            frameworksCount[session.createdWith] = (frameworksCount[session.createdWith] || 0) + 1;
        }
    });
    const frameworksChartData = {
        labels: Object.keys(frameworksCount),
        datasets: [
            {
                label: 'Sessions by Framework',
                data: Object.values(frameworksCount),
                backgroundColor: 'rgba(53, 162, 235, 0.5)',
            },
        ],
    };
    // Get recent sessions (last 5)
    const recentSessions = [...sessions]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 5);
    return (<material_1.Box>
      <material_1.Typography variant="h4" gutterBottom>
        Dashboard
      </material_1.Typography>
      
      {error && (<material_1.Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </material_1.Alert>)}
      
      {loading ? (<material_1.Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <material_1.CircularProgress />
        </material_1.Box>) : (<>
          {/* Stats cards */}
          <material_1.Grid container spacing={3} sx={{ mb: 4 }}>
            <material_1.Grid item xs={12} sm={6} md={3}>
              <material_1.Card>
                <material_1.CardContent>
                  <material_1.Typography color="textSecondary" gutterBottom>
                    Total Sessions
                  </material_1.Typography>
                  <material_1.Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <icons_material_1.Storage sx={{ mr: 1 }}/>
                    <material_1.Typography variant="h4">
                      {stats.totalSessions}
                    </material_1.Typography>
                  </material_1.Box>
                </material_1.CardContent>
              </material_1.Card>
            </material_1.Grid>
            <material_1.Grid item xs={12} sm={6} md={3}>
              <material_1.Card>
                <material_1.CardContent>
                  <material_1.Typography color="textSecondary" gutterBottom>
                    Active Today
                  </material_1.Typography>
                  <material_1.Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <icons_material_1.Update sx={{ mr: 1 }}/>
                    <material_1.Typography variant="h4">
                      {stats.activeToday}
                    </material_1.Typography>
                  </material_1.Box>
                </material_1.CardContent>
              </material_1.Card>
            </material_1.Grid>
            <material_1.Grid item xs={12} sm={6} md={3}>
              <material_1.Card>
                <material_1.CardContent>
                  <material_1.Typography color="textSecondary" gutterBottom>
                    Average Age (days)
                  </material_1.Typography>
                  <material_1.Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <icons_material_1.Timer sx={{ mr: 1 }}/>
                    <material_1.Typography variant="h4">
                      {stats.averageAge}
                    </material_1.Typography>
                  </material_1.Box>
                </material_1.CardContent>
              </material_1.Card>
            </material_1.Grid>
            <material_1.Grid item xs={12} sm={6} md={3}>
              <material_1.Card>
                <material_1.CardContent>
                  <material_1.Typography color="textSecondary" gutterBottom>
                    Unique Tags
                  </material_1.Typography>
                  <material_1.Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <icons_material_1.PlayCircle sx={{ mr: 1 }}/>
                    <material_1.Typography variant="h4">
                      {Object.keys(stats.tagsCount).length}
                    </material_1.Typography>
                  </material_1.Box>
                </material_1.CardContent>
              </material_1.Card>
            </material_1.Grid>
          </material_1.Grid>
          
          {/* Charts */}
          <material_1.Grid container spacing={3} sx={{ mb: 4 }}>
            <material_1.Grid item xs={12} md={6}>
              <material_1.Paper sx={{ p: 2 }}>
                <material_1.Typography variant="h6" gutterBottom>
                  Sessions by Tag
                </material_1.Typography>
                <material_1.Box sx={{ height: 300 }}>
                  {Object.keys(stats.tagsCount).length > 0 ? (<react_chartjs_2_1.Pie data={tagsChartData}/>) : (<material_1.Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <material_1.Typography color="textSecondary">
                        No tags available
                      </material_1.Typography>
                    </material_1.Box>)}
                </material_1.Box>
              </material_1.Paper>
            </material_1.Grid>
            <material_1.Grid item xs={12} md={6}>
              <material_1.Paper sx={{ p: 2 }}>
                <material_1.Typography variant="h6" gutterBottom>
                  Sessions by Framework
                </material_1.Typography>
                <material_1.Box sx={{ height: 300 }}>
                  {Object.keys(frameworksCount).length > 0 ? (<react_chartjs_2_1.Bar data={frameworksChartData} options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0
                            }
                        }
                    }
                }}/>) : (<material_1.Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <material_1.Typography color="textSecondary">
                        No framework data available
                      </material_1.Typography>
                    </material_1.Box>)}
                </material_1.Box>
              </material_1.Paper>
            </material_1.Grid>
          </material_1.Grid>
          
          {/* Recent sessions */}
          <material_1.Paper sx={{ p: 2 }}>
            <material_1.Typography variant="h6" gutterBottom>
              Recent Sessions
            </material_1.Typography>
            <material_1.Grid container spacing={2}>
              {recentSessions.length > 0 ? (recentSessions.map(session => (<material_1.Grid item xs={12} sm={6} md={4} key={session.id}>
                    <material_1.Card>
                      <material_1.CardActionArea onClick={() => navigate(`/sessions/${session.id}`)}>
                        <material_1.CardContent>
                          <material_1.Typography variant="h6" noWrap>
                            {session.name}
                          </material_1.Typography>
                          <material_1.Typography color="textSecondary" gutterBottom noWrap>
                            {session.description || 'No description'}
                          </material_1.Typography>
                          <material_1.Typography variant="body2">
                            Updated: {formatDate(session.updatedAt)}
                          </material_1.Typography>
                          <material_1.Typography variant="body2">
                            Framework: {session.createdWith || 'Unknown'}
                          </material_1.Typography>
                        </material_1.CardContent>
                      </material_1.CardActionArea>
                    </material_1.Card>
                  </material_1.Grid>))) : (<material_1.Grid item xs={12}>
                  <material_1.Typography color="textSecondary" sx={{ p: 2 }}>
                    No sessions available
                  </material_1.Typography>
                </material_1.Grid>)}
            </material_1.Grid>
            {sessions.length > 5 && (<material_1.Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <material_1.Button variant="outlined" onClick={() => navigate('/sessions')}>
                  View All Sessions
                </material_1.Button>
              </material_1.Box>)}
          </material_1.Paper>
        </>)}
    </material_1.Box>);
}
