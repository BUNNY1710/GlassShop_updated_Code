# Glass Shop Application - Deployment Scripts

This directory contains all deployment scripts and configuration files for deploying the Glass Shop Application on AWS EC2.

## 📁 Files Overview

### Deployment Scripts
- **`aws-quick-deploy.sh`** - Main deployment script (runs on EC2)
- **`setup-env.sh`** - Environment variable configuration
- **`update-application.sh`** - Update application after code changes
- **`backup-database.sh`** - Database backup script
- **`restore-database.sh`** - Database restore script

### Configuration Files
- **`nginx.conf`** - Nginx reverse proxy configuration
- **`glassshop-backend.service`** - Systemd service file for backend
- **`ecosystem.config.js`** - PM2 configuration (optional)

### Documentation
- **`AWS_EC2_DEPLOYMENT_GUIDE.md`** - Complete deployment guide
- **`README.md`** - This file

## 🚀 Quick Start

### 1. Initial Deployment
```bash
# On EC2 instance
cd /opt/glassshop
sudo chmod +x deploy/*.sh
sudo ./deploy/aws-quick-deploy.sh
```

### 2. Configure Environment
```bash
sudo ./deploy/setup-env.sh
```

### 3. Update Application
```bash
sudo ./deploy/update-application.sh
```

### 4. Backup Database
```bash
sudo ./deploy/backup-database.sh
```

## 📖 Detailed Documentation

See `AWS_EC2_DEPLOYMENT_GUIDE.md` for complete step-by-step instructions.

## 🔧 Script Usage

### aws-quick-deploy.sh
Main deployment script that installs all dependencies and sets up the application.

**Usage:**
```bash
sudo ./deploy/aws-quick-deploy.sh
```

**What it does:**
- Installs Java 17, Node.js 18, PostgreSQL, Nginx, Maven
- Sets up database
- Builds backend and frontend
- Configures systemd and PM2 services
- Configures Nginx reverse proxy

### setup-env.sh
Interactive script to configure environment variables.

**Usage:**
```bash
sudo ./deploy/setup-env.sh
```

**What it does:**
- Prompts for database credentials
- Generates JWT secret
- Configures CORS origins
- Sets up email and WhatsApp (optional)
- Updates configuration files

### update-application.sh
Updates the application after code changes.

**Usage:**
```bash
sudo ./deploy/update-application.sh
```

**Options:**
- Update backend only
- Update frontend only
- Update both (full update)

### backup-database.sh
Creates a compressed backup of the database.

**Usage:**
```bash
sudo ./deploy/backup-database.sh
```

**Features:**
- Creates timestamped backup
- Compresses backup (gzip)
- Auto-cleans old backups (keeps 7 days)
- Shows backup size and location

### restore-database.sh
Restores database from a backup file.

**Usage:**
```bash
sudo ./deploy/restore-database.sh
```

**Features:**
- Lists available backups
- Interactive backup selection
- Safety confirmation
- Stops/starts backend service automatically

## 📋 Prerequisites

- AWS EC2 instance (Ubuntu 22.04 or Amazon Linux 2023)
- SSH access to EC2 instance
- Root/sudo access
- Application files uploaded to `/opt/glassshop`

## 🔒 Security Notes

1. **Never commit** `.env` files or `application-prod.properties` with real passwords
2. **Use environment variables** for sensitive data
3. **Restrict SSH access** to your IP only
4. **Use SSL/HTTPS** in production
5. **Regular backups** are essential

## 🆘 Troubleshooting

### Script fails with permission error
```bash
sudo chmod +x deploy/*.sh
```

### Backend won't start
```bash
sudo journalctl -u glassshop-backend -n 50
```

### Frontend won't load
```bash
pm2 logs glassshop-frontend
```

### Database connection issues
```bash
sudo systemctl status postgresql
sudo -u postgres psql -d glassshop -c "SELECT 1;"
```

## 📞 Support

For deployment issues:
1. Check logs first
2. Review `AWS_EC2_DEPLOYMENT_GUIDE.md`
3. Verify all prerequisites are met
4. Check AWS Security Groups

---

**Last Updated:** After responsive design implementation
**Version:** 1.0.0
