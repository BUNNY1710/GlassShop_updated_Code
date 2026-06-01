#!/bin/bash

# ============================================
# Glass Shop Application - GitHub Deployment Script
# Deploy from GitHub to AWS EC2 Instance
# Run this ON your EC2 instance
# ============================================

set -e

echo "=========================================="
echo "Glass Shop - GitHub Deployment"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run with: sudo ./deploy-from-github.sh${NC}"
    exit 1
fi

# Configuration
APP_DIR="/opt/glassshop"
GITHUB_REPO=""
BRANCH="master"
BACKEND_DIR="$APP_DIR/GlassShop"
FRONTEND_DIR="$APP_DIR/glass-ai-agent-frontend"
BACKEND_JAR="target/GlassShop-0.0.1-SNAPSHOT.jar"

# Get GitHub repository URL
echo -e "${YELLOW}GitHub Repository Configuration${NC}"
echo "Enter your GitHub repository URL (e.g., https://github.com/username/GlassShopApplication.git)"
read -p "Repository URL: " GITHUB_REPO
if [ -z "$GITHUB_REPO" ]; then
    echo -e "${RED}GitHub repository URL is required!${NC}"
    exit 1
fi

read -p "Branch [master]: " BRANCH
BRANCH=${BRANCH:-master}

echo ""
echo -e "${GREEN}Starting deployment from: $GITHUB_REPO (branch: $BRANCH)${NC}"
echo ""

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    OS="amzn"
fi

echo "Detected OS: $OS"

# Set package manager
if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
    PKG_MANAGER="apt"
    UPDATE_CMD="apt update -qq"
    INSTALL_CMD="apt install -y -qq"
    JAVA_PKG="openjdk-17-jdk"
    POSTGRES_SERVICE="postgresql"
elif [[ "$OS" == "amzn" || "$OS" == "amazon" ]]; then
    PKG_MANAGER="yum"
    UPDATE_CMD="yum update -y -q"
    INSTALL_CMD="yum install -y -q"
    JAVA_PKG="java-17-amazon-corretto-devel"
    POSTGRES_SERVICE="postgresql"
else
    echo -e "${RED}Unsupported OS: $OS${NC}"
    exit 1
fi

# Step 1: Install Git if not present
echo ""
echo -e "${YELLOW}[Step 1/10] Installing Git...${NC}"
if ! command -v git &> /dev/null; then
    $UPDATE_CMD
    $INSTALL_CMD git
fi
echo -e "${GREEN}✓ Git installed${NC}"

# Step 2: Install Java 17
echo ""
echo -e "${YELLOW}[Step 2/10] Installing Java 17...${NC}"
if ! command -v java &> /dev/null || ! java -version 2>&1 | grep -q "17"; then
    $UPDATE_CMD
    $INSTALL_CMD $JAVA_PKG
fi
echo -e "${GREEN}✓ Java 17 installed${NC}"
java -version

# Step 3: Install Node.js 18
echo ""
echo -e "${YELLOW}[Step 3/10] Installing Node.js 18...${NC}"
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" -lt 18 ]; then
    if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        $INSTALL_CMD nodejs
    else
        curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
        $INSTALL_CMD nodejs
    fi
fi
echo -e "${GREEN}✓ Node.js installed${NC}"
node -v
npm -v

# Step 4: Install PostgreSQL
echo ""
echo -e "${YELLOW}[Step 4/10] Installing PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
    if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
        $INSTALL_CMD postgresql postgresql-contrib
    else
        $INSTALL_CMD postgresql15 postgresql15-server
        postgresql15-setup initdb || true
    fi
    systemctl enable $POSTGRES_SERVICE
    systemctl start $POSTGRES_SERVICE
fi
echo -e "${GREEN}✓ PostgreSQL installed${NC}"

# Step 5: Install Maven
echo ""
echo -e "${YELLOW}[Step 5/10] Installing Maven...${NC}"
if ! command -v mvn &> /dev/null; then
    $INSTALL_CMD maven
fi
echo -e "${GREEN}✓ Maven installed${NC}"

# Step 6: Install Nginx
echo ""
echo -e "${YELLOW}[Step 6/10] Installing Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    $INSTALL_CMD nginx
    systemctl enable nginx
    systemctl start nginx
fi
echo -e "${GREEN}✓ Nginx installed${NC}"

