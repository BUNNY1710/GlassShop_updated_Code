#!/bin/bash
# Script to build and prepare frontend for S3 upload

echo "🚀 Building Glass Shop Frontend for S3 Deployment"
echo "=================================================="

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "⚠️  Warning: .env.production not found!"
    echo "   Creating it with default backend URL..."
    echo "REACT_APP_API_URL=http://16.16.73.29" > .env.production
    echo "✅ Created .env.production"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build for production
echo "🔨 Building for production..."
npm run build

# Check if build was successful
if [ -d "build" ]; then
    echo "✅ Build successful!"
    echo ""
    echo "📁 Build output is in: $(pwd)/build"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Upload ALL files from 'build/' directory to your S3 bucket"
    echo "   2. Configure S3 static website hosting:"
    echo "      - Index document: index.html"
    echo "      - Error document: error.html"
    echo "   3. Set bucket policy for public read access"
    echo "   4. Test your deployment!"
    echo ""
    echo "💡 To upload using AWS CLI:"
    echo "   aws s3 sync build/ s3://your-bucket-name --delete"
else
    echo "❌ Build failed! Check the errors above."
    exit 1
fi

