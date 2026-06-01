# Amazon Linux Deployment Fix

## Issue
The deployment script was using `apt` which is for Ubuntu/Debian. Amazon Linux uses `yum` or `dnf`.

## Solution
The script has been updated to automatically detect your OS and use the correct package manager.

## What Changed
- ✅ Auto-detects OS (Ubuntu/Debian vs Amazon Linux)
- ✅ Uses `apt` for Ubuntu/Debian
- ✅ Uses `yum`/`dnf` for Amazon Linux
- ✅ Installs correct Java package for each OS
- ✅ Configures PostgreSQL correctly for each OS
- ✅ Sets up Nginx correctly for each OS

## Run Again

Simply run the script again:

```bash
cd /opt/glassshop
sudo ./deploy/aws-quick-deploy.sh
```

The script will now:
1. Detect you're on Amazon Linux
2. Use `yum` instead of `apt`
3. Install the correct packages for Amazon Linux
4. Complete the deployment successfully

## Manual Fix (If Needed)

If you still have issues, you can manually install dependencies:

```bash
# Update system
sudo yum update -y

# Install Java 17
sudo yum install -y java-17-amazon-corretto-devel

# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install PostgreSQL
sudo yum install -y postgresql15 postgresql15-server
sudo /usr/bin/postgresql-setup --initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Install Nginx
sudo yum install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Install Maven
sudo yum install -y maven

# Install PM2 and serve
sudo npm install -g pm2 serve
```

Then run the deployment script again.

