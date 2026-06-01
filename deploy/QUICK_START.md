# 🚀 Quick Start - Deploy to AWS EC2 (5 Minutes)

## For Your Client's 1-Month Demo

This is the fastest way to deploy your Glass Shop Application to AWS EC2 from GitHub.

**🪟 Windows Users**: See `WINDOWS_QUICK_START.md` for Windows-specific instructions!

---

## ✅ What You Need

1. GitHub repository URL (where your code is)
2. AWS EC2 instance running Ubuntu 22.04
3. SSH access to EC2 instance
   - **Windows**: Use Git Bash (comes with Git for Windows) - See `WINDOWS_QUICK_START.md`
   - **Mac/Linux**: Use Terminal

---

## 🎯 Step-by-Step (5 Minutes)

### 1. Launch EC2 Instance (2 minutes)

1. Go to AWS Console → EC2 → Launch Instance
2. Choose **Ubuntu 22.04 LTS**
3. Instance Type: **t3.medium**
4. Configure Security Group:
   - **Port 22** (SSH) - Your IP only
   - **Port 80** (HTTP) - 0.0.0.0/0 (everyone)
5. Launch instance and download key pair (.pem file)

### 2. Connect to EC2 (30 seconds)

```bash
# From your local machine
ssh -i your-key.pem ubuntu@your-ec2-ip

# If permission denied, fix key permissions:
chmod 400 your-key.pem
```

### 3. Run Deployment Script (2 minutes)

Once connected to EC2, run these commands:

```bash
# Download deployment script
cd /tmp
git clone https://github.com/YOUR_USERNAME/GlassShopApplication.git temp-repo
cd temp-repo/deploy

# OR if script is already in your repo, just download it:
# wget https://raw.githubusercontent.com/YOUR_USERNAME/GlassShopApplication/master/deploy/deploy-from-github.sh

# Make executable and run
chmod +x deploy-from-github.sh
sudo ./deploy-from-github.sh
```

**When prompted:**
- Enter your GitHub repository URL
- Enter branch name (default: `master`)
- Wait 15-20 minutes (script does everything automatically!)

### 4. Access Application (30 seconds)

Open in browser:
```
http://your-ec2-ip
```

**Done!** ✅

---

## 📝 What the Script Does Automatically

✅ Installs Java 17, Node.js 18, PostgreSQL, Nginx, PM2  
✅ Clones your code from GitHub  
✅ Sets up database and creates all tables  
✅ Builds backend (Spring Boot)  
✅ Builds frontend (React)  
✅ Configures all services  
✅ Sets up reverse proxy  
✅ Generates secure passwords  
✅ Saves credentials to `/opt/glassshop/DEPLOYMENT_CREDENTIALS.txt`

---

## 🔍 Verify It's Working

```bash
# Check services (on EC2)
sudo systemctl status glassshop-backend
pm2 status
sudo systemctl status nginx

# If all show "active" or "online" - it's working!
```

Open in browser: `http://your-ec2-ip`

---

## 📋 Credentials

After deployment, credentials are saved here:
```bash
sudo cat /opt/glassshop/DEPLOYMENT_CREDENTIALS.txt
```

**Save this file!** It has database passwords and secrets.

---

## 🔄 Update Application (After Code Changes)

```bash
# On EC2 instance
cd /opt/glassshop
sudo ./deploy/update-application.sh
```

Or manually:
```bash
cd /opt/glassshop
git pull origin master
cd GlassShop && ./mvnw clean package -DskipTests
sudo systemctl restart glassshop-backend
cd ../glass-ai-agent-frontend && npm install && npm run build
pm2 restart glassshop-frontend
```

---

## 🐛 Troubleshooting

### Can't Access Application?

1. **Check Security Group**: Port 80 must be open (0.0.0.0/0)
2. **Check Services**:
   ```bash
   sudo systemctl status glassshop-backend
   pm2 status
   sudo systemctl status nginx
   ```
3. **Check Logs**:
   ```bash
   sudo journalctl -u glassshop-backend -n 50
   pm2 logs glassshop-frontend
   ```

### Backend Won't Start?

```bash
# Check logs
sudo journalctl -u glassshop-backend -n 100

# Check database
sudo systemctl status postgresql
```

### Frontend Won't Load?

```bash
# Restart frontend
pm2 restart glassshop-frontend

# Check logs
pm2 logs glassshop-frontend
```

---

## 💰 Cost Estimate (1 Month Demo)

- **EC2 t3.medium**: ~$30/month (on-demand)
- **Data Transfer**: ~$10/month (first 10GB free)
- **Total**: ~$40/month

**Tip**: Use Reserved Instances or Spot Instances to save 50-70%

---

## 📞 Quick Reference

### Service Management:
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

### View Logs:
```bash
# Backend logs
sudo journalctl -u glassshop-backend -f

# Frontend logs
pm2 logs glassshop-frontend

# Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Check Status:
```bash
# All services
sudo systemctl status glassshop-backend
pm2 status
sudo systemctl status nginx
sudo systemctl status postgresql
```

---

## 🎉 Success!

Once deployment is complete:

1. ✅ Share URL: `http://your-ec2-ip`
2. ✅ Client can register their shop
3. ✅ First user becomes admin
4. ✅ Application is ready for demo!

---

**Total Setup Time**: ~5 minutes (most is waiting for script to finish)  
**Maintenance**: Update script handles code changes automatically  
**Support**: Check logs if issues occur

**Ready to deploy? Let's go! 🚀**

