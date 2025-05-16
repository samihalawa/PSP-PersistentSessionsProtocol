#!/bin/bash
# Script to test and capture screenshots of the PSP Dashboard UI

# Install dependencies
echo "Installing dependencies..."
npm install

# Set mock API mode
export REACT_APP_USE_MOCK_API=true

# Start the app in the background
echo "Starting app in development mode with mock API..."
npm start &
SERVER_PID=$!

# Wait for the app to start
echo "Waiting for app to start..."
sleep 10

# Take screenshots using Playwright
echo "Taking screenshots with Playwright..."
npx playwright install --with-deps
npx playwright test

# Stop the app
echo "Stopping app..."
kill $SERVER_PID

echo "Test complete. Screenshots saved to screenshots directory."