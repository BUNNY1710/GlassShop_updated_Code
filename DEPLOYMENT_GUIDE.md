# EC2 Deployment Guide

## Prerequisites

### EC2 Instance Requirements
- **OS**: Ubuntu 20.04 LTS or later (recommended)
- **Instance Type**: t2.medium or higher (2 vCPU, 4GB RAM minimum)
- **Storage**: 20GB+ free space
- **Security Groups**: 
  - Port 22 (SSH)
  - Port 80 (HTTP)
  - Port 443 (HTTPS - if using SSL)
  - Port 8080 (Backend API - optional, can be proxied through nginx)
  - Port 3000 (Frontend - optional, can be proxied through nginx)

### Software Requirements
- Java 17 (for Spring Boot backend)
- Node.js 18+ and npm (for React frontend)
- PostgreSQL 14+ (database)
- Nginx (reverse proxy)
- PM2 (process manager for frontend)
- Git (to clone repository)

## Step 1: Connect to EC2 Instance

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

## Step 2: Install Dependencies

Run the installation script:

```bash
chmod +x deploy/install-dependencies.sh
sudo ./deploy/install-dependencies.sh
```

Or install manually:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Java 17
sudo apt install openjdk-17-jdk -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install Nginx
sudo apt install nginx -y

# Install PM2 globally
sudo npm install -g pm2

# Install Git
sudo apt install git -y
```

## Step 3: Setup Database

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE glassshop;
CREATE USER glassshop_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE glassshop TO glassshop_user;
\q
```

## Step 4: Clone and Build Application

```bash
# Clone repository (or upload files)
git clone <your-repo-url> /opt/glassshop
cd /opt/glassshop

# Or if uploading manually, create directory
sudo mkdir -p /opt/glassshop
sudo chown -R $USER:$USER /opt/glassshop
```

## Step 5: Configure Backend

```bash
cd /opt/glassshop/GlassShop

# Create application.properties for production
sudo nano src/main/resources/application-prod.properties
```

Add the following configuration:

```properties
# Database Configuration
spring.datasource.url=jdbc:postgresql://localhost:5432/glassshop
spring.datasource.username=glassshop_user
spring.datasource.password=your_secure_password
spring.datasource.driver-class-name=org.postgresql.Driver

# JPA Configuration
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect

# Server Configuration
server.port=8080
server.address=0.0.0.0

# JWT Secret (CHANGE THIS!)
jwt.secret=your-super-secret-jwt-key-change-this-in-production-min-256-bits

# CORS Configuration
spring.web.cors.allowed-origins=http://your-domain.com,http://your-ec2-ip

# Logging
logging.level.com.glassshop.ai=INFO
logging.level.org.springframework.security=WARN
```

## Step 6: Build Backend

```bash
cd /opt/glassshop/GlassShop
./mvnw clean package -DskipTests
# Or if maven is installed
mvn clean package -DskipTests
```

## Step 7: Configure Frontend

```bash
cd /opt/glassshop/glass-ai-agent-frontend

# Create .env.production file
nano .env.production
```

Add:

```env
REACT_APP_API_URL=http://your-ec2-ip:8080
# Or if using domain:
# REACT_APP_API_URL=http://your-domain.com/api
```

## Step 8: Build Frontend

```bash
cd /opt/glassshop/glass-ai-agent-frontend
npm install
npm run build
```

## Step 9: Setup Systemd Service for Backend

```bash
sudo cp deploy/glassshop-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable glassshop-backend
sudo systemctl start glassshop-backend
sudo systemctl status glassshop-backend
```

## Step 10: Setup PM2 for Frontend

```bash
cd /opt/glassshop/glass-ai-agent-frontend
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup
```

## Step 11: Configure Nginx

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/glassshop
sudo ln -s /etc/nginx/sites-available/glassshop /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 12: Setup SSL (Optional but Recommended)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

## Step 13: Verify Deployment

1. **Check Backend**: `curl http://localhost:8080/ai/ping`
2. **Check Frontend**: Open browser to `http://your-ec2-ip` or `http://your-domain.com`
3. **Check Logs**:
   - Backend: `sudo journalctl -u glassshop-backend -f`
   - Frontend: `pm2 logs`

## Troubleshooting

### Backend not starting
```bash
# Check logs
sudo journalctl -u glassshop-backend -n 50

# Check Java version
java -version

# Check if port is in use
sudo netstat -tulpn | grep 8080
```

### Frontend not loading
```bash
# Check PM2 status
pm2 status
pm2 logs

# Restart PM2
pm2 restart all
```

### Database connection issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -U glassshop_user -d glassshop -h localhost
```

### Nginx issues
```bash
# Check nginx status
sudo systemctl status nginx

# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

## Security Checklist

- [ ] Change default database password
- [ ] Change JWT secret key
- [ ] Configure firewall (UFW)
- [ ] Setup SSL certificate
- [ ] Restrict SSH access
- [ ] Enable automatic security updates
- [ ] Configure CORS properly
- [ ] Review security groups

## Maintenance

### Update Application
```bash
cd /opt/glassshop
git pull  # or upload new files
cd GlassShop && mvn clean package -DskipTests
cd ../glass-ai-agent-frontend && npm install && npm run build
sudo systemctl restart glassshop-backend
pm2 restart all
```

### Backup Database
```bash
# Create backup
pg_dump -U glassshop_user glassshop > backup_$(date +%Y%m%d).sql

# Restore backup
psql -U glassshop_user glassshop < backup_20240112.sql
```

## Monitoring

### Setup Monitoring (Optional)
- CloudWatch (AWS native)
- PM2 Monitoring
- Application Insights

### Log Locations
- Backend: `/var/log/glassshop/` (if configured)
- Frontend: PM2 logs
- Nginx: `/var/log/nginx/`
- System: `journalctl -u glassshop-backend`

