# AWS EC2 Deployment - Step by Step Guide

## Prerequisites Checklist

Before starting, ensure you have:
- [ ] EC2 instance running (Ubuntu 20.04 LTS or later)
- [ ] Security Groups configured:
  - Port 22 (SSH)
  - Port 80 (HTTP)
  - Port 443 (HTTPS - optional)
  - Port 8080 (Backend API)
- [ ] Access to EC2 instance (SSH key pair or Session Manager)

---

## Step 1: Connect to Your EC2 Instance

### Option A: Using EC2 Instance Connect (Recommended - No SSH Key Needed)

1. Go to **AWS Console** → **EC2** → **Instances**
2. Select your EC2 instance
3. Click **Connect** button
4. Select **EC2 Instance Connect** tab
5. Click **Connect**

### Option B: Using Session Manager (If enabled)

1. Go to **AWS Console** → **EC2** → **Instances**
2. Select your EC2 instance
3. Click **Connect** button
4. Select **Session Manager** tab
5. Click **Connect**

### Option C: Using SSH (If you have key pair)

1. Go to **AWS Console** → **EC2** → **Instances**
2. Select your EC2 instance
3. Click **Connect** button
4. Select **SSH client** tab
5. Follow the instructions shown

---

## Step 2: Upload Application Files to EC2

### Method 1: Using AWS Systems Manager (Recommended)

1. **On your local machine**, zip your application:
   ```bash
   # Create zip file
   cd "D:\Git pull"
   tar -czf GlassShopApplication.tar.gz GlassShopApplication-master
   ```

2. **Upload to S3**:
   - Go to **S3 Console** → Create a bucket (or use existing)
   - Upload `GlassShopApplication.tar.gz` to S3

3. **Download on EC2**:
   ```bash
   # Install AWS CLI if not installed
   sudo apt update
   sudo apt install awscli -y
   
   # Configure AWS CLI (you'll need access keys)
   aws configure
   # Enter: Access Key ID, Secret Access Key, Region, Output format
   
   # Download from S3
   aws s3 cp s3://your-bucket-name/GlassShopApplication.tar.gz /tmp/
   
   # Extract
   cd /opt
   sudo tar -xzf /tmp/GlassShopApplication.tar.gz
   sudo mv GlassShopApplication-master glassshop
   ```

### Method 2: Using Git (If code is in repository)

```bash
# On EC2 instance
cd /opt
sudo git clone <your-repository-url> glassshop
cd glassshop
```

### Method 3: Using EC2 Instance Connect File Transfer

1. In **EC2 Instance Connect**, use the file transfer feature
2. Upload your application folder to `/opt/glassshop`

---

## Step 3: Run the Deployment Script

Once files are on EC2:

```bash
# Navigate to application directory
cd /opt/glassshop

# Make script executable
sudo chmod +x deploy/remote-deploy.sh

# Run deployment script
sudo ./deploy/remote-deploy.sh
```

**What happens:**
- Script will install all dependencies
- You'll be prompted for database password (enter a strong password)
- Script will build and configure everything
- Takes about 5-10 minutes

---

## Step 4: Verify Installation

After script completes, verify services:

```bash
# Check backend service
sudo systemctl status glassshop-backend

# Check frontend service
pm2 status

# Check nginx
sudo systemctl status nginx

# Get your EC2 public IP
curl ifconfig.me

# Test backend
curl http://localhost:8080/ai/ping
```

---

## Step 5: Configure Security Groups

1. Go to **EC2 Console** → **Security Groups**
2. Select your instance's security group
3. **Inbound Rules** → **Edit inbound rules**
4. Add rules:
   - **Type**: HTTP, **Port**: 80, **Source**: 0.0.0.0/0
   - **Type**: HTTPS, **Port**: 443, **Source**: 0.0.0.0/0 (optional)
   - **Type**: Custom TCP, **Port**: 8080, **Source**: 0.0.0.0/0 (or restrict to your IP)
5. Click **Save rules**

---

## Step 6: Access Your Application

1. Get your EC2 public IP:
   ```bash
   curl ifconfig.me
   ```

