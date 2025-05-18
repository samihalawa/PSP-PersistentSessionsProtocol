import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Grid,
  Paper,
  Typography,
  Alert
} from '@mui/material';
import {
  Storage as StorageIcon,
  PlayCircle as PlayCircleIcon,
  Timer as TimerIcon,
  Update as UpdateIcon
} from '@mui/icons-material';
import { PSPApiClient, SessionMetadata } from '../api/pspApi';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// Format date
const formatDate = (timestamp: number): string => {
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

export default function DashboardPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalSessions: 0,
    activeToday: 0,
    averageAge: 0,
    tagsCount: {} as Record<string, number>
  });

  // Create API client
  const apiClient = new PSPApiClient();

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
      const tagsCount: Record<string, number> = {};
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
  const frameworksCount: Record<string, number> = {};
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

  return (
    <Box className="p-4 md:p-6">
      <Typography variant="h4" gutterBottom className="mb-6 text-2xl font-semibold">
        Dashboard
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} className="mb-4">
          {error}
        </Alert>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }} className="flex justify-center items-center h-96">
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Stats cards */}
          <Grid container spacing={3} sx={{ mb: 4 }} className="mb-8">
            <Grid item xs={12} sm={6} md={3}>
              <Card className="shadow-lg rounded-lg hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-5">
                  <Typography color="textSecondary" gutterBottom className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                    Total Sessions
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }} className="flex items-center">
                    <StorageIcon sx={{ mr: 1 }} className="mr-2 text-sky-500" />
                    <Typography variant="h4" className="text-3xl font-bold">
                      {stats.totalSessions}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card className="shadow-lg rounded-lg hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-5">
                  <Typography color="textSecondary" gutterBottom className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                    Active Today
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }} className="flex items-center">
                    <UpdateIcon sx={{ mr: 1 }} className="mr-2 text-green-500" />
                    <Typography variant="h4" className="text-3xl font-bold">
                      {stats.activeToday}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card className="shadow-lg rounded-lg hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-5">
                  <Typography color="textSecondary" gutterBottom className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                    Average Age (days)
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }} className="flex items-center">
                    <TimerIcon sx={{ mr: 1 }} className="mr-2 text-amber-500" />
                    <Typography variant="h4" className="text-3xl font-bold">
                      {stats.averageAge}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card className="shadow-lg rounded-lg hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-5">
                  <Typography color="textSecondary" gutterBottom className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                    Unique Tags
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }} className="flex items-center">
                    <PlayCircleIcon sx={{ mr: 1 }} className="mr-2 text-purple-500" />
                    <Typography variant="h4" className="text-3xl font-bold">
                      {Object.keys(stats.tagsCount).length}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {/* Charts */}
          <Grid container spacing={3} sx={{ mb: 4 }} className="mb-8">
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }} className="p-4 shadow-lg rounded-lg">
                <Typography variant="h6" gutterBottom className="text-xl font-semibold mb-3">
                  Sessions by Tag
                </Typography>
                <Box sx={{ height: 300 }} className="h-72">
                  {Object.keys(stats.tagsCount).length > 0 ? (
                    <Pie data={tagsChartData} options={{ maintainAspectRatio: false, responsive: true }} />
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }} className="flex justify-center items-center h-full">
                      <Typography color="textSecondary" className="text-neutral-500 dark:text-neutral-400">
                        No tags available
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }} className="p-4 shadow-lg rounded-lg">
                <Typography variant="h6" gutterBottom className="text-xl font-semibold mb-3">
                  Sessions by Framework
                </Typography>
                <Box sx={{ height: 300 }}>
                  {Object.keys(frameworksCount).length > 0 ? (
                    <Bar
                      data={frameworksChartData}
                      options={{
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
                      }}
                    />
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <Typography color="textSecondary">
                        No framework data available
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>
          
          {/* Recent sessions */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Sessions
            </Typography>
            <Grid container spacing={2}>
              {recentSessions.length > 0 ? (
                recentSessions.map(session => (
                  <Grid item xs={12} sm={6} md={4} key={session.id}>
                    <Card>
                      <CardActionArea onClick={() => navigate(`/sessions/${session.id}`)}>
                        <CardContent>
                          <Typography variant="h6" noWrap>
                            {session.name}
                          </Typography>
                          <Typography color="textSecondary" gutterBottom noWrap>
                            {session.description || 'No description'}
                          </Typography>
                          <Typography variant="body2">
                            Updated: {formatDate(session.updatedAt)}
                          </Typography>
                          <Typography variant="body2">
                            Framework: {session.createdWith || 'Unknown'}
                          </Typography>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))
              ) : (
                <Grid item xs={12}>
                  <Typography color="textSecondary" sx={{ p: 2 }}>
                    No sessions available
                  </Typography>
                </Grid>
              )}
            </Grid>
            {sessions.length > 5 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Button variant="outlined" onClick={() => navigate('/sessions')}>
                  View All Sessions
                </Button>
              </Box>
            )}
          </Paper>
        </>
      )}
    </Box>
  );
}