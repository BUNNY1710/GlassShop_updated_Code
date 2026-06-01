# ✅ AWS EC2 Deployment - READY FOR DEMO

## 🎉 Your Application is Ready for Deployment!

All deployment scripts and documentation have been created. You can now deploy your Glass Shop Application from GitHub to AWS EC2 for your client's 1-month free demo.

---

## 📦 What Was Created

### ⭐ Main Deployment Script

**`deploy/deploy-from-github.sh`** - Complete automated deployment
- Installs all dependencies (Java, Node.js, PostgreSQL, Nginx, etc.)
- Clones from GitHub
- Sets up database and creates all tables
- Builds backend (Spring Boot) and frontend (React)
- Configures all services
- Generates secure passwords
- **Just run this one script!**

### 📚 Documentation

1. **`deploy/QUICK_START.md`** - ⭐ **START HERE!** 5-minute quick start guide
2. **`deploy/GITHUB_DEPLOYMENT_GUIDE.md`** - Complete deployment guide with troubleshooting
3. **`deploy/README_DEPLOYMENT.md`** - Overview of all deployment files
4. **`deploy/create-all-tables.sql`** - Complete database schema (all 14 tables)

### 🔧 Utility Scripts

- `deploy/update-application.sh` - Update after code changes
- `deploy/backup-database.sh` - Backup database
- `deploy/restore-database.sh` - Restore database
- `deploy/setup-env.sh` - Environment configuration

---

## 🚀 Quick Deployment (5 Minutes)

**🪟 Windows Users**: See `deploy/WINDOWS_QUICK_START.md` for Windows-specific instructions!

### Step 1: Push Code to GitHub

```bash
# Make sure all code is committed and pushed
git add .
git commit -m "Ready for deployment"
git push origin master
```

### Step 2: Launch EC2 Instance

1. Go to AWS Console → EC2 → Launch Instance
2. Choose **Ubuntu 22.04 LTS**
3. Instance Type: **t3.medium** (minimum)
4. Configure Security Group:
   - Port **22** (SSH) - Your IP only
   - Port **80** (HTTP) - 0.0.0.0/0 (public)
5. Launch and download key pair (.pem file)

### Step 3: Deploy

```bash
# Connect to EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Download deployment script
cd /tmp
# Option 1: Clone your repo (if deployment scripts are in it)
git clone https://github.com/YOUR_USERNAME/GlassShopApplication.git temp-repo
cd temp-repo/deploy

# Option 2: Or download script directly
# wget https://raw.githubusercontent.com/YOUR_USERNAME/GlassShopApplication/master/deploy/deploy-from-github.sh

# Make executable and run
chmod +x deploy-from-github.sh
sudo ./deploy-from-github.sh
```

**When prompted:**
- Enter your GitHub repository URL
- Enter branch name (default: `master`)

**Wait 15-20 minutes** - Script does everything automatically!

### Step 4: Access Application

Open browser: `http://your-ec2-ip`

**Done!** ✅

---

## 📋 What Happens During Deployment

The script automatically:

1. ✅ Installs Java 17, Node.js 18, PostgreSQL, Maven, Nginx, PM2
2. ✅ Clones your code from GitHub
3. ✅ Creates PostgreSQL database (`glassshop`)
4. ✅ Creates database user with secure password
5. ✅ Runs SQL script to create all 14 tables
6. ✅ Builds Spring Boot backend
7. ✅ Builds React frontend
8. ✅ Configures systemd service for backend
9. ✅ Configures PM2 for frontend
10. ✅ Configures Nginx reverse proxy
11. ✅ Sets up firewall rules
12. ✅ Generates JWT secret
13. ✅ Saves all credentials to `/opt/glassshop/DEPLOYMENT_CREDENTIALS.txt`

---

## 🔐 After Deployment

### Save Credentials

```bash
# On EC2 instance
sudo cat /opt/glassshop/DEPLOYMENT_CREDENTIALS.txt
```

**IMPORTANT**: Save this file! It contains:
- Database password
- JWT secret
- Service management commands
- Log locations

### Verify Services

```bash
# Check all services
sudo systemctl status glassshop-backend  # Should show "active"
pm2 status                                 # Should show "online"
sudo systemctl status nginx               # Should show "active"
sudo systemctl status postgresql          # Should show "active"
```

### Test Application

1. Open `http://your-ec2-ip` in browser
2. Should see login/register page
3. Register a new shop (first user becomes admin)
4. Test all features

---

## 🔄 Updating Application (After Code Changes)