2. Open in browser:
   ```
   http://your-ec2-public-ip
   ```

3. You should see the login page!

---

## Step 7: Initial Setup (First Time)

1. **Register a Shop**:
   - Click "Register Shop" on login page
   - Fill in shop details
   - Create admin account

2. **Login** with your admin credentials

3. **Test the application**:
   - Create stock items
   - Test add/remove functionality
   - Check dashboard

---

## Troubleshooting

### Backend Not Starting

```bash
# Check logs
sudo journalctl -u glassshop-backend -n 50

# Common issues:
# 1. Database connection - check password in application-prod.properties
# 2. Port already in use - check: sudo netstat -tulpn | grep 8080
# 3. Java not found - check: java -version
```

### Frontend Not Loading

```bash
# Check PM2 status
pm2 status
pm2 logs glassshop-frontend

# Restart if needed
pm2 restart glassshop-frontend
```

### Can't Access from Browser

1. **Check Security Groups** (Step 5)
2. **Check Firewall**:
   ```bash
   sudo ufw status
   sudo ufw allow 80/tcp
   ```
3. **Check Nginx**:
   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### Database Connection Error

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U glassshop_user -d glassshop -h localhost
# Enter password when prompted

# If connection fails, check:
sudo nano /opt/glassshop/GlassShop/src/main/resources/application-prod.properties
# Verify database credentials
```

---

## Common Commands Reference

### View Logs
```bash
# Backend logs
sudo journalctl -u glassshop-backend -f

# Frontend logs
pm2 logs glassshop-frontend

# Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Restart Services
```bash
# Restart backend
sudo systemctl restart glassshop-backend

# Restart frontend
pm2 restart glassshop-frontend

# Restart nginx
sudo systemctl restart nginx

# Restart all
sudo systemctl restart glassshop-backend && pm2 restart all && sudo systemctl restart nginx
```

### Check Service Status
```bash
# Backend
sudo systemctl status glassshop-backend

# Frontend
pm2 status

# Nginx
sudo systemctl status nginx

# PostgreSQL
sudo systemctl status postgresql
```

### Update Application (After Code Changes)

```bash
cd /opt/glassshop

# Pull latest code (if using git)
sudo git pull

# Or upload new files, then:

# Rebuild backend
cd GlassShop
sudo mvn clean package -DskipTests

# Rebuild frontend
cd ../glass-ai-agent-frontend
sudo npm install
sudo npm run build

# Restart services
sudo systemctl restart glassshop-backend
pm2 restart glassshop-frontend
```

---

## Security Recommendations

1. **Change Default Passwords**:
   - Database password (already set during deployment)
   - JWT secret (auto-generated, but you can change it)

2. **Restrict Security Groups**:
   - Only allow your IP for port 8080
   - Use HTTPS (port 443) instead of HTTP

3. **Setup SSL Certificate** (Optional but Recommended):
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d your-domain.com
   ```

4. **Regular Updates**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

---

## Next Steps

1. ✅ Application is deployed and running
2. ✅ Access via browser: `http://your-ec2-ip`
3. ✅ Register your shop and create admin account
4. ⚠️ Consider setting up a domain name
5. ⚠️ Setup SSL certificate for HTTPS
6. ⚠️ Configure backups for database
7. ⚠️ Setup monitoring (CloudWatch)

---

## Quick Reference

**Application Location**: `/opt/glassshop`

**Configuration Files**:
- Backend: `/opt/glassshop/GlassShop/src/main/resources/application-prod.properties`
- Frontend: `/opt/glassshop/glass-ai-agent-frontend/.env.production`
- Nginx: `/etc/nginx/sites-available/glassshop`

**Service Files**:
- Backend: `/etc/systemd/system/glassshop-backend.service`
- Frontend: PM2 (no file, managed by PM2)

**Logs**:
- Backend: `sudo journalctl -u glassshop-backend`
- Frontend: `pm2 logs`
- Nginx: `/var/log/nginx/`

---

## Need Help?

If you encounter issues:
1. Check the logs (commands above)
2. Verify all services are running
3. Check security groups in AWS Console
4. Review firewall rules: `sudo ufw status`

