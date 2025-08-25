#!/bin/bash

echo "🚀 Starting LookMatch Development Environment..."

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "✅ Port $1 is already in use"
        return 0
    else
        echo "❌ Port $1 is not in use"
        return 1
    fi
}

# Function to start frontend
start_frontend() {
    echo "📱 Starting Frontend (Next.js) on port 3000..."
    cd web
    npm run dev &
    FRONTEND_PID=$!
    echo "Frontend started with PID: $FRONTEND_PID"
    cd ..
}

# Function to start backend
start_backend() {
    echo "🔧 Starting Backend (Node.js) on port 4000..."
    cd api
    npm start &
    BACKEND_PID=$!
    echo "Backend started with PID: $BACKEND_PID"
    cd ..
}

# Check if ports are available
echo "🔍 Checking port availability..."

if check_port 3000; then
    echo "Frontend already running on port 3000"
else
    start_frontend
fi

if check_port 4000; then
    echo "Backend already running on port 4000"
else
    start_backend
fi

# Wait a moment for servers to start
echo "⏳ Waiting for servers to start..."
sleep 5

# Check final status
echo ""
echo "🎯 Final Status:"
echo "=================="

if check_port 3000; then
    echo "✅ Frontend: http://localhost:3000"
else
    echo "❌ Frontend failed to start"
fi

if check_port 4000; then
    echo "✅ Backend: http://localhost:4000"
else
    echo "❌ Backend failed to start"
fi

echo ""
echo "🌐 Open http://localhost:3000 in your browser"
echo "📱 Test the mobile responsiveness and color detection!"
echo ""
echo "To stop servers, press Ctrl+C or run: pkill -f 'npm run dev' && pkill -f 'npm start'"