### Quick Update

```bash
# On EC2 instance
cd /opt/glassshop
sudo ./deploy/update-application.sh
```

### Manual Update

```bash
# Pull latest code
cd /opt/glassshop
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
   sudo tail -f /var/log/nginx/error.log
   ```

### Backend Won't Start?

```bash
# Check logs
sudo journalctl -u glassshop-backend -n 100

# Check database connection
sudo -u postgres psql -d glassshop -c "SELECT 1;"
```

### Frontend Won't Load?

```bash
# Restart frontend
pm2 restart glassshop-frontend

# Check logs
pm2 logs glassshop-frontend

# Rebuild if needed
cd /opt/glassshop/glass-ai-agent-frontend
npm run build
pm2 restart glassshop-frontend
```

See **`deploy/GITHUB_DEPLOYMENT_GUIDE.md`** for detailed troubleshooting.

---

## 📊 Monitoring & Maintenance

### View Logs

```bash
# Backend logs (real-time)
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

# Restart database
sudo systemctl restart postgresql
```

### Backup Database

```bash
cd /opt/glassshop
sudo ./deploy/backup-database.sh
```

Backups saved to: `/opt/glassshop/backups/`

---

## 💰 Cost Estimate (1 Month Demo)

- **EC2 t3.medium**: ~$30/month (on-demand)
- **Data Transfer**: ~$10/month (first 10GB free)
- **Storage**: ~$2/month (20GB GP3)
- **Total**: ~$42/month

**Savings Tips**:
- Use Reserved Instances: Save 40-60% (commit to 1 year)
- Use Spot Instances: Save 70-90% (interruptible, good for demos)
- Use t3.small: ~$15/month (may need more memory for production)

---

## ✅ Pre-Deployment Checklist

Before deploying, ensure:

- [ ] Code is pushed to GitHub
- [ ] All migrations are in `GlassShop/src/main/resources/db/migration/`
- [ ] `application-prod.properties` is configured correctly
- [ ] Frontend `.env.production` has correct API URL
- [ ] EC2 instance is launched (Ubuntu 22.04, t3.medium+)
- [ ] Security Group is configured (ports 22, 80)
- [ ] SSH key pair is downloaded (.pem file)
- [ ] You have SSH access to EC2 instance

---

## 📚 Documentation Files

All documentation is in the `deploy/` folder:

1. **`QUICK_START.md`** - ⭐ Start here! 5-minute guide
2. **`GITHUB_DEPLOYMENT_GUIDE.md`** - Complete guide with troubleshooting
3. **`README_DEPLOYMENT.md`** - Overview of all files
4. **`AWS_EC2_DEPLOYMENT_GUIDE.md`** - Original detailed guide

---

## 🎯 Next Steps

1. **Read**: `deploy/QUICK_START.md` (5 minutes)
2. **Deploy**: Run `deploy/deploy-from-github.sh` (15-20 minutes)
3. **Test**: Access `http://your-ec2-ip` and test application
4. **Share**: Give URL to client for demo!
5. **Monitor**: Check logs daily for first week

---

## 🎉 Success!

Once deployed, you'll have:

- ✅ Fully functional Glass Shop Application
- ✅ Production-ready setup
- ✅ Automated deployment process
- ✅ Easy update process
- ✅ Database backups
- ✅ Monitoring and logging
- ✅ Ready for client demo!

---

## 📞 Support

If you encounter issues:

1. Check logs (see Troubleshooting section)
2. Review `deploy/GITHUB_DEPLOYMENT_GUIDE.md`
3. Verify all services are running
4. Check security group settings

---

## 🚀 Ready to Deploy?

**Everything is ready!** Just follow these 3 steps:

1. **Push code to GitHub** (if not already done)
2. **Launch EC2 instance** (Ubuntu 22.04, t3.medium)
3. **Run deployment script** (`deploy/deploy-from-github.sh`)

**Your application will be live in 15-20 minutes!**

---

**Good luck with your client demo! 🎉**

---

**Files Created:**
- ✅ `deploy/deploy-from-github.sh` - Main deployment script
- ✅ `deploy/QUICK_START.md` - Quick start guide
- ✅ `deploy/GITHUB_DEPLOYMENT_GUIDE.md` - Complete guide
- ✅ `deploy/README_DEPLOYMENT.md` - Documentation overview
- ✅ `deploy/create-all-tables.sql` - Database schema
- ✅ `AWS_EC2_DEPLOYMENT_READY.md` - This file

**All set! Time to deploy! 🚀**

