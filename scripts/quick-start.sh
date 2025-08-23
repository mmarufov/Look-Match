#!/bin/bash

echo "🚀 LookMatch Quick Start Script"
echo "================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install API dependencies
echo "📦 Installing API dependencies..."
cd api
npm install
cd ..

# Install Web dependencies
echo "📦 Installing Web dependencies..."
cd web
npm install
cd ..

# Check if .env.local exists
if [ ! -f "web/.env.local" ]; then
    echo "🔧 Creating .env.local file..."
    echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > web/.env.local
    echo "✅ Created web/.env.local"
else
    echo "✅ .env.local already exists"
fi

# Check if Google credentials exist
if [ ! -f "api/google-credentials.json" ]; then
    echo "⚠️  Warning: google-credentials.json not found in api/ folder"
    echo "   Please add your Google Cloud credentials to continue"
else
    echo "✅ Google credentials found"
fi

echo ""
echo "🎉 Setup complete! You can now start development:"
echo ""
echo "  # Start both servers:"
echo "  npm run dev"
echo ""
echo "  # Or start separately:"
echo "  npm run dev:api    # Backend on port 4000"
echo "  npm run dev:web    # Frontend on port 3000"
echo ""
echo "📚 For more info, see docs/DEVELOPMENT.md"
