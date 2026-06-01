#!/bin/bash

# ONE-COMMAND DEPLOYMENT SCRIPT
# This script does EVERYTHING - just run it!

set -e

echo "=========================================="
echo "Glass Shop - ONE-COMMAND DEPLOYMENT"
echo "=========================================="
echo ""
echo "This script will:"
echo "  1. Install all dependencies"
echo "  2. Setup database"
echo "  3. Clone from GitHub"
echo "  4. Build and deploy application"
echo ""
echo "It will take 15-20 minutes. Grab a coffee! ☕"
echo ""

# Get GitHub repo URL
read -p "Enter your GitHub repository URL: " GITHUB_REPO
if [ -z "$GITHUB_REPO" ]; then
    echo "ERROR: Repository URL is required!"
    exit 1
fi

read -p "Enter branch [master]: " BRANCH
BRANCH=${BRANCH:-master}

echo ""
echo "Starting deployment..."
echo "Repository: $GITHUB_REPO"
echo "Branch: $BRANCH"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Running with sudo..."
    exec sudo bash "$0" "$GITHUB_REPO" "$BRANCH"
    exit 0
fi

# Save repo and branch
export GITHUB_REPO
export BRANCH

# Download and run full deployment script
TEMP_DIR="/tmp/glassshop-deploy"
mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR"

# Download deployment script from GitHub if possible, or use inline
if command -v curl &> /dev/null; then
    echo "Downloading deployment script..."
    # Try to get the script from the repo
    SCRIPT_URL="https://raw.githubusercontent.com/$(echo $GITHUB_REPO | sed 's|https://github.com/||' | sed 's|\.git||')/master/deploy/deploy-from-github.sh"
    curl -fsSL "$SCRIPT_URL" -o deploy-from-github.sh 2>/dev/null || true
fi

# If script doesn't exist, we'll clone the repo first
if [ ! -f "deploy-from-github.sh" ]; then
    echo "Cloning repository to get deployment script..."
    git clone -b "$BRANCH" "$GITHUB_REPO" repo-temp 2>/dev/null || {
        echo "ERROR: Could not clone repository!"
        echo "Please make sure:"
        echo "  1. Repository URL is correct"
        echo "  2. Repository is public OR you have SSH keys configured"
        echo "  3. Branch '$BRANCH' exists"
        exit 1
    }
    
    if [ -f "repo-temp/deploy/deploy-from-github.sh" ]; then
        cp repo-temp/deploy/deploy-from-github.sh .
        chmod +x deploy-from-github.sh
    else
        echo "ERROR: Deployment script not found in repository!"
        exit 1
    fi
fi

# Run the deployment script
echo "Running deployment script..."
bash deploy-from-github.sh <<EOF
$GITHUB_REPO
$BRANCH
EOF

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="

