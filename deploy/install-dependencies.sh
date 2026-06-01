#!/bin/bash

# EC2 Deployment - Install Dependencies Script
# Run with: sudo ./install-dependencies.sh

set -e

echo "=========================================="
echo "Installing Dependencies for Glass Shop App"
echo "=========================================="

# Update system
echo "Updating system packages..."
apt update && apt upgrade -y

# Install Java 17
echo "Installing Java 17..."
apt install -y openjdk-17-jdk

# Verify Java installation
java -version

# Install Node.js 18
echo "Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verify Node.js installation
node --version
npm --version

# Install PostgreSQL
echo "Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Install Nginx
echo "Installing Nginx..."
apt install -y nginx

# Start and enable Nginx
systemctl start nginx
systemctl enable nginx

# Install PM2 globally
echo "Installing PM2..."
npm install -g pm2

# Install Git
echo "Installing Git..."
apt install -y git

# Install Maven (optional, for building)
echo "Installing Maven..."
apt install -y maven

# Install build tools
echo "Installing build essentials..."
apt install -y build-essential

# Install UFW (Firewall)
echo "Installing UFW firewall..."
apt install -y ufw

echo "=========================================="
echo "Dependencies installed successfully!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Setup PostgreSQL database (see deployment guide)"
echo "2. Configure application properties"
echo "3. Build and deploy application"
echo ""

