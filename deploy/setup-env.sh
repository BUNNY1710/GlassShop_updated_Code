#!/bin/bash

# Environment Setup Script for Glass Shop Application
# Run this after initial deployment to configure environment variables

set -e

echo "=========================================="
echo "Glass Shop - Environment Configuration"
echo "=========================================="

ENV_FILE="/opt/glassshop/.env"
BACKEND_PROPS="/opt/glassshop/GlassShop/src/main/resources/application-prod.properties"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run with: sudo ./setup-env.sh"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f "$ENV_FILE" ]; then
    echo "Creating environment file..."
    touch "$ENV_FILE"
    chmod 600 "$ENV_FILE"
fi

echo ""
echo "Please provide the following information:"
echo ""

# Database Configuration
read -p "Database Host [localhost]: " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Database Port [5432]: " DB_PORT
DB_PORT=${DB_PORT:-5432}

read -p "Database Name [glassshop]: " DB_NAME
DB_NAME=${DB_NAME:-glassshop}

read -p "Database Username [glassshop_user]: " DB_USERNAME
DB_USERNAME=${DB_USERNAME:-glassshop_user}

read -sp "Database Password: " DB_PASSWORD
echo ""

# JWT Secret
read -p "Generate new JWT Secret? (y/n) [y]: " GEN_JWT
GEN_JWT=${GEN_JWT:-y}

if [ "$GEN_JWT" = "y" ]; then
    JWT_SECRET=$(openssl rand -base64 32)
    echo "Generated JWT Secret"
else
    read -sp "Enter JWT Secret: " JWT_SECRET
    echo ""
fi

# CORS Origins
read -p "CORS Origins (comma-separated) [http://localhost:3000]: " CORS_ORIGINS
CORS_ORIGINS=${CORS_ORIGINS:-http://localhost:3000}

# Get EC2 IP
EC2_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || curl -s ifconfig.me || echo "localhost")
read -p "EC2 Public IP [$EC2_IP]: " CUSTOM_IP
EC2_IP=${CUSTOM_IP:-$EC2_IP}

# Email Configuration (Optional)
read -p "Configure Email? (y/n) [n]: " CONFIG_EMAIL
CONFIG_EMAIL=${CONFIG_EMAIL:-n}

if [ "$CONFIG_EMAIL" = "y" ]; then
    read -p "SMTP Host [smtp.gmail.com]: " MAIL_HOST
    MAIL_HOST=${MAIL_HOST:-smtp.gmail.com}
    
    read -p "SMTP Port [587]: " MAIL_PORT
    MAIL_PORT=${MAIL_PORT:-587}
    
    read -p "SMTP Username: " MAIL_USERNAME
    
    read -sp "SMTP Password: " MAIL_PASSWORD
    echo ""
else
    MAIL_HOST="smtp.gmail.com"
    MAIL_PORT="587"
    MAIL_USERNAME=""
    MAIL_PASSWORD=""
fi

# WhatsApp Configuration (Optional)
read -p "Configure WhatsApp? (y/n) [n]: " CONFIG_WHATSAPP
CONFIG_WHATSAPP=${CONFIG_WHATSAPP:-n}

if [ "$CONFIG_WHATSAPP" = "y" ]; then
    read -p "WhatsApp API URL: " WHATSAPP_API_URL
    read -sp "WhatsApp API Key: " WHATSAPP_API_KEY
    echo ""
    WHATSAPP_ENABLED="true"
else
    WHATSAPP_ENABLED="false"
    WHATSAPP_API_URL=""
    WHATSAPP_API_KEY=""
fi

# Write .env file
cat > "$ENV_FILE" <<EOF
# Database Configuration
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USERNAME=$DB_USERNAME
DB_PASSWORD=$DB_PASSWORD

# JWT Configuration
JWT_SECRET=$JWT_SECRET

# CORS Configuration
CORS_ORIGINS=$CORS_ORIGINS,http://$EC2_IP

# Email Configuration
MAIL_HOST=$MAIL_HOST
MAIL_PORT=$MAIL_PORT
MAIL_USERNAME=$MAIL_USERNAME
MAIL_PASSWORD=$MAIL_PASSWORD

# WhatsApp Configuration
WHATSAPP_ENABLED=$WHATSAPP_ENABLED
WHATSAPP_API_URL=$WHATSAPP_API_URL
WHATSAPP_API_KEY=$WHATSAPP_API_KEY
EOF

echo ""
echo "✓ Environment file created at $ENV_FILE"

# Update backend properties with environment variables
if [ -f "$BACKEND_PROPS" ]; then
    echo ""
    echo "Updating backend configuration..."
    
    # Update database URL
    sed -i "s|spring.datasource.url=.*|spring.datasource.url=jdbc:postgresql://\${DB_HOST:$DB_HOST}:\${DB_PORT:$DB_PORT}/\${DB_NAME:$DB_NAME}|" "$BACKEND_PROPS"
    
    # Update database username
    sed -i "s|spring.datasource.username=.*|spring.datasource.username=\${DB_USERNAME:$DB_USERNAME}|" "$BACKEND_PROPS"
    
    # Update database password (keep as env var)
    sed -i "s|spring.datasource.password=.*|spring.datasource.password=\${DB_PASSWORD:CHANGE_ME}|" "$BACKEND_PROPS"
    
    # Update JWT secret
    sed -i "s|jwt.secret=.*|jwt.secret=\${JWT_SECRET:$JWT_SECRET}|" "$BACKEND_PROPS"
    
    # Update CORS
    sed -i "s|spring.web.cors.allowed-origins=.*|spring.web.cors.allowed-origins=\${CORS_ORIGINS:$CORS_ORIGINS,http://$EC2_IP}|" "$BACKEND_PROPS"
    
    echo "✓ Backend configuration updated"
fi

# Update frontend .env.production
FRONTEND_ENV="/opt/glassshop/glass-ai-agent-frontend/.env.production"
if [ -f "$FRONTEND_ENV" ]; then
    echo ""
    echo "Updating frontend configuration..."
    cat > "$FRONTEND_ENV" <<EOF
REACT_APP_API_URL=http://$EC2_IP
EOF
    echo "✓ Frontend configuration updated"
fi

# Create systemd environment file
SYSTEMD_ENV="/etc/systemd/system/glassshop-backend.service.d/env.conf"
mkdir -p "$(dirname "$SYSTEMD_ENV")"
cat > "$SYSTEMD_ENV" <<EOF
[Service]
EnvironmentFile=$ENV_FILE
EOF

echo ""
echo "=========================================="
echo "Environment Configuration Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Review environment file: sudo cat $ENV_FILE"
echo "2. Rebuild and restart backend:"
echo "   cd /opt/glassshop/GlassShop"
echo "   ./mvnw clean package -DskipTests"
echo "   sudo systemctl restart glassshop-backend"
echo "3. Rebuild and restart frontend:"
echo "   cd /opt/glassshop/glass-ai-agent-frontend"
echo "   npm run build"
echo "   pm2 restart glassshop-frontend"
echo ""

