@echo off
echo Starting GlassShop Application...
echo.
echo Starting Backend Server...
start "GlassShop Backend" cmd /k "cd glassshop-backend && npm run dev"
timeout /t 3 /nobreak >nul
echo.
echo Starting Frontend Server...
start "GlassShop Frontend" cmd /k "cd glass-ai-agent-frontend && npm start"
echo.
echo Both servers are starting...
echo Backend: http://localhost:8080
echo Frontend: http://localhost:3000
echo.
echo Close the terminal windows to stop the servers.
pause
