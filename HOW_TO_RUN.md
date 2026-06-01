# How to Run Frontend and Backend

This guide explains how to run both the Node.js backend and React frontend simultaneously.

## Quick Start

### Option 1: Run in Separate Terminals (Recommended for Development)

1. **Start Backend** (Terminal 1):
   ```bash
   cd glassshop-backend
   npm install  # Only needed first time
   npm run dev  # Uses nodemon for auto-reload
   ```
   Backend will run on: `http://localhost:8080`

2. **Start Frontend** (Terminal 2):
   ```bash
   cd glass-ai-agent-frontend
   npm install  # Only needed first time
   npm start
   ```
   Frontend will run on: `http://localhost:3000`

### Option 2: Use npm-run-all (Parallel Execution)

Install `npm-run-all` globally:
```bash
npm install -g npm-run-all
```

Then create a script in the root `package.json` (see below) to run both together.

## Project Structure

```
CodeInNode/
├── glassshop-backend/        # Node.js Backend (Port 8080)
│   ├── server.js
│   ├── routes/
│   ├── models/
│   └── package.json
│
├── glass-ai-agent-frontend/  # React Frontend (Port 3000)
│   ├── src/
│   ├── public/
│   └── package.json
│
└── GlassShop/                # Old Java Spring Boot (can be removed)
```

## Configuration

### Backend Configuration
1. Navigate to `glassshop-backend/`
2. Copy `.env.example` to `.env`
3. Update database credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=glass_shop
   DB_USERNAME=postgres
   DB_PASSWORD=your_password
   
   JWT_SECRET=your_secret_key
   PORT=8080
   CORS_ORIGIN=http://localhost:3000
   ```

### Frontend Configuration
The frontend is already configured to connect to `http://localhost:8080` by default.

If needed, create `.env` in `glass-ai-agent-frontend/`:
```env
REACT_APP_API_URL=http://localhost:8080
```

## Prerequisites

1. **Node.js** (v14 or higher)
2. **PostgreSQL** database running
3. **npm** or **yarn**

## Step-by-Step Instructions

### First Time Setup

1. **Install Backend Dependencies**:
   ```bash
   cd glassshop-backend
   npm install
   ```

2. **Install Frontend Dependencies**:
   ```bash
   cd ../glass-ai-agent-frontend
   npm install
   ```

3. **Setup Database**:
   - Ensure PostgreSQL is running
   - Create database: `glass_shop` (or update in `.env`)
   - The backend will sync models automatically on first run

### Running the Application

#### Method 1: Two Terminals (Recommended)

**Terminal 1 - Backend**:
```bash
cd glassshop-backend
npm run dev
```

You should see:
```
✓ Database connection established successfully.
✓ Database models synchronized.
🚀 Server is running on http://localhost:8080
```

**Terminal 2 - Frontend**:
```bash
cd glass-ai-agent-frontend
npm start
```

You should see:
```
Compiled successfully!
You can now view glass-ai-agent-frontend in the browser.
  Local:            http://localhost:3000
```

#### Method 2: Concurrently (Single Command)

Install concurrently globally:
```bash
npm install -g concurrently
```

Create a `start-all.sh` (Linux/Mac) or `start-all.bat` (Windows):

**Windows (start-all.bat)**:
```batch
@echo off
start "Backend" cmd /k "cd glassshop-backend && npm run dev"
timeout /t 3 /nobreak >nul
start "Frontend" cmd /k "cd glass-ai-agent-frontend && npm start"
```

**Linux/Mac (start-all.sh)**:
```bash
#!/bin/bash
cd glassshop-backend && npm run dev &
cd ../glass-ai-agent-frontend && npm start
```

## Verification

1. **Backend Health Check**:
   Open browser: `http://localhost:8080/health`
   Should return: `{"status":"OK","message":"GlassShop Backend API is running"}`

2. **Frontend**:
   Open browser: `http://localhost:3000`
   Should show the React application

3. **Test Login**:
   - Register a shop (if first time)
   - Login with credentials
   - Verify JWT token is stored in localStorage

## Troubleshooting

### Backend Issues

1. **Database Connection Error**:
   - Check PostgreSQL is running
   - Verify database credentials in `.env`
   - Ensure database `glass_shop` exists

2. **Port 8080 Already in Use**:
   - Change `PORT` in `.env`
   - Update frontend `.env` with new backend URL

### Frontend Issues

1. **Cannot Connect to Backend**:
   - Verify backend is running on port 8080
   - Check CORS configuration in backend
   - Check browser console for errors

2. **API Errors**:
   - Ensure backend is running
   - Check backend logs for errors
   - Verify JWT token in localStorage

## Development Tips

- **Backend auto-reload**: Uses `nodemon`, restarts on file changes
- **Frontend auto-reload**: React dev server auto-reloads on changes
- **Database changes**: Models sync automatically (alter: false for production)
- **Hot reload**: Both frontend and backend support hot reloading

## Production Build

### Build Frontend:
```bash
cd glass-ai-agent-frontend
npm run build
```

### Run Backend in Production:
```bash
cd glassshop-backend
NODE_ENV=production npm start
```

## Ports

- **Backend**: `http://localhost:8080`
- **Frontend**: `http://localhost:3000`
- **Database**: `localhost:5432` (PostgreSQL default)

Make sure these ports are available before starting!
