# 🚀 Glass Shop Application - AWS EC2 Deployment

Complete deployment solution for deploying from GitHub to AWS EC2 for your client's 1-month free demo.

---

## 📦 What's Included

### Deployment Scripts

1. **`deploy-from-github.sh`** - Master deployment script (use this!)
   - Automated deployment from GitHub
   - Installs all dependencies
   - Sets up database
   - Builds and deploys application
   - Configures all services

2. **`update-application.sh`** - Update existing deployment
   - Pulls latest code from GitHub
   - Rebuilds application
   - Restarts services
   - Creates backups

3. **`backup-database.sh`** - Database backup
4. **`restore-database.sh`** - Database restore
5. **`setup-env.sh`** - Environment configuration

### Documentation

1. **`QUICK_START.md`** - 5-minute quick start guide ⭐ START HERE
2. **`GITHUB_DEPLOYMENT_GUIDE.md`** - Complete deployment guide
3. **`create-all-tables.sql`** - Database schema (all tables in one file)

---

## 🎯 Quick Start (5 Minutes)

### 1. Prerequisites

- [ ] GitHub repository with your code
- [ ] AWS EC2 instance (Ubuntu 22.04, t3.medium or larger)
- [ ] Security Group configured (ports 22, 80, 443)

### 2. Deploy

```bash
# Connect to EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Download and run deployment script
cd /tmp
git clone https://github.com/YOUR_USERNAME/GlassShopApplication.git temp-repo
cd temp-repo/deploy
chmod +x deploy-from-github.sh
sudo ./deploy-from-github.sh
```

**When prompted:**
- Enter GitHub repository URL
- Enter branch (default: `master`)
- Wait 15-20 minutes

### 3. Access

Open browser: `http://your-ec2-ip`

**Done!** ✅

---

## 📋 Full Documentation

See **`QUICK_START.md`** for step-by-step instructions.

See **`GITHUB_DEPLOYMENT_GUIDE.md`** for complete deployment guide with troubleshooting.

---

## 🔄 After Deployment

### Update Application (Code Changes)

```bash
cd /opt/glassshop
sudo ./deploy/update-application.sh
```

### View Credentials

```bash
sudo cat /opt/glassshop/DEPLOYMENT_CREDENTIALS.txt
```

### Check Status

```bash
sudo systemctl status glassshop-backend
pm2 status
sudo systemctl status nginx
```

### View Logs

```bash
# Backend
sudo journalctl -u glassshop-backend -f

# Frontend
pm2 logs glassshop-frontend

# Nginx
sudo tail -f /var/log/nginx/error.log
```

---

## 🗂️ File Structure

```
deploy/
├── deploy-from-github.sh      # ⭐ Main deployment script
├── update-application.sh       # Update existing deployment
├── backup-database.sh          # Database backup
├── restore-database.sh         # Database restore
├── setup-env.sh                # Environment setup
├── create-all-tables.sql       # Database schema (all tables)
├── nginx.conf                  # Nginx configuration
├── QUICK_START.md              # ⭐ 5-minute quick start
├── GITHUB_DEPLOYMENT_GUIDE.md  # Complete guide
└── README_DEPLOYMENT.md        # This file
```

---

## ✅ What Gets Installed

The deployment script automatically installs:

- ✅ **Java 17** (OpenJDK or Amazon Corretto)
- ✅ **Node.js 18** (via NodeSource)
- ✅ **PostgreSQL 15** (latest stable)
- ✅ **Maven** (for Java builds)
- ✅ **Nginx** (reverse proxy)
- ✅ **PM2** (process manager for Node.js)
- ✅ **Git** (for cloning repository)

---

## 🔐 Security Features

- ✅ Secure password generation for database
- ✅ JWT secret generation
- ✅ Firewall configuration
- ✅ Service isolation
- ✅ Credentials saved securely (600 permissions)

---

## 💰 Cost Estimate (1 Month)

- **EC2 t3.medium**: ~$30/month
- **Data Transfer**: ~$10/month
- **Total**: ~$40/month

**Savings Tip**: Use Reserved Instances or Spot Instances to save 50-70%

---

## 🐛 Troubleshooting

### Common Issues

1. **Can't access application?**
   - Check Security Group (port 80 open)
   - Check firewall: `sudo ufw status`
   - Check services: `sudo systemctl status glassshop-backend`

2. **Backend won't start?**
   - Check logs: `sudo journalctl -u glassshop-backend -n 100`
   - Check database: `sudo systemctl status postgresql`

3. **Frontend won't load?**
   - Restart: `pm2 restart glassshop-frontend`
   - Check logs: `pm2 logs glassshop-frontend`

See **`GITHUB_DEPLOYMENT_GUIDE.md`** for detailed troubleshooting.

---

## 📞 Support

For issues:
1. Check logs (see above)
2. Review **`GITHUB_DEPLOYMENT_GUIDE.md`** troubleshooting section
3. Verify all services are running

---

## 🎉 Success Checklist

After deployment, verify:

- [ ] Application accessible at `http://your-ec2-ip`
- [ ] Can register new shop
- [ ] Can login as admin
- [ ] All services running (backend, frontend, nginx, database)
- [ ] Credentials saved securely
- [ ] Logs accessible

---

## 📚 Additional Resources

- **AWS EC2 Documentation**: https://docs.aws.amazon.com/ec2/
- **Ubuntu Server Guide**: https://ubuntu.com/server/docs
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **Nginx Documentation**: https://nginx.org/en/docs/

---

## 🚀 Ready to Deploy?

1. **Read**: `QUICK_START.md`
2. **Deploy**: Run `deploy-from-github.sh`
3. **Access**: Open `http://your-ec2-ip`
4. **Share**: Give URL to client for demo!

---

**Happy Deploying! 🎉**