# Step 7: Install PM2
echo ""
echo -e "${YELLOW}[Step 7/10] Installing PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    pm2 startup systemd -u $(whoami) --hp /home/$(whoami) || true
fi
echo -e "${GREEN}✓ PM2 installed${NC}"

# Step 8: Clone or Update Repository
echo ""
echo -e "${YELLOW}[Step 8/10] Cloning/Updating Repository...${NC}"
mkdir -p "$(dirname $APP_DIR)"

if [ -d "$APP_DIR/.git" ]; then
    echo "Repository exists, pulling latest changes..."
    cd "$APP_DIR"
    git fetch origin
    git checkout "$BRANCH"
    git pull origin "$BRANCH"
else
    echo "Cloning repository..."
    rm -rf "$APP_DIR" 2>/dev/null || true
    git clone -b "$BRANCH" "$GITHUB_REPO" "$APP_DIR"
fi
echo -e "${GREEN}✓ Repository updated${NC}"

# Step 9: Setup Database
echo ""
echo -e "${YELLOW}[Step 9/10] Setting up Database...${NC}"
DB_NAME="glassshop"
DB_USER="glassshop_user"

# Generate random password
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# Create database and user
sudo -u postgres psql <<EOF || true
-- Create database
CREATE DATABASE $DB_NAME;

-- Create user
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER USER $DB_USER CREATEDB;

-- Connect and grant schema privileges
\c $DB_NAME
GRANT ALL ON SCHEMA public TO $DB_USER;
EOF

# Run SQL script to create tables
if [ -f "$APP_DIR/deploy/create-all-tables.sql" ]; then
    echo "Creating database tables..."
    sudo -u postgres psql -d "$DB_NAME" -f "$APP_DIR/deploy/create-all-tables.sql"
    echo -e "${GREEN}✓ Database tables created${NC}"
else
    echo -e "${YELLOW}⚠ SQL script not found. You may need to create tables manually.${NC}"
fi

echo -e "${GREEN}✓ Database setup complete${NC}"
echo -e "${YELLOW}Database credentials:${NC}"
echo "  Database: $DB_NAME"
echo "  Username: $DB_USER"
echo "  Password: $DB_PASSWORD"
echo ""

# Step 10: Configure Environment
echo ""
echo -e "${YELLOW}[Step 10/10] Configuring Environment...${NC}"
ENV_FILE="$APP_DIR/.env"
EC2_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || curl -s ifconfig.me)
JWT_SECRET=$(openssl rand -base64 32)

cat > "$ENV_FILE" <<EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USERNAME=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# JWT Configuration
JWT_SECRET=$JWT_SECRET

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://$EC2_IP,http://$EC2_IP:80

# Application URLs
APP_URL=http://$EC2_IP
BACKEND_URL=http://localhost:8080
EOF

chmod 600 "$ENV_FILE"
echo -e "${GREEN}✓ Environment configured${NC}"

# Step 11: Build Backend
echo ""
echo -e "${YELLOW}[Step 11/11] Building Backend...${NC}"
cd "$BACKEND_DIR"

# Set environment variables
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=$DB_NAME
export DB_USERNAME=$DB_USER
export DB_PASSWORD=$DB_PASSWORD
export JWT_SECRET=$JWT_SECRET

# Build
if [ -f "mvnw" ]; then
    chmod +x mvnw
    ./mvnw clean package -DskipTests -Pprod
else
    mvn clean package -DskipTests -Pprod
fi

if [ ! -f "$BACKEND_JAR" ]; then
    echo -e "${RED}✗ Backend build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Backend built successfully${NC}"

# Step 12: Setup Systemd Service
echo ""
echo -e "${YELLOW}[Step 12/12] Setting up Backend Service...${NC}"
SYSTEMD_FILE="/etc/systemd/system/glassshop-backend.service"

cat > "$SYSTEMD_FILE" <<EOF
[Unit]
Description=Glass Shop Backend Application
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=$BACKEND_DIR
EnvironmentFile=$ENV_FILE
ExecStart=/usr/bin/java -jar -Dspring.profiles.active=prod $BACKEND_DIR/$BACKEND_JAR
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=glassshop-backend

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable glassshop-backend
systemctl start glassshop-backend

# Wait for backend to start
sleep 10

if systemctl is-active --quiet glassshop-backend; then
    echo -e "${GREEN}✓ Backend service started${NC}"
else
    echo -e "${RED}✗ Backend service failed to start. Check logs:${NC}"
    echo "  sudo journalctl -u glassshop-backend -n 50"
fi

