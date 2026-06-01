# GitHub to AWS EC2 Deployment Guide
## Glass Shop Application - Complete Production Setup

This guide will help you deploy the Glass Shop Application from GitHub to AWS EC2 for your client's 1-month free demo.

---

## 📋 Prerequisites

1. **GitHub Repository** with your code pushed
2. **AWS Account** with EC2 access
3. **EC2 Instance** (Recommended: t3.medium or larger)
   - Ubuntu 22.04 LTS (Recommended) or Amazon Linux 2023
   - Minimum 2GB RAM, 20GB storage
   - Security Group configured (see below)

---

## 🔒 Step 1: Configure AWS EC2 Instance

### 1.1 Launch EC2 Instance

1. Go to AWS Console → EC2 → Launch Instance
2. Choose Ubuntu 22.04 LTS (or Amazon Linux 2023)
3. Instance Type: **t3.medium** (minimum for production)
4. Configure Storage: 20GB+ GP3
5. Configure Security Group (see below)

### 1.2 Configure Security Group

**Required Ports:**
- **22** (SSH) - Your IP only (restrict this!)
- **80** (HTTP) - 0.0.0.0/0 (for public access)
- **443** (HTTPS) - 0.0.0.0/0 (optional, for SSL)

**Steps:**
1. Go to Security Groups → Create Security Group
2. Add Inbound Rules:
   ```
   Type: SSH
   Port: 22
   Source: Your IP (restrict this!)
   
   Type: HTTP
   Port: 80
   Source: 0.0.0.0/0
   
   Type: HTTPS (Optional)
   Port: 443
   Source: 0.0.0.0/0
   ```
3. Attach to your EC2 instance

### 1.3 Get EC2 Instance Details

Note down:
- **Public IP Address** (e.g., 54.123.45.67)
- **SSH Key Pair** (.pem file)

---

## 🚀 Step 2: Connect to EC2 Instance

### From Your Local Machine:

```bash
# For Ubuntu/Debian
ssh -i your-key.pem ubuntu@your-ec2-ip

# For Amazon Linux
ssh -i your-key.pem ec2-user@your-ec2-ip
```

**If SSH fails:**
- Check security group allows your IP on port 22
- Verify key file permissions: `chmod 400 your-key.pem`

---

## 📦 Step 3: Upload Deployment Script

### Option A: Clone Directly from GitHub (Recommended)

If your deployment scripts are in the repository:

```bash
# On EC2 instance
cd /tmp
git clone https://github.com/your-username/GlassShopApplication.git temp-repo
cp -r temp-repo/deploy /opt/deploy
cd /opt/deploy
chmod +x deploy-from-github.sh
```

### Option B: Upload via SCP

```bash
# From your local machine
scp -i your-key.pem -r deploy ubuntu@your-ec2-ip:/opt/deploy
```

---

## ⚙️ Step 4: Run Deployment Script

### On EC2 Instance:

```bash
# Make script executable
cd /opt/deploy
sudo chmod +x deploy-from-github.sh

# Run deployment (this will take 15-20 minutes)
sudo ./deploy-from-github.sh
```

### What the Script Does:

1. ✅ Installs Java 17, Node.js 18, PostgreSQL, Maven, Nginx, PM2
2. ✅ Clones your GitHub repository
3. ✅ Sets up PostgreSQL database and creates all tables
4. ✅ Builds Spring Boot backend
5. ✅ Builds React frontend
6. ✅ Configures systemd service for backend
7. ✅ Configures PM2 for frontend
8. ✅ Configures Nginx reverse proxy
9. ✅ Sets up firewall rules
10. ✅ Generates secure passwords and saves credentials

---

## 🔧 Step 5: Verify Deployment

### Check Services:

```bash
# Backend status
sudo systemctl status glassshop-backend

# Frontend status
pm2 status

# Database status
sudo systemctl status postgresql

# Nginx status
sudo systemctl status nginx
```

### Check Logs:

```bash
# Backend logs
sudo journalctl -u glassshop-backend -n 50 -f

# Frontend logs
pm2 logs glassshop-frontend

# Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Test Application:

1. Open browser: `http://your-ec2-ip`
2. You should see the login page
3. Register a new shop (first user will be admin)
4. Test the application

---

## 📝 Step 6: Save Credentials

The deployment script generates a credentials file:

```bash
sudo cat /opt/glassshop/DEPLOYMENT_CREDENTIALS.txt
```

**Save this file securely!** It contains:
- Database credentials
- JWT secret
- Service status commands
- Log locations

---

## 🔄 Step 7: Updating Application (After Code Changes)

### Quick Update:

