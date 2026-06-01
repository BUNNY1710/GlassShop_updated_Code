# EC2 Deployment Checklist

Use this checklist to ensure a successful deployment.

## Pre-Deployment

- [ ] EC2 instance created and running
- [ ] Security groups configured (ports 22, 80, 443, 8080)
- [ ] SSH key pair available
- [ ] Domain name configured (optional but recommended)
- [ ] Application code ready (or repository URL)

## Step 1: Initial Server Setup

- [ ] Connected to EC2 via SSH
- [ ] System updated (`sudo apt update && sudo apt upgrade`)
- [ ] Dependencies installed (`sudo ./deploy/install-dependencies.sh`)
- [ ] Java 17 verified (`java -version`)
- [ ] Node.js 18+ verified (`node --version`)
- [ ] PostgreSQL installed and running (`sudo systemctl status postgresql`)

## Step 2: Database Setup

- [ ] Database created (`glassshop`)
- [ ] Database user created (`glassshop_user`)
- [ ] Password set and secured
- [ ] Permissions granted
- [ ] Connection tested (`psql -U glassshop_user -d glassshop`)

## Step 3: Application Configuration

- [ ] Application files uploaded/cloned to `/opt/glassshop`
- [ ] `application-prod.properties` created with correct values:
  - [ ] Database URL
  - [ ] Database username
  - [ ] Database password
  - [ ] JWT secret (strong random value)
  - [ ] CORS origins
- [ ] Frontend `.env.production` created with API URL

## Step 4: Build Application

- [ ] Backend built successfully (`mvn clean package`)
- [ ] JAR file exists (`target/GlassShop-0.0.1-SNAPSHOT.jar`)
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Frontend built successfully (`npm run build`)
- [ ] Build folder exists

## Step 5: Service Configuration

- [ ] Systemd service file copied (`glassshop-backend.service`)
- [ ] Service enabled (`sudo systemctl enable glassshop-backend`)
- [ ] Service started (`sudo systemctl start glassshop-backend`)
- [ ] Service status checked (`sudo systemctl status glassshop-backend`)
- [ ] PM2 configured for frontend
- [ ] PM2 process started (`pm2 start`)
- [ ] PM2 saved (`pm2 save`)

## Step 6: Nginx Configuration

- [ ] Nginx config file updated with domain/IP
- [ ] Config file copied to `/etc/nginx/sites-available/`
- [ ] Symlink created in `/etc/nginx/sites-enabled/`
- [ ] Default site removed/disabled
- [ ] Nginx config tested (`sudo nginx -t`)
- [ ] Nginx restarted (`sudo systemctl restart nginx`)

## Step 7: Security

- [ ] Firewall configured (UFW)
- [ ] Only necessary ports open (22, 80, 443)
- [ ] JWT secret changed from default
- [ ] Database password strong and secure
- [ ] SSH key authentication enabled
- [ ] Password authentication disabled (optional)
- [ ] SSL certificate installed (if using domain)

## Step 8: Verification

- [ ] Backend health check (`curl http://localhost:8080/ai/ping`)
- [ ] Frontend accessible (`curl http://localhost`)
- [ ] API endpoints accessible through Nginx
- [ ] Login functionality works
- [ ] Database connection working
- [ ] Logs checked (no errors)

## Step 9: Monitoring

- [ ] Log locations known:
  - [ ] Backend: `sudo journalctl -u glassshop-backend`
  - [ ] Frontend: `pm2 logs`
  - [ ] Nginx: `/var/log/nginx/`
- [ ] Monitoring setup (optional)
- [ ] Backup strategy planned

## Post-Deployment

- [ ] Application tested end-to-end
- [ ] Performance acceptable
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Team notified

## Troubleshooting Reference

### Backend not starting
```bash
sudo journalctl -u glassshop-backend -n 50
java -version
sudo netstat -tulpn | grep 8080
```

### Frontend not loading
```bash
pm2 status
pm2 logs glassshop-frontend
pm2 restart all
```

### Database connection issues
```bash
sudo systemctl status postgresql
psql -U glassshop_user -d glassshop -h localhost
```

### Nginx issues
```bash
sudo systemctl status nginx
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

## Quick Commands Reference

```bash
# Restart all services
sudo systemctl restart glassshop-backend
pm2 restart all
sudo systemctl restart nginx

# Check status
sudo systemctl status glassshop-backend
pm2 status
sudo systemctl status nginx

# View logs
sudo journalctl -u glassshop-backend -f
pm2 logs glassshop-frontend
sudo tail -f /var/log/nginx/error.log

# Quick update
cd /opt/glassshop
git pull
./deploy/quick-deploy.sh
```

