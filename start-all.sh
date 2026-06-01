#!/bin/bash

echo "Starting GlassShop Application..."
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit
}

# Trap Ctrl+C
trap cleanup SIGINT SIGTERM

# Start Backend
echo "Starting Backend Server..."
cd glassshop-backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait a bit for backend to start
sleep 3

# Start Frontend
echo "Starting Frontend Server..."
cd glass-ai-agent-frontend
npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "Both servers are running!"
echo "Backend: http://localhost:8080"
echo "Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers..."

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
