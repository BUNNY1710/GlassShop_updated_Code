# AWS EC2 Deployment Guide
## Glass Shop Application - Complete Production Setup

This guide will help you deploy the Glass Shop Application on AWS EC2 with all production best practices.

---

## 📋 Prerequisites

1. **AWS Account** with EC2 access
2. **EC2 Instance** (Recommended: t3.medium or larger)
   - Ubuntu 22.04 LTS or Amazon Linux 2023
   - Minimum 2GB RAM, 20GB storage
   - Security Group configured (see below)
3. **Domain Name** (Optional, for SSL)
4. **SSH Access** to your EC2 instance

---

## 🔒 Step 1: Configure AWS Security Group

### Required Ports:
- **22** (SSH) - Your IP only
- **80** (HTTP) - 0.0.0.0/0
- **443** (HTTPS) - 0.0.0.0/0 (if using SSL)
- **8080** (Backend) - localhost only (not public)

### Steps:
1. Go to EC2 Console → Security Groups
2. Create new Security Group or edit existing
3. Add Inbound Rules:
   ```
   Type: SSH, Port: 22, Source: Your IP
   Type: HTTP, Port: 80, Source: 0.0.0.0/0
   Type: HTTPS, Port: 443, Source: 0.0.0.0/0
   ```

---

## 🚀 Step 2: Connect to EC2 Instance

```bash
# Replace with your key file and instance IP
ssh -i your-key.pem ubuntu@your-ec2-ip
# OR for Amazon Linux
ssh -i your-key.pem ec2-user@your-ec2-ip
```

---

## 📦 Step 3: Upload Application Files

### Option A: Using Git (Recommended)
```bash
# On EC2 instance
cd /opt
sudo git clone <your-repo-url> glassshop
cd glassshop
```

### Option B: Using SCP
```bash
# From your local machine
scp -i your-key.pem -r GlassShopApplication-master ubuntu@your-ec2-ip:/opt/glassshop
```

### Option C: Using AWS Systems Manager Session Manager
```bash
# Upload via AWS Console → Systems Manager → Session Manager
```

---

## ⚙️ Step 4: Run Deployment Script

```bash
# Make script executable
cd /opt/glassshop
sudo chmod +x deploy/aws-quick-deploy.sh

# Run deployment (as root)
sudo ./deploy/aws-quick-deploy.sh
```

The script will:
1. ✅ Install Java 17, Node.js 18, PostgreSQL, Nginx, Maven
2. ✅ Setup PostgreSQL database
3. ✅ Build backend (Spring Boot)
4. ✅ Build frontend (React)
5. ✅ Configure systemd service for backend
6. ✅ Configure PM2 for frontend
7. ✅ Configure Nginx reverse proxy
8. ✅ Setup firewall rules

---

## 🔧 Step 5: Manual Configuration

### 5.1 Set Environment Variables

Create `/opt/glassshop/.env`:
```bash
sudo nano /opt/glassshop/.env
```

Add:
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=glassshop
DB_USERNAME=glassshop_user
DB_PASSWORD=your_secure_password_here

# JWT Secret (generate: openssl rand -base64 32)
JWT_SECRET=your_generated_jwt_secret_here

# CORS Origins (comma-separated)
CORS_ORIGINS=http://your-ec2-ip,http://your-domain.com

# Email (optional)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password

# WhatsApp (optional)
WHATSAPP_ENABLED=false
WHATSAPP_API_URL=
WHATSAPP_API_KEY=
```

### 5.2 Update Backend Configuration

```bash
sudo nano /opt/glassshop/GlassShop/src/main/resources/application-prod.properties
```

Update:
- Database credentials
- JWT secret
- CORS origins
- Email settings

### 5.3 Update Frontend API URL

```bash
sudo nano /opt/glassshop/glass-ai-agent-frontend/.env.production
```

Add:
```bash
REACT_APP_API_URL=http://your-ec2-ip
# OR if using domain:
REACT_APP_API_URL=https://your-domain.com
```

Rebuild frontend:
```bash
cd /opt/glassshop/glass-ai-agent-frontend
npm run build
pm2 restart glassshop-frontend
```

---

## 🔄 Step 6: Restart Services

```bash
# Restart backend
sudo systemctl restart glassshop-backend

# Restart frontend
pm2 restart glassshop-frontend

# Restart Nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status glassshop-backend
pm2 status
sudo systemctl status nginx
```

---

## 🌐 Step 7: Configure Domain & SSL (Optional)

### 7.1 Point Domain to EC2 IP
- Go to your domain registrar
- Add A record: `@` → `your-ec2-ip`
- Add A record: `www` → `your-ec2-ip`

### 7.2 Install SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y
# OR for Amazon Linux
sudo yum install certbot python3-certbot-nginx -y

# Get certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### 7.3 Update Nginx Configuration

```bash
sudo nano /etc/nginx/conf.d/glassshop.conf
```

Update `server_name` with your domain.

---

## 📊 Step 8: Monitoring & Logs

### View Backend Logs
```bash
# Real-time logs
sudo journalctl -u glassshop-backend -f

