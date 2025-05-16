# PSP Dashboard

A modern, responsive UI dashboard for the Persistent Sessions Protocol (PSP). This dashboard allows you to manage browser sessions across different frameworks with an intuitive interface.

![PSP Dashboard](screenshots/dashboard.png)

## Features

- **Session Management**: Create, view, edit, and delete browser sessions
- **Real-time Updates**: Get live updates when sessions change
- **Cross-Framework Support**: Works with sessions from Playwright, Selenium, Puppeteer, and other frameworks
- **Recording Playback**: View and replay recorded browser sessions
- **Theming Support**: Light and dark mode available
- **Mock API**: Test the UI without a backend server

## Screenshots

### Dashboard
![Dashboard](screenshots/dashboard.png)

### Sessions List
![Sessions List](screenshots/sessions-list.png)

### Session Details
![Session Details](screenshots/session-details.png)

### Session Recording
![Session Recording](screenshots/session-details-recording.png)

### Dark Mode
![Dark Mode](screenshots/dashboard-dark.png)

## Getting Started

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Start development server
npm start

# Start with mock API (no backend required)
REACT_APP_USE_MOCK_API=true npm start
```

### Production Build

```bash
# Build for production
npm run build

# Analyze bundle size
npm run build:analyze
```

## Configuration

The dashboard can be configured using the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_API_URL` | API server URL | `http://localhost:3000` |
| `REACT_APP_USE_MOCK_API` | Use mock API instead of real server | `false` |
| `REACT_APP_AUTO_REFRESH` | Enable auto-refresh | `false` |
| `REACT_APP_REFRESH_INTERVAL` | Auto-refresh interval in seconds | `30` |

## Architecture

The PSP Dashboard is built with the following technologies:

- **React**: UI library
- **TypeScript**: Type safety
- **Material UI**: Component library
- **React Router**: Navigation
- **Chart.js**: Data visualization
- **WebSockets**: Real-time updates

The application follows a layered architecture:

1. **Components**: Reusable UI building blocks
2. **Pages**: Full pages composed of components
3. **API**: Communication with the PSP server
4. **Hooks**: Custom React hooks for state management
5. **Utils**: Utility functions for common tasks

## Performance Optimizations

The dashboard is optimized for performance with the following techniques:

- **Lazy Loading**: Routes and components load on demand
- **Code Splitting**: Bundle splitting for better caching
- **Tree Shaking**: Unused code removal
- **Memoization**: Prevents unnecessary re-renders
- **Compression**: Reduced bundle size
- **Performance Monitoring**: Real-time performance tracking

## Contributing

See the main [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines on contributing to this project.