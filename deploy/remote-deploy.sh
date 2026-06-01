#!/bin/bash

# Complete Remote Deployment Script for EC2
# This script will deploy the Glass Shop Application on your EC2 instance
# Run this script ON your EC2 instance (not locally)

set -e

echo "=========================================="
echo "Glass Shop Application - EC2 Deployment"
echo "=========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run with sudo${NC}"
    exit 1
fi

# Configuration
APP_DIR="/opt/glassshop"
BACKEND_DIR="$APP_DIR/GlassShop"
FRONTEND_DIR="$APP_DIR/glass-ai-agent-frontend"

# Step 1: Update system
echo -e "${YELLOW}[1/10] Updating system...${NC}"
apt update && apt upgrade -y

# Step 2: Install Java 17
echo -e "${YELLOW}[2/10] Installing Java 17...${NC}"
if ! command -v java &> /dev/null || ! java -version 2>&1 | grep -q "17"; then
    apt install -y openjdk-17-jdk
fi
java -version

# Step 3: Install Node.js 18
echo -e "${YELLOW}[3/10] Installing Node.js 18...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
fi
node --version
npm --version

# Step 4: Install PostgreSQL
echo -e "${YELLOW}[4/10] Installing PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
    apt install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
fi

# Step 5: Install Nginx
echo -e "${YELLOW}[5/10] Installing Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
fi

# Step 6: Install PM2
echo -e "${YELLOW}[6/10] Installing PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# Step 7: Install Maven
echo -e "${YELLOW}[7/10] Installing Maven...${NC}"
if ! command -v mvn &> /dev/null; then
    apt install -y maven
fi

# Step 8: Install serve (for frontend)
echo -e "${YELLOW}[8/10] Installing serve...${NC}"
npm install -g serve

# Step 9: Setup Database
echo -e "${YELLOW}[9/10] Setting up database...${NC}"
read -sp "Enter database password for 'glassshop_user': " DB_PASSWORD
echo ""

# Create database and user
sudo -u postgres psql <<EOF
CREATE DATABASE glassshop;
CREATE USER glassshop_user WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE glassshop TO glassshop_user;
ALTER USER glassshop_user CREATEDB;
\q
EOF

# Grant schema permissions
sudo -u postgres psql -d glassshop <<EOF
GRANT ALL ON SCHEMA public TO glassshop_user;
\q
EOF

echo -e "${GREEN}Database setup complete!${NC}"

# Step 10: Check if application exists
echo -e "${YELLOW}[10/10] Checking application files...${NC}"
if [ ! -d "$APP_DIR" ]; then
    echo -e "${RED}Application directory not found at $APP_DIR${NC}"
    echo "Please either:"
    echo "  1. Clone your repository: git clone <repo-url> $APP_DIR"
    echo "  2. Or upload files to $APP_DIR"
    echo ""
    read -p "Press Enter after you've uploaded/cloned the application files..."
fi

if [ ! -d "$BACKEND_DIR" ] || [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}Backend or Frontend directory not found!${NC}"
    echo "Expected:"
    echo "  - $BACKEND_DIR"
    echo "  - $FRONTEND_DIR"
    exit 1
fi

# Create logs directory
mkdir -p $APP_DIR/logs
chown -R $SUDO_USER:$SUDO_USER $APP_DIR

# Build Backend
echo -e "${YELLOW}Building backend...${NC}"
cd $BACKEND_DIR

# Create production properties if not exists
if [ ! -f "src/main/resources/application-prod.properties" ]; then
    echo -e "${YELLOW}Creating application-prod.properties...${NC}"
    cat > src/main/resources/application-prod.properties <<EOF
# Production Configuration
spring.datasource.url=jdbc:postgresql://localhost:5432/glassshop
spring.datasource.username=glassshop_user
spring.datasource.password=$DB_PASSWORD
spring.datasource.driver-class-name=org.postgresql.Driver

spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect

server.port=8080
server.address=0.0.0.0

# JWT Secret - CHANGE THIS!
jwt.secret=$(openssl rand -base64 32)

# CORS - Update with your EC2 IP or domain
spring.web.cors.allowed-origins=http://$(curl -s ifconfig.me),http://localhost:3000

