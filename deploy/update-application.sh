#!/bin/bash

# Application Update Script
# Use this to update the application after code changes

set -e

echo "=========================================="
echo "Glass Shop - Application Update"
echo "=========================================="

APP_DIR="/opt/glassshop"
BACKEND_DIR="$APP_DIR/GlassShop"
FRONTEND_DIR="$APP_DIR/glass-ai-agent-frontend"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run with: sudo ./update-application.sh"
    exit 1
fi

# Check if directories exist
if [ ! -d "$BACKEND_DIR" ] || [ ! -d "$FRONTEND_DIR" ]; then
    echo "ERROR: Application directories not found!"
    exit 1
fi

# Ask what to update
echo ""
echo "What would you like to update?"
echo "1) Backend only"
echo "2) Frontend only"
echo "3) Both (Full update)"
read -p "Enter choice [3]: " UPDATE_CHOICE
UPDATE_CHOICE=${UPDATE_CHOICE:-3}

# Backup current build
echo ""
echo "Creating backup..."
BACKUP_DIR="/opt/glassshop/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

if [ "$UPDATE_CHOICE" = "1" ] || [ "$UPDATE_CHOICE" = "3" ]; then
    if [ -f "$BACKEND_DIR/target/GlassShop-0.0.1-SNAPSHOT.jar" ]; then
        cp "$BACKEND_DIR/target/GlassShop-0.0.1-SNAPSHOT.jar" "$BACKUP_DIR/" 2>/dev/null || true
    fi
fi

if [ "$UPDATE_CHOICE" = "2" ] || [ "$UPDATE_CHOICE" = "3" ]; then
    if [ -d "$FRONTEND_DIR/build" ]; then
        cp -r "$FRONTEND_DIR/build" "$BACKUP_DIR/frontend-build" 2>/dev/null || true
    fi
fi

echo "✓ Backup created at $BACKUP_DIR"

# Update Backend
if [ "$UPDATE_CHOICE" = "1" ] || [ "$UPDATE_CHOICE" = "3" ]; then
    echo ""
    echo "[1/2] Updating Backend..."
    cd "$BACKEND_DIR"
    
    # Pull latest code if using Git
    if [ -d ".git" ]; then
        echo "  Pulling latest code..."
        git pull
    fi
    
    # Build
    echo "  Building backend (this may take a few minutes)..."
    if [ -f "mvnw" ]; then
        ./mvnw clean package -DskipTests
    else
        mvn clean package -DskipTests
    fi
    
    if [ ! -f "target/GlassShop-0.0.1-SNAPSHOT.jar" ]; then
        echo "ERROR: Backend build failed!"
        echo "Restoring from backup..."
        if [ -f "$BACKUP_DIR/GlassShop-0.0.1-SNAPSHOT.jar" ]; then
            cp "$BACKUP_DIR/GlassShop-0.0.1-SNAPSHOT.jar" "$BACKEND_DIR/target/"
        fi
        exit 1
    fi
    
    # Restart service
    echo "  Restarting backend service..."
    systemctl restart glassshop-backend
    
    # Wait for service to start
    sleep 5
    
    # Check status
    if systemctl is-active --quiet glassshop-backend; then
        echo "✓ Backend updated and running"
    else
        echo "✗ Backend failed to start. Check logs:"
        echo "  sudo journalctl -u glassshop-backend -n 50"
        exit 1
    fi
fi

# Update Frontend
if [ "$UPDATE_CHOICE" = "2" ] || [ "$UPDATE_CHOICE" = "3" ]; then
    echo ""
    echo "[2/2] Updating Frontend..."
    cd "$FRONTEND_DIR"
    
    # Pull latest code if using Git
    if [ -d ".git" ]; then
        echo "  Pulling latest code..."
        git pull
    fi
    
    # Install dependencies
    echo "  Installing dependencies..."
    npm install --silent
    
    # Build
    echo "  Building frontend (this may take a few minutes)..."
    npm run build
    
    if [ ! -d "build" ]; then
        echo "ERROR: Frontend build failed!"
        echo "Restoring from backup..."
        if [ -d "$BACKUP_DIR/frontend-build" ]; then
            cp -r "$BACKUP_DIR/frontend-build" "$FRONTEND_DIR/build"
        fi
        exit 1
    fi
    
    # Restart PM2
    echo "  Restarting frontend service..."
    pm2 restart glassshop-frontend
    
    # Check status
    sleep 2
    if pm2 list | grep -q "glassshop-frontend.*online"; then
        echo "✓ Frontend updated and running"
    else
        echo "✗ Frontend failed to start. Check logs:"
        echo "  pm2 logs glassshop-frontend"
        exit 1
    fi
fi

# Reload Nginx
echo ""
echo "Reloading Nginx..."
systemctl reload nginx

echo ""
echo "=========================================="
echo "Update Complete!"
echo "=========================================="
echo ""
echo "Service Status:"
if [ "$UPDATE_CHOICE" = "1" ] || [ "$UPDATE_CHOICE" = "3" ]; then
    systemctl is-active glassshop-backend > /dev/null && echo "  ✓ Backend: Running" || echo "  ✗ Backend: Not Running"
fi
if [ "$UPDATE_CHOICE" = "2" ] || [ "$UPDATE_CHOICE" = "3" ]; then
    pm2 list | grep -q "glassshop-frontend.*online" && echo "  ✓ Frontend: Running" || echo "  ✗ Frontend: Not Running"
fi
systemctl is-active nginx > /dev/null && echo "  ✓ Nginx: Running" || echo "  ✗ Nginx: Not Running"
echo ""
echo "Backup location: $BACKUP_DIR"
echo ""