# Step 13: Build Frontend
echo ""
echo -e "${YELLOW}[Step 13/13] Building Frontend...${NC}"
cd "$FRONTEND_DIR"

# Update API URL in .env.production
cat > .env.production <<EOF
REACT_APP_API_URL=http://$EC2_IP
EOF

# Install dependencies and build
npm install --silent
npm run build

if [ ! -d "build" ]; then
    echo -e "${RED}✗ Frontend build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Frontend built successfully${NC}"

# Step 14: Setup PM2 for Frontend
echo ""
echo -e "${YELLOW}[Step 14/14] Setting up Frontend Service...${NC}"
cd "$FRONTEND_DIR"

# Stop existing PM2 process if any
pm2 delete glassshop-frontend 2>/dev/null || true

# Start with PM2
pm2 serve build 3000 --name glassshop-frontend --spa
pm2 save

echo -e "${GREEN}✓ Frontend service started${NC}"

# Step 15: Configure Nginx
echo ""
echo -e "${YELLOW}[Step 15/15] Configuring Nginx...${NC}"
NGINX_CONF="/etc/nginx/sites-available/glassshop"

# Create nginx config
if [ -f "$APP_DIR/deploy/nginx.conf" ]; then
    cp "$APP_DIR/deploy/nginx.conf" "$NGINX_CONF"
else
    cat > "$NGINX_CONF" <<EOF
server {
    listen 80;
    server_name $EC2_IP;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Auth endpoints
    location /auth/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Other backend endpoints
    location ~ ^/(stock|audit|ai|admin)/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
fi

# Enable site (Ubuntu/Debian)
if [ -d "/etc/nginx/sites-available" ]; then
    ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/glassshop
    rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
fi

# Test and reload nginx
nginx -t && systemctl reload nginx
echo -e "${GREEN}✓ Nginx configured${NC}"

# Step 16: Setup Firewall
echo ""
echo -e "${YELLOW}[Step 16/16] Configuring Firewall...${NC}"
if command -v ufw &> /dev/null; then
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
elif command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-service=ssh
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --reload
fi
echo -e "${GREEN}✓ Firewall configured${NC}"

# Save credentials
CREDS_FILE="$APP_DIR/DEPLOYMENT_CREDENTIALS.txt"
cat > "$CREDS_FILE" <<EOF
===========================================
Glass Shop Application - Deployment Credentials
===========================================
Generated: $(date)

Database Configuration:
  Database Name: $DB_NAME
  Username: $DB_USER
  Password: $DB_PASSWORD
  Host: localhost
  Port: 5432

JWT Secret:
  $JWT_SECRET

Application URLs:
  Frontend: http://$EC2_IP
  Backend API: http://$EC2_IP/api
  Backend Direct: http://$EC2_IP:8080

Services:
  Backend: systemctl status glassshop-backend
  Frontend: pm2 status
  Database: systemctl status postgresql
  Nginx: systemctl status nginx

Logs:
  Backend: sudo journalctl -u glassshop-backend -f
  Frontend: pm2 logs glassshop-frontend
  Nginx: sudo tail -f /var/log/nginx/error.log

Update Application:
  cd $APP_DIR
  sudo ./deploy/update-application.sh

===========================================
EOF

chmod 600 "$CREDS_FILE"

# Final Status
echo ""
echo "=========================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo -e "${YELLOW}Application URLs:${NC}"
echo "  Frontend: http://$EC2_IP"
echo "  Backend API: http://$EC2_IP/api"
echo ""
echo -e "${YELLOW}Credentials saved to:${NC}"
echo "  $CREDS_FILE"
echo ""
echo -e "${YELLOW}Service Status:${NC}"
systemctl is-active glassshop-backend > /dev/null && echo -e "  ${GREEN}✓ Backend: Running${NC}" || echo -e "  ${RED}✗ Backend: Not Running${NC}"
pm2 list | grep -q "glassshop-frontend.*online" && echo -e "  ${GREEN}✓ Frontend: Running${NC}" || echo -e "  ${RED}✗ Frontend: Not Running${NC}"
systemctl is-active nginx > /dev/null && echo -e "  ${GREEN}✓ Nginx: Running${NC}" || echo -e "  ${RED}✗ Nginx: Not Running${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Open http://$EC2_IP in your browser"
echo "  2. Register a new shop (first user will be admin)"
echo "  3. Review credentials: sudo cat $CREDS_FILE"
echo ""
echo "=========================================="

