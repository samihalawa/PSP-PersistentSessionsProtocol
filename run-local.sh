#!/bin/bash
# Start server in background
echo "Starting local server..."
npm start --workspace=packages/server > server.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Wait for server
sleep 2

# Run CLI
echo "Starting CLI..."
npm start --workspace=packages/cli

# Cleanup on exit
kill $SERVER_PID
