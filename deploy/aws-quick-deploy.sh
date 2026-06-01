#!/bin/bash

# AWS EC2 Quick Deployment Script
# Supports both Ubuntu/Debian (apt) and Amazon Linux (yum/dnf)
# Run this ON your EC2 instance

set -e

echo "=========================================="
echo "AWS EC2 - Glass Shop Application Deployment"
echo "=========================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run with: sudo ./aws-quick-deploy.sh"
    exit 1
fi

# Detect OS and package manager
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo "Cannot detect OS. Assuming Amazon Linux."
    OS="amzn"
fi

echo "Detected OS: $OS"

# Set package manager based on OS
if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
    PKG_MANAGER="apt"
    UPDATE_CMD="apt update -qq"
    INSTALL_CMD="apt install -y"
elif [[ "$OS" == "amzn" || "$OS" == "amazon" ]]; then
    PKG_MANAGER="yum"
    UPDATE_CMD="yum update -y -q"
    INSTALL_CMD="yum install -y"
else
    echo "Unsupported OS: $OS"
    exit 1
fi

echo "Using package manager: $PKG_MANAGER"
echo ""

# Get EC2 metadata
EC2_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || curl -s ifconfig.me)
EC2_REGION=$(curl -s http://169.254.169.254/latest/meta-data/placement/region 2>/dev/null || echo "us-east-1")

echo "Detected EC2 IP: $EC2_IP"
echo "Detected Region: $EC2_REGION"
echo ""

# Configuration
APP_DIR="/opt/glassshop"
BACKEND_DIR="$APP_DIR/GlassShop"
FRONTEND_DIR="$APP_DIR/glass-ai-agent-frontend"

# Check if application exists
if [ ! -d "$APP_DIR" ]; then
    echo "ERROR: Application not found at $APP_DIR"
    echo ""
    echo "Please upload your application files first:"
    echo "1. Zip your application folder"
    echo "2. Upload to S3 or use EC2 Instance Connect file transfer"
    echo "3. Extract to $APP_DIR"
    echo ""
    echo "Or use Git:"
    echo "  cd /opt && sudo git clone <your-repo-url> glassshop"
    exit 1
fi

if [ ! -d "$BACKEND_DIR" ] || [ ! -d "$FRONTEND_DIR" ]; then
    echo "ERROR: Backend or Frontend directory not found!"
    echo "Expected:"
    echo "  - $BACKEND_DIR"
    echo "  - $FRONTEND_DIR"
    exit 1
fi

# Step 1: Install dependencies
echo "[1/6] Installing dependencies..."

# Update package lists
$UPDATE_CMD

# Install Java 17
if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
    $INSTALL_CMD openjdk-17-jdk > /dev/null 2>&1
elif [[ "$OS" == "amzn" || "$OS" == "amazon" ]]; then
    # Amazon Linux 2023 uses dnf, older versions use yum
    if command -v dnf &> /dev/null; then
        dnf install -y java-17-amazon-corretto-devel > /dev/null 2>&1
    else
        yum install -y java-17-amazon-corretto-devel > /dev/null 2>&1
    fi
fi

# Install Node.js 18
if ! command -v node &> /dev/null || ! node --version | grep -q "v18"; then
    if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash - > /dev/null 2>&1
        $INSTALL_CMD nodejs > /dev/null 2>&1
    elif [[ "$OS" == "amzn" || "$OS" == "amazon" ]]; then
        curl -fsSL https://rpm.nodesource.com/setup_18.x | bash - > /dev/null 2>&1
        $INSTALL_CMD nodejs > /dev/null 2>&1
    fi
fi

# Install PostgreSQL
if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
    $INSTALL_CMD postgresql postgresql-contrib > /dev/null 2>&1
    systemctl start postgresql > /dev/null 2>&1
    systemctl enable postgresql > /dev/null 2>&1
elif [[ "$OS" == "amzn" || "$OS" == "amazon" ]]; then
    $INSTALL_CMD postgresql15 postgresql15-server > /dev/null 2>&1
    /usr/bin/postgresql-setup --initdb > /dev/null 2>&1
    systemctl start postgresql > /dev/null 2>&1
    systemctl enable postgresql > /dev/null 2>&1
fi

# Install Nginx
$INSTALL_CMD nginx > /dev/null 2>&1
systemctl start nginx > /dev/null 2>&1
systemctl enable nginx > /dev/null 2>&1

# Install Maven
if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
    $INSTALL_CMD maven > /dev/null 2>&1
elif [[ "$OS" == "amzn" || "$OS" == "amazon" ]]; then
    $INSTALL_CMD maven > /dev/null 2>&1
fi

# Install PM2 and serve
npm install -g pm2 serve > /dev/null 2>&1

echo "✓ Dependencies installed"

# Step 2: Setup database
echo "[2/6] Setting up database..."
read -sp "Enter database password for 'glassshop_user': " DB_PASSWORD
echo ""

# Create database and user
if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
    sudo -u postgres psql <<EOF > /dev/null 2>&1
CREATE DATABASE glassshop;
CREATE USER glassshop_user WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE glassshop TO glassshop_user;
ALTER USER glassshop_user CREATEDB;
\q
EOF

    sudo -u postgres psql -d glassshop <<EOF > /dev/null 2>&1
GRANT ALL ON SCHEMA public TO glassshop_user;
\q
EOF
elif [[ "$OS" == "amzn" || "$OS" == "amazon" ]]; then
    sudo -u postgres psql <<EOF > /dev/null 2>&1
CREATE DATABASE glassshop;
CREATE USER glassshop_user WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE glassshop TO glassshop_user;
ALTER USER glassshop_user CREATEDB;
\q
EOF

    sudo -u postgres psql -d glassshop <<EOF > /dev/null 2>&1
GRANT ALL ON SCHEMA public TO glassshop_user;
\q
EOF
fi

echo "✓ Database configured"

# Step 3: Configure backend
echo "[3/6] Configuring backend..."
cd $BACKEND_DIR

# Create production properties
if [ ! -f "src/main/resources/application-prod.properties" ]; then
    JWT_SECRET=$(openssl rand -base64 32)
    cat > src/main/resources/application-prod.properties <<EOF
spring.datasource.url=jdbc:postgresql://localhost:5432/glassshop
spring.datasource.username=glassshop_user
spring.datasource.password=$DB_PASSWORD
spring.datasource.driver-class-name=org.postgresql.Driver

spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect

server.port=8080
server.address=0.0.0.0

jwt.secret=$JWT_SECRET

spring.web.cors.allowed-origins=http://$EC2_IP,http://localhost:3000

logging.level.com.glassshop.ai=INFO
logging.level.org.springframework.security=WARN
EOF
fi

# Build backend
echo "  Building backend (this may take a few minutes)..."
if [ -f "mvnw" ]; then
    ./mvnw clean package -DskipTests -q
else
    mvn clean package -DskipTests -q
fi

if [ ! -f "target/GlassShop-0.0.1-SNAPSHOT.jar" ]; then
    echo "ERROR: Backend build failed!"
    exit 1
fi

echo "✓ Backend built successfully"

# Step 4: Configure frontend
echo "[4/6] Configuring frontend..."
cd $FRONTEND_DIR

# Create .env.production
if [ ! -f ".env.production" ]; then
    cat > .env.production <<EOF
REACT_APP_API_URL=http://$EC2_IP:8080
EOF
fi

# Build frontend
echo "  Building frontend (this may take a few minutes)..."
npm install --silent
npm run build --silent

if [ ! -d "build" ]; then
    echo "ERROR: Frontend build failed!"
    exit 1
fi

echo "✓ Frontend built successfully"

# Step 5: Setup services
echo "[5/6] Setting up services..."

# Get current user (ec2-user for Amazon Linux, ubuntu for Ubuntu)
CURRENT_USER=$(whoami)

# Systemd service for backend
cat > /etc/systemd/system/glassshop-backend.service <<EOF
[Unit]
Description=Glass Shop Backend Service
After=network.target postgresql.service

[Service]
Type=simple
User=$CURRENT_USER
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
systemctl enable glassshop-backend > /dev/null 2>&1
systemctl restart glassshop-backend

# PM2 for frontend
cd $FRONTEND_DIR
pm2 delete glassshop-frontend 2>/dev/null || true
pm2 serve build 3000 --name glassshop-frontend --spa --silent
pm2 save > /dev/null 2>&1

echo "✓ Services configured"

# Step 6: Configure Nginx
echo "[6/6] Configuring Nginx..."

cat > /etc/nginx/conf.d/glassshop.conf <<EOF
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
}
EOF

