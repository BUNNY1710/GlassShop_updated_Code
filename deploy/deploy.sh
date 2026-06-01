#!/bin/bash

# Complete Deployment Script for Glass Shop Application
# Run with: ./deploy.sh

set -e

echo "=========================================="
echo "Glass Shop Application Deployment"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/opt/glassshop"
BACKEND_DIR="$APP_DIR/GlassShop"
FRONTEND_DIR="$APP_DIR/glass-ai-agent-frontend"
DB_NAME="glassshop"
DB_USER="glassshop_user"

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

# Step 1: Create application directory
echo -e "${YELLOW}Step 1: Creating application directory...${NC}"
mkdir -p $APP_DIR
mkdir -p $APP_DIR/logs
chown -R $SUDO_USER:$SUDO_USER $APP_DIR

# Step 2: Check if application files exist
echo -e "${YELLOW}Step 2: Checking application files...${NC}"
if [ ! -d "$BACKEND_DIR" ] || [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}Application files not found in $APP_DIR${NC}"
    echo "Please ensure you have:"
    echo "  - $BACKEND_DIR (Spring Boot backend)"
    echo "  - $FRONTEND_DIR (React frontend)"
    exit 1
fi

# Step 3: Build Backend
echo -e "${YELLOW}Step 3: Building backend...${NC}"
cd $BACKEND_DIR
if [ -f "mvnw" ]; then
    ./mvnw clean package -DskipTests
else
    mvn clean package -DskipTests
fi

if [ ! -f "target/GlassShop-0.0.1-SNAPSHOT.jar" ]; then
    echo -e "${RED}Backend build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}Backend built successfully!${NC}"

# Step 4: Build Frontend
echo -e "${YELLOW}Step 4: Building frontend...${NC}"
cd $FRONTEND_DIR
npm install
npm run build

if [ ! -d "build" ]; then
    echo -e "${RED}Frontend build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}Frontend built successfully!${NC}"

# Step 5: Setup Systemd Service
echo -e "${YELLOW}Step 5: Setting up backend service...${NC}"
if [ -f "$APP_DIR/deploy/glassshop-backend.service" ]; then
    cp $APP_DIR/deploy/glassshop-backend.service /etc/systemd/system/
    systemctl daemon-reload
    systemctl enable glassshop-backend
    systemctl restart glassshop-backend
    echo -e "${GREEN}Backend service configured!${NC}"
else
    echo -e "${YELLOW}Service file not found, skipping...${NC}"
fi

# Step 6: Setup PM2 for Frontend
echo -e "${YELLOW}Step 6: Setting up frontend with PM2...${NC}"
cd $FRONTEND_DIR
npm install -g serve
if [ -f "$APP_DIR/deploy/ecosystem.config.js" ]; then
    cp $APP_DIR/deploy/ecosystem.config.js .
    pm2 delete glassshop-frontend 2>/dev/null || true
    pm2 start ecosystem.config.js
    pm2 save
    echo -e "${GREEN}Frontend service configured!${NC}"
else
    echo -e "${YELLOW}PM2 config not found, using default...${NC}"
    pm2 serve build 3000 --name glassshop-frontend --spa
    pm2 save
fi

# Step 7: Configure Nginx
echo -e "${YELLOW}Step 7: Configuring Nginx...${NC}"
if [ -f "$APP_DIR/deploy/nginx.conf" ]; then
    # Backup existing config
    if [ -f "/etc/nginx/sites-available/glassshop" ]; then
        cp /etc/nginx/sites-available/glassshop /etc/nginx/sites-available/glassshop.backup
    fi
    
    cp $APP_DIR/deploy/nginx.conf /etc/nginx/sites-available/glassshop
    
    # Enable site
    ln -sf /etc/nginx/sites-available/glassshop /etc/nginx/sites-enabled/
    
    # Remove default site
    rm -f /etc/nginx/sites-enabled/default
    
    # Test and reload nginx
    nginx -t && systemctl reload nginx
    echo -e "${GREEN}Nginx configured!${NC}"
else
    echo -e "${YELLOW}Nginx config not found, skipping...${NC}"
fi

# Step 8: Setup Firewall
echo -e "${YELLOW}Step 8: Configuring firewall...${NC}"
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
echo -e "${GREEN}Firewall configured!${NC}"

# Step 9: Check services
echo -e "${YELLOW}Step 9: Checking services...${NC}"
echo ""
echo "Backend Status:"
systemctl status glassshop-backend --no-pager | head -n 5
echo ""
echo "Frontend Status:"
pm2 status
echo ""
echo "Nginx Status:"
systemctl status nginx --no-pager | head -n 5

echo ""
echo -e "${GREEN}=========================================="
echo "Deployment completed successfully!"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Update application-prod.properties with your database credentials"
echo "2. Update nginx.conf with your domain/IP"
echo "3. Restart services:"
echo "   sudo systemctl restart glassshop-backend"
echo "   pm2 restart all"
echo "   sudo systemctl restart nginx"
echo ""
echo "Check logs:"
echo "  Backend: sudo journalctl -u glassshop-backend -f"
echo "  Frontend: pm2 logs glassshop-frontend"
echo "  Nginx: sudo tail -f /var/log/nginx/error.log"
echo ""