```bash
cd /opt/glassshop
sudo ./deploy/update-application.sh
```

This script will:
1. Pull latest code from GitHub
2. Rebuild backend/frontend
3. Restart services
4. Create backups

### Manual Update:

```bash
# On EC2 instance
cd /opt/glassshop

# Pull latest code
git pull origin master

# Rebuild backend
cd GlassShop
./mvnw clean package -DskipTests
sudo systemctl restart glassshop-backend

# Rebuild frontend
cd ../glass-ai-agent-frontend
npm install
npm run build
pm2 restart glassshop-frontend
```

---

## 🔍 Troubleshooting

### Backend Won't Start

```bash
# Check logs
sudo journalctl -u glassshop-backend -n 100

# Check if port 8080 is in use
sudo netstat -tlnp | grep 8080

# Check database connection
sudo -u postgres psql -d glassshop -c "SELECT 1;"
```

### Frontend Won't Load

```bash
# Check PM2 status
pm2 status
pm2 logs glassshop-frontend

# Check if port 3000 is in use
sudo netstat -tlnp | grep 3000

# Restart frontend
pm2 restart glassshop-frontend
```

### Database Connection Issues

```bash
# Test database connection
sudo -u postgres psql -d glassshop -U glassshop_user

# Check PostgreSQL is running
sudo systemctl status postgresql

# Check database exists
sudo -u postgres psql -c "\l" | grep glassshop
```

### Nginx Errors

```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Reload nginx
sudo systemctl reload nginx
```

### Can't Access Application

1. **Check Security Group**: Ensure port 80 is open to 0.0.0.0/0
2. **Check Firewall**: 
   ```bash
   sudo ufw status
   sudo ufw allow 80/tcp
   ```
3. **Check Nginx**: `sudo systemctl status nginx`
4. **Check Backend**: `sudo systemctl status glassshop-backend`

---

## 🔐 Security Recommendations

### For Production Demo:

1. **Change Default Passwords**: Update database password after deployment
2. **Restrict SSH**: Only allow your IP in security group
3. **Enable HTTPS**: Set up SSL certificate (Let's Encrypt)
4. **Regular Updates**: Update system packages regularly
5. **Backup Database**: Set up automated backups

### Enable HTTPS (Optional):

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is set up automatically
```

---

## 📊 Monitoring

### View Application Logs:

```bash
# Backend logs (real-time)
sudo journalctl -u glassshop-backend -f

# Frontend logs
pm2 logs glassshop-frontend

# All logs
sudo journalctl -u glassshop-backend -n 1000 > /tmp/backend.log
```

### Check Resource Usage:

```bash
# CPU and Memory
htop

# Disk usage
df -h

# Process status
ps aux | grep -E "java|node|nginx|postgres"
```

---

## 💾 Database Backup & Restore

### Backup Database:

```bash
cd /opt/glassshop
sudo ./deploy/backup-database.sh
```

Backup will be saved to: `/opt/glassshop/backups/`

### Restore Database:

```bash
cd /opt/glassshop
sudo ./deploy/restore-database.sh
```

---

## 📋 Maintenance Commands

### Daily Checks:

```bash
# Check all services
sudo systemctl status glassshop-backend
pm2 status
sudo systemctl status nginx
sudo systemctl status postgresql

# Check disk space
df -h

# Check application logs
sudo journalctl -u glassshop-backend --since "1 hour ago"
```

### Restart Services:

```bash
# Restart backend
sudo systemctl restart glassshop-backend

# Restart frontend
pm2 restart glassshop-frontend

# Restart nginx
sudo systemctl restart nginx

# Restart database
sudo systemctl restart postgresql
```

---

## 🎯 Quick Start Checklist

- [ ] EC2 instance launched (t3.medium or larger)
- [ ] Security group configured (ports 22, 80, 443)
- [ ] SSH access working
- [ ] Deployment script uploaded
- [ ] Deployment script executed
- [ ] Application accessible at http://your-ec2-ip
- [ ] Credentials saved securely
- [ ] Client can access and use application

---

## 📞 Support

If you encounter issues:

1. Check logs (see Troubleshooting section)
2. Verify all services are running
3. Check security group settings
4. Review deployment credentials file

---

## 🎉 Success!

Once deployment is complete:

1. **Share URL with client**: `http://your-ec2-ip`
2. **Provide admin credentials** (after first shop registration)
3. **Documentation**: Share this guide with client for reference
4. **Monitor**: Check logs daily for first week

---

**Deployment Time**: 15-20 minutes  
**Setup Complexity**: Automated (just run the script!)  
**Maintenance**: Minimal (update script handles changes)

**Good luck with your demo! 🚀**