# For Amazon Linux, remove default config
if [[ "$OS" == "amzn" || "$OS" == "amazon" ]]; then
    rm -f /etc/nginx/conf.d/default.conf
fi

# For Ubuntu, remove default site
if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
    rm -f /etc/nginx/sites-enabled/default
fi

nginx -t > /dev/null 2>&1
systemctl reload nginx

# Configure firewall (if firewalld is available)
if command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-service=http > /dev/null 2>&1
    firewall-cmd --permanent --add-service=https > /dev/null 2>&1
    firewall-cmd --reload > /dev/null 2>&1
elif command -v ufw &> /dev/null; then
    ufw --force enable > /dev/null 2>&1
    ufw allow 22/tcp > /dev/null 2>&1
    ufw allow 80/tcp > /dev/null 2>&1
    ufw allow 443/tcp > /dev/null 2>&1
    ufw allow 8080/tcp > /dev/null 2>&1
fi

echo "✓ Nginx configured"

# Wait for services
echo ""
echo "Waiting for services to start..."
sleep 5

# Final status
echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Your application is available at:"
echo "  🌐 http://$EC2_IP"
echo ""
echo "Service Status:"
systemctl is-active glassshop-backend > /dev/null && echo "  ✓ Backend: Running" || echo "  ✗ Backend: Not Running"
pm2 list | grep -q glassshop-frontend && echo "  ✓ Frontend: Running" || echo "  ✗ Frontend: Not Running"
systemctl is-active nginx > /dev/null && echo "  ✓ Nginx: Running" || echo "  ✗ Nginx: Not Running"
echo ""
echo "Next Steps:"
echo "1. Configure Security Groups in AWS Console:"
echo "   - Allow HTTP (port 80) from 0.0.0.0/0"
echo "   - Allow HTTPS (port 443) from 0.0.0.0/0 (optional)"
echo ""
echo "2. Open in browser: http://$EC2_IP"
echo ""
echo "3. Register your shop and create admin account"
echo ""
echo "View logs:"
echo "  Backend: sudo journalctl -u glassshop-backend -f"
echo "  Frontend: pm2 logs glassshop-frontend"
echo ""
