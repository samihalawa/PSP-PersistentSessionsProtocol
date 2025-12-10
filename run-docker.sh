#!/bin/bash
echo "Starting PSP Server in Docker..."
docker-compose up -d --build
echo "Server running at http://localhost:3000"
echo "To stop: docker-compose down"
