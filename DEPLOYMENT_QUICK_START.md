# 🚀 Quick Start - AWS EC2 Deployment

## Prerequisites Checklist
- [ ] AWS EC2 instance running (Ubuntu 22.04 or Amazon Linux 2023)
- [ ] Security Group configured (ports 22, 80, 443)
- [ ] SSH access to EC2 instance
- [ ] Application files ready

## Step 1: Upload Application to EC2

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

## Step 2: Run Deployment Script

```bash
# On EC2 instance
cd /opt/glassshop
sudo chmod +x deploy/*.sh
sudo ./deploy/aws-quick-deploy.sh
```

**The script will:**
- Install all dependencies (Java, Node.js, PostgreSQL, Nginx)
- Setup database
- Build backend and frontend
- Configure services
- Setup Nginx reverse proxy

**When prompted:**
- Enter database password for `glassshop_user`

## Step 3: Configure Environment

```bash
sudo ./deploy/setup-env.sh
```

**You'll be asked for:**
- Database credentials
- JWT secret (or generate new)
- CORS origins
- Email settings (optional)
- WhatsApp settings (optional)

## Step 4: Rebuild and Restart

After environment setup:

```bash
# Rebuild backend
cd /opt/glassshop/GlassShop
./mvnw clean package -DskipTests
sudo systemctl restart glassshop-backend

# Rebuild frontend
cd /opt/glassshop/glass-ai-agent-frontend
npm run build
pm2 restart glassshop-frontend
```

## Step 5: Verify Deployment

```bash
# Check service status
sudo systemctl status glassshop-backend
pm2 status
sudo systemctl status nginx

# Test backend
curl http://localhost:8080/api/health

# Test frontend
curl http://localhost
```

## Step 6: Access Application

Open in browser:
- `http://your-ec2-ip`
- Or `https://your-domain.com` (if SSL configured)

## Common Commands

### View Logs
```bash
# Backend logs
sudo journalctl -u glassshop-backend -f

# Frontend logs
pm2 logs glassshop-frontend

# Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Update Application
```bash
sudo ./deploy/update-application.sh
```

### Backup Database
```bash
sudo ./deploy/backup-database.sh
```

### Restart Services
```bash
sudo systemctl restart glassshop-backend
pm2 restart glassshop-frontend
sudo systemctl restart nginx
```

## Troubleshooting

### Backend won't start
```bash
sudo journalctl -u glassshop-backend -n 50
```

### Frontend won't load
```bash
pm2 logs glassshop-frontend
ls -la /opt/glassshop/glass-ai-agent-frontend/build
```

### Database connection error
```bash
sudo systemctl status postgresql
sudo -u postgres psql -d glassshop -c "SELECT 1;"
```

## Next Steps

1. **Configure Domain** (Optional)
   - Point domain to EC2 IP
   - Setup SSL with Let's Encrypt

2. **Schedule Backups**
   ```bash
   sudo crontab -e
   # Add: 0 2 * * * /opt/glassshop/deploy/backup-database.sh
   ```

3. **Setup Monitoring** (Optional)
   - AWS CloudWatch
   - Application monitoring tools

## Full Documentation

For detailed instructions, see:
- `deploy/AWS_EC2_DEPLOYMENT_GUIDE.md` - Complete deployment guide
- `deploy/README.md` - Script documentation

---

**Ready to deploy! 🎉**