logging.level.com.glassshop.ai=INFO
logging.level.org.springframework.security=WARN
EOF
    echo -e "${GREEN}Created application-prod.properties${NC}"
    echo -e "${YELLOW}IMPORTANT: Update CORS origins with your domain/IP!${NC}"
fi

# Build
if [ -f "mvnw" ]; then
    ./mvnw clean package -DskipTests -Pprod
else
    mvn clean package -DskipTests -Pprod
fi

if [ ! -f "target/GlassShop-0.0.1-SNAPSHOT.jar" ]; then
    echo -e "${RED}Backend build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}Backend built successfully!${NC}"

# Build Frontend
echo -e "${YELLOW}Building frontend...${NC}"
cd $FRONTEND_DIR

# Create .env.production if not exists
if [ ! -f ".env.production" ]; then
    EC2_IP=$(curl -s ifconfig.me)
    echo -e "${YELLOW}Creating .env.production...${NC}"
    cat > .env.production <<EOF
REACT_APP_API_URL=http://$EC2_IP:8080
EOF
    echo -e "${GREEN}Created .env.production with IP: $EC2_IP${NC}"
fi

npm install
npm run build

if [ ! -d "build" ]; then
    echo -e "${RED}Frontend build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}Frontend built successfully!${NC}"

# Setup Systemd Service
echo -e "${YELLOW}Setting up backend service...${NC}"
cat > /etc/systemd/system/glassshop-backend.service <<EOF
[Unit]
Description=Glass Shop Backend Service
After=network.target postgresql.service

[Service]
Type=simple
User=$SUDO_USER
WorkingDirectory=$BACKEND_DIR
Environment="SPRING_PROFILES_ACTIVE=prod"
Environment="JAVA_OPTS=-Xms512m -Xmx1024m"
ExecStart=/usr/bin/java -jar $BACKEND_DIR/target/GlassShop-0.0.1-SNAPSHOT.jar
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
systemctl restart glassshop-backend
echo -e "${GREEN}Backend service configured!${NC}"

# Setup PM2 for Frontend
echo -e "${YELLOW}Setting up frontend service...${NC}"
cd $FRONTEND_DIR
pm2 delete glassshop-frontend 2>/dev/null || true
pm2 serve build 3000 --name glassshop-frontend --spa
pm2 save
pm2 startup
echo -e "${GREEN}Frontend service configured!${NC}"

# Setup Nginx
echo -e "${YELLOW}Configuring Nginx...${NC}"
EC2_IP=$(curl -s ifconfig.me)
cat > /etc/nginx/sites-available/glassshop <<EOF
upstream backend {
    server localhost:8080;
}

server {
    listen 80;
    server_name $EC2_IP;

    location / {
        root $FRONTEND_DIR/build;
        try_files \$uri \$uri/ /index.html;
        index index.html;
    }

    location ~ ^/(auth|stock|audit|ai|admin) {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}
EOF

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/glassshop /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
echo -e "${GREEN}Nginx configured!${NC}"

# Setup Firewall
echo -e "${YELLOW}Configuring firewall...${NC}"
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8080/tcp
echo -e "${GREEN}Firewall configured!${NC}"

# Wait for services to start
echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 5

# Check services
echo ""
echo -e "${GREEN}=========================================="
echo "Deployment Complete!"
echo "==========================================${NC}"
echo ""
echo "Service Status:"
systemctl status glassshop-backend --no-pager | head -n 3
pm2 status
systemctl status nginx --no-pager | head -n 3

EC2_IP=$(curl -s ifconfig.me)
echo ""
echo -e "${GREEN}Application URLs:${NC}"
echo "  Frontend: http://$EC2_IP"
echo "  Backend API: http://$EC2_IP:8080"
echo "  Health Check: http://$EC2_IP:8080/ai/ping"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Test the application: http://$EC2_IP"
echo "2. Check logs if needed:"
echo "   Backend: sudo journalctl -u glassshop-backend -f"
echo "   Frontend: pm2 logs glassshop-frontend"
echo "3. Update CORS in application-prod.properties if using a domain"
echo ""

