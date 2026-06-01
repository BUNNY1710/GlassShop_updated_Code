#!/bin/bash

# Script to push code to a new Git repository
# Usage: ./push-to-new-repo.sh <new-repo-url>

if [ -z "$1" ]; then
    echo "Usage: ./push-to-new-repo.sh <new-repo-url>"
    echo "Example: ./push-to-new-repo.sh https://github.com/username/new-repo.git"
    exit 1
fi

NEW_REPO_URL=$1

echo "=========================================="
echo "Pushing to New Repository"
echo "=========================================="
echo ""

# Step 1: Remove old remote
echo "Step 1: Removing old remote..."
git remote remove origin 2>/dev/null || echo "No existing origin remote"

# Step 2: Add new remote
echo "Step 2: Adding new remote..."
git remote add origin "$NEW_REPO_URL"

# Step 3: Verify remote
echo "Step 3: Verifying remote..."
git remote -v

# Step 4: Push to new repository
echo ""
echo "Step 4: Pushing to new repository..."
echo "This will push all commits to: $NEW_REPO_URL"
read -p "Continue? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push -u origin master
    echo ""
    echo "✅ Successfully pushed to new repository!"
else
    echo "❌ Push cancelled"
    exit 1
fi

