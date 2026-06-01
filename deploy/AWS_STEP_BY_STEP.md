# AWS EC2 Deployment - Complete Step by Step Guide

## 🎯 Overview

This guide will walk you through deploying the Glass Shop Application on AWS EC2, using only AWS tools and the EC2 console.

---

## 📋 Prerequisites

Before starting, ensure:
- ✅ EC2 instance is running (Ubuntu 20.04+ recommended)
- ✅ You have access to AWS Console
- ✅ Security Groups allow:
  - Port 22 (SSH)
  - Port 80 (HTTP)
  - Port 443 (HTTPS - optional)
  - Port 8080 (Backend API)

---

## Step 1: Connect to EC2 Instance

### Using EC2 Instance Connect (Easiest - No SSH Key Needed)

1. **Open AWS Console**
   - Go to: https://console.aws.amazon.com/ec2/

2. **Navigate to Instances**
   - Click **Instances** in left sidebar
   - Find your EC2 instance
   - Select it (check the box)

3. **Connect**
   - Click **Connect** button (top right)
   - Select **EC2 Instance Connect** tab
   - Click **Connect**
   - A terminal window will open in your browser

**✅ You're now connected to your EC2 instance!**

---

## Step 2: Upload Application Files

### Option A: Using Git (If your code is in a repository)

```bash
# Navigate to /opt directory
cd /opt

# Clone your repository
sudo git clone <your-repository-url> glassshop

# Navigate to the application
cd glassshop
```

### Option B: Using S3 (Recommended for large files)

**On your local machine:**

1. **Zip your application:**
   ```bash
   # Windows PowerShell
   Compress-Archive -Path "D:\Git pull\GlassShopApplication-master" -DestinationPath "glassshop.zip"
   ```

2. **Upload to S3:**
   - Go to **S3 Console** in AWS
   - Create a bucket (or use existing)
   - Upload `glassshop.zip`

**On EC2 instance:**

```bash
# Install AWS CLI
sudo apt update
sudo apt install awscli -y

# Configure AWS CLI (you'll need IAM credentials)
aws configure
# Enter your Access Key ID, Secret Access Key, Region, Output format

# Download from S3
aws s3 cp s3://your-bucket-name/glassshop.zip /tmp/

# Extract
cd /opt
sudo unzip /tmp/glassshop.zip
sudo mv GlassShopApplication-master glassshop
cd glassshop
```

### Option C: Manual Upload via EC2 Instance Connect

1. In **EC2 Instance Connect**, look for file upload option
2. Upload your application folder
3. Move to `/opt/glassshop`:
   ```bash
   sudo mv /path/to/uploaded/folder /opt/glassshop
   cd /opt/glassshop
   ```

---

## Step 3: Run Deployment Script

Once files are uploaded:

```bash
# Make sure you're in the application directory
cd /opt/glassshop

# Make deployment script executable
sudo chmod +x deploy/aws-quick-deploy.sh

# Run the deployment script
sudo ./deploy/aws-quick-deploy.sh
```

