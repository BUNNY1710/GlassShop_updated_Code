# Deploy to EC2 - Quick Start Guide

## Step-by-Step Instructions

### Step 1: Connect to Your EC2 Instance

```bash
# On your local machine
ssh -i your-key.pem ubuntu@your-ec2-ip-address
```

### Step 2: Upload Application Files

**Option A: Using Git (Recommended)**
```bash
cd /opt
sudo git clone <your-repository-url> glassshop
cd glassshop
```

**Option B: Using SCP (from your local machine)**
```bash
# From your local machine
scp -i your-key.pem -r "D:\Git pull\GlassShopApplication-master" ubuntu@your-ec2-ip:/opt/glassshop
```

**Option C: Using AWS Console**
- Upload files via AWS Systems Manager Session Manager
- Or use FileZilla/WinSCP

### Step 3: Run Deployment Script

Once files are on EC2:

```bash
cd /opt/glassshop
sudo chmod +x deploy/remote-deploy.sh
sudo ./deploy/remote-deploy.sh
```

The script will:
- ✅ Install all dependencies (Java, Node.js, PostgreSQL, Nginx, PM2)
- ✅ Setup database
- ✅ Build backend and frontend
- ✅ Configure services
- ✅ Start everything

### Step 4: Test Deployment

```bash
# Get your EC2 IP
curl ifconfig.me

# Test backend
curl http://localhost:8080/ai/ping

# Test frontend (in browser)
# Open: http://your-ec2-ip
```

## What the Script Does

1. **Installs Dependencies**
   - Java 17
   - Node.js 18
   - PostgreSQL
   - Nginx
   - PM2
   - Maven

2. **Sets Up Database**
   - Creates `glassshop` database
   - Creates `glassshop_user` with password you provide
   - Grants necessary permissions

3. **Builds Application**
   - Backend: Maven build with production profile
   - Frontend: npm build

4. **Configures Services**
   - Systemd service for backend
   - PM2 for frontend
   - Nginx reverse proxy

5. **Starts Everything**
   - All services auto-start
   - Firewall configured

## Manual Configuration (If Needed)

### Update CORS Origins

If you have a domain name, edit:
```bash
sudo nano /opt/glassshop/GlassShop/src/main/resources/application-prod.properties
```

Update:
```properties
spring.web.cors.allowed-origins=http://your-domain.com,http://your-ec2-ip
```

Then restart:
```bash
sudo systemctl restart glassshop-backend
```

### Update Frontend API URL

If using a domain:
```bash
sudo nano /opt/glassshop/glass-ai-agent-frontend/.env.production
```

Update:
```env
REACT_APP_API_URL=http://your-domain.com
```

Then rebuild:
```bash
cd /opt/glassshop/glass-ai-agent-frontend
npm run build
pm2 restart glassshop-frontend
```

## Troubleshooting

### Backend Not Starting
```bash
# Check logs
sudo journalctl -u glassshop-backend -n 50

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
```

### Database Connection Issues
```bash
# Check PostgreSQL
sudo systemctl status postgresql

# Test connection
psql -U glassshop_user -d glassshop -h localhost
```

### Nginx Issues
```bash
# Test configuration
sudo nginx -t

# Check logs
sudo tail -f /var/log/nginx/error.log

# Restart
sudo systemctl restart nginx
```

## Security Checklist

After deployment:

- [ ] Change default database password (if used default)
- [ ] Update JWT secret in application-prod.properties
- [ ] Configure SSL certificate (if using domain)
- [ ] Review security groups (only open necessary ports)
- [ ] Setup regular backups

## Quick Commands

```bash
# Restart all services
sudo systemctl restart glassshop-backend
pm2 restart all
sudo systemctl restart nginx

# View logs
sudo journalctl -u glassshop-backend -f
pm2 logs glassshop-frontend
sudo tail -f /var/log/nginx/error.log

# Check status
sudo systemctl status glassshop-backend
pm2 status
sudo systemctl status nginx
```

## Need Help?

If you encounter issues:
1. Check the logs (commands above)
2. Verify all services are running
3. Check firewall rules
4. Verify security groups in AWS console

