#!/bin/bash

# Quick Deployment Script (Assumes files are already on server)
# Run from application root directory

set -e

echo "Quick Deployment - Glass Shop Application"

# Build Backend
echo "Building backend..."
cd GlassShop
mvn clean package -DskipTests || ./mvnw clean package -DskipTests
cd ..

# Build Frontend
echo "Building frontend..."
cd glass-ai-agent-frontend
npm install
npm run build
cd ..

# Restart Services
echo "Restarting services..."
sudo systemctl restart glassshop-backend
pm2 restart glassshop-frontend
sudo systemctl reload nginx

echo "Deployment complete!"