**What happens:**
- ✅ Installs Java 17, Node.js 18, PostgreSQL, Nginx, PM2
- ✅ Sets up database (you'll be prompted for password)
- ✅ Builds backend and frontend
- ✅ Configures all services
- ✅ Starts everything automatically

**⏱️ Takes about 5-10 minutes**

**📝 When prompted for database password:**
- Enter a strong password (remember it!)
- This will be used for database access

---

## Step 4: Configure Security Groups

1. **Go to EC2 Console**
   - Click **Security Groups** in left sidebar
   - Find your instance's security group
   - Click on it

2. **Edit Inbound Rules**
   - Click **Inbound rules** tab
   - Click **Edit inbound rules**

3. **Add Rules:**
   - Click **Add rule**
   - **Type**: HTTP
   - **Port**: 80
   - **Source**: 0.0.0.0/0
   - Click **Add rule** again
   - **Type**: HTTPS (optional)
   - **Port**: 443
   - **Source**: 0.0.0.0/0
   - Click **Add rule** again
   - **Type**: Custom TCP
   - **Port**: 8080
   - **Source**: 0.0.0.0/0 (or restrict to your IP for security)

4. **Save**
   - Click **Save rules**

---

## Step 5: Get Your EC2 Public IP

In the EC2 terminal:

```bash
# Get public IP
curl ifconfig.me
```

Or in AWS Console:
- Go to **EC2** → **Instances**
- Find your instance
- Copy the **Public IPv4 address**

---

## Step 6: Test Your Application

1. **Test Backend:**
   ```bash
   curl http://localhost:8080/ai/ping
   ```
   Should return: `Spring Boot is working 👍`

2. **Open in Browser:**
   - Open a new browser tab
   - Go to: `http://your-ec2-public-ip`
   - You should see the login page!

---

## Step 7: Initial Application Setup

1. **Register Your Shop:**
   - On the login page, click **Register Shop**
   - Fill in:
     - Shop Name
     - Email
     - Username
     - Password
   - Click **Register**

2. **Login:**
   - Use the credentials you just created
   - You'll be logged in as ADMIN

3. **Test the Application:**
   - Check the dashboard
   - Create stock items
   - Test add/remove functionality

---

## Step 8: Verify Everything is Working

### Check Services Status

```bash
# Backend status
sudo systemctl status glassshop-backend

# Frontend status
pm2 status

# Nginx status
sudo systemctl status nginx

# PostgreSQL status
sudo systemctl status postgresql
```

All should show as **active (running)**

### Check Logs (if needed)

```bash
# Backend logs
sudo journalctl -u glassshop-backend -f

# Frontend logs
pm2 logs glassshop-frontend

# Nginx logs
sudo tail -f /var/log/nginx/error.log
```

---

## 🔧 Troubleshooting

### Problem: Can't access application in browser

**Solution:**
1. Check Security Groups (Step 4)
2. Check firewall:
   ```bash
   sudo ufw status
   sudo ufw allow 80/tcp
   ```
3. Check if services are running (Step 8)

### Problem: Backend not starting

**Solution:**
```bash
# Check logs
sudo journalctl -u glassshop-backend -n 50

# Common fixes:
# 1. Check database password in config
sudo nano /opt/glassshop/GlassShop/src/main/resources/application-prod.properties

# 2. Restart service
sudo systemctl restart glassshop-backend
```

### Problem: Frontend not loading

**Solution:**
```bash
# Check PM2
pm2 status
pm2 logs glassshop-frontend

# Restart
pm2 restart glassshop-frontend
```

### Problem: Database connection error

**Solution:**
```bash
# Test connection
psql -U glassshop_user -d glassshop -h localhost
# Enter password when prompted

# If fails, check PostgreSQL is running
sudo systemctl status postgresql
sudo systemctl start postgresql
```

---

## 📝 Important Files & Locations

**Application:** `/opt/glassshop`

**Configuration Files:**
- Backend: `/opt/glassshop/GlassShop/src/main/resources/application-prod.properties`
- Frontend: `/opt/glassshop/glass-ai-agent-frontend/.env.production`
- Nginx: `/etc/nginx/sites-available/glassshop`

**Service Files:**
- Backend: `/etc/systemd/system/glassshop-backend.service`

**Logs:**
- Backend: `sudo journalctl -u glassshop-backend`
- Frontend: `pm2 logs`
- Nginx: `/var/log/nginx/`

---

## 🔄 Updating Application (After Code Changes)

```bash
# Navigate to application
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

## 🔒 Security Recommendations

1. **Change Default Passwords:**
   - Database password (already set during deployment)
   - JWT secret is auto-generated

2. **Restrict Security Groups:**
   - Only allow your IP for port 8080
   - Use HTTPS instead of HTTP

3. **Setup SSL (Optional):**
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d your-domain.com
   ```

---

## ✅ Deployment Checklist

- [ ] Connected to EC2 instance
- [ ] Application files uploaded
- [ ] Deployment script executed successfully
- [ ] Security groups configured
- [ ] Application accessible in browser
- [ ] Shop registered and admin account created
- [ ] Application tested and working

---

## 🎉 Success!

Your application is now deployed and running on AWS EC2!

**Access it at:** `http://your-ec2-public-ip`

**Next Steps:**
- Consider setting up a domain name
- Setup SSL certificate for HTTPS
- Configure database backups
- Setup CloudWatch monitoring

---

## 📞 Quick Commands Reference

```bash
# Restart all services
sudo systemctl restart glassshop-backend
pm2 restart all
sudo systemctl restart nginx

# View logs
sudo journalctl -u glassshop-backend -f
pm2 logs glassshop-frontend

# Check status
sudo systemctl status glassshop-backend
pm2 status
```

---

**Need Help?** Check the logs first, then review the troubleshooting section above.