# Last 100 lines
sudo journalctl -u glassshop-backend -n 100

# Logs since today
sudo journalctl -u glassshop-backend --since today
```

### View Frontend Logs
```bash
pm2 logs glassshop-frontend
pm2 logs glassshop-frontend --lines 100
```

### View Nginx Logs
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Application Logs
```bash
sudo tail -f /var/log/glassshop/application.log
```

---

## 🔄 Step 9: Update Application

### Update Backend
```bash
cd /opt/glassshop
sudo git pull  # If using Git
# OR upload new files

cd GlassShop
./mvnw clean package -DskipTests
sudo systemctl restart glassshop-backend
```

### Update Frontend
```bash
cd /opt/glassshop/glass-ai-agent-frontend
sudo git pull  # If using Git
# OR upload new files

npm install
npm run build
pm2 restart glassshop-frontend
```

---

## 💾 Step 10: Database Backup

### Create Backup Script
```bash
sudo nano /opt/glassshop/backup-db.sh
```

Add:
```bash
#!/bin/bash
BACKUP_DIR="/opt/glassshop/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

sudo -u postgres pg_dump glassshop > $BACKUP_DIR/glassshop_$DATE.sql
gzip $BACKUP_DIR/glassshop_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: glassshop_$DATE.sql.gz"
```

Make executable:
```bash
sudo chmod +x /opt/glassshop/backup-db.sh
```

### Schedule Daily Backups
```bash
sudo crontab -e
```

Add:
```bash
0 2 * * * /opt/glassshop/backup-db.sh >> /var/log/glassshop/backup.log 2>&1
```

---

## 🔐 Step 11: Security Hardening

### 11.1 Update System
```bash
sudo apt update && sudo apt upgrade -y
# OR
sudo yum update -y
```

### 11.2 Setup Firewall
```bash
# Ubuntu/Debian
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Amazon Linux
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 11.3 Disable Root Login (SSH)
```bash
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
sudo systemctl restart sshd
```

### 11.4 Setup Fail2Ban (Optional)
```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## 🧪 Step 12: Testing

### Test Backend
```bash
curl http://localhost:8080/api/health
# OR
curl http://your-ec2-ip:8080/api/health
```

### Test Frontend
Open browser: `http://your-ec2-ip`

### Test API Endpoints
```bash
# Health check
curl http://your-ec2-ip/api/health

# Login (replace with actual credentials)
curl -X POST http://your-ec2-ip/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'
```

---

## 🐛 Troubleshooting

### Backend Not Starting
```bash
# Check logs
sudo journalctl -u glassshop-backend -n 50

# Check Java version
java -version

# Check if port is in use
sudo netstat -tulpn | grep 8080

# Restart service
sudo systemctl restart glassshop-backend
```

### Frontend Not Loading
```bash
# Check PM2 status
pm2 status
pm2 logs glassshop-frontend

# Restart
pm2 restart glassshop-frontend

# Check if build exists
ls -la /opt/glassshop/glass-ai-agent-frontend/build
```

### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
sudo -u postgres psql -d glassshop -c "SELECT 1;"

# Check database exists
sudo -u postgres psql -l | grep glassshop
```

### Nginx Issues
```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Reload configuration
sudo systemctl reload nginx
```

---

## 📈 Performance Optimization

### 1. Enable Gzip Compression (Already in Nginx config)
### 2. Setup CDN (Optional - CloudFront)
### 3. Database Indexing (Already configured)
### 4. Enable Caching (Add to Nginx config)

---

## 🔄 Maintenance

### Daily
- Check application logs
- Monitor disk space: `df -h`
- Monitor memory: `free -h`

### Weekly
- Review error logs
- Check backup status
- Update system packages

### Monthly
- Review security updates
- Database optimization
- Performance review

---

## 📞 Support

For issues:
1. Check logs first
2. Review this guide
3. Check AWS CloudWatch (if enabled)
4. Review application documentation

---

## ✅ Deployment Checklist

- [ ] EC2 instance created
- [ ] Security Group configured
- [ ] Application files uploaded
- [ ] Deployment script executed
- [ ] Environment variables set
- [ ] Database configured
- [ ] Backend service running
- [ ] Frontend service running
- [ ] Nginx configured
- [ ] Domain configured (optional)
- [ ] SSL certificate installed (optional)
- [ ] Backups scheduled
- [ ] Monitoring setup
- [ ] Security hardened
- [ ] Application tested

---

**Deployment Complete! 🎉**

Your application should now be accessible at:
- `http://your-ec2-ip`
- `https://your-domain.com` (if SSL configured)

