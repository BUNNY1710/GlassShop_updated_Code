#!/bin/bash

# Deployment Health Check Script
# Checks if all services are running correctly

set -e

echo "=========================================="
echo "Glass Shop - Deployment Health Check"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check functions
check_service() {
    if systemctl is-active --quiet "$1"; then
        echo -e "${GREEN}✓${NC} $1: Running"
        return 0
    else
        echo -e "${RED}✗${NC} $1: Not Running"
        return 1
    fi
}

check_port() {
    if netstat -tuln 2>/dev/null | grep -q ":$1 " || ss -tuln 2>/dev/null | grep -q ":$1 "; then
        echo -e "${GREEN}✓${NC} Port $1: Listening"
        return 0
    else
        echo -e "${RED}✗${NC} Port $1: Not Listening"
        return 1
    fi
}

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $2: Exists"
        return 0
    else
        echo -e "${RED}✗${NC} $2: Missing"
        return 1
    fi
}

check_directory() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $2: Exists"
        return 0
    else
        echo -e "${RED}✗${NC} $2: Missing"
        return 1
    fi
}

# System Services
echo "=== System Services ==="
check_service "postgresql"
check_service "nginx"
check_service "glassshop-backend"
echo ""

# PM2 Services
echo "=== PM2 Services ==="
if pm2 list | grep -q "glassshop-frontend.*online"; then
    echo -e "${GREEN}✓${NC} glassshop-frontend: Running"
else
    echo -e "${RED}✗${NC} glassshop-frontend: Not Running"
fi
echo ""

# Ports
echo "=== Network Ports ==="
check_port 80
check_port 443
check_port 8080
check_port 3000
echo ""

# Application Files
echo "=== Application Files ==="
check_file "/opt/glassshop/GlassShop/target/GlassShop-0.0.1-SNAPSHOT.jar" "Backend JAR"
check_directory "/opt/glassshop/glass-ai-agent-frontend/build" "Frontend Build"
check_file "/opt/glassshop/.env" "Environment File"
check_file "/opt/glassshop/GlassShop/src/main/resources/application-prod.properties" "Backend Config"
echo ""

# Database
echo "=== Database ==="
if sudo -u postgres psql -d glassshop -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Database: Connected"
    
    # Check tables
    TABLE_COUNT=$(sudo -u postgres psql -d glassshop -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
    if [ "$TABLE_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✓${NC} Database Tables: $TABLE_COUNT tables found"
    else
        echo -e "${YELLOW}⚠${NC} Database Tables: No tables found"
    fi
else
    echo -e "${RED}✗${NC} Database: Connection Failed"
fi
echo ""

# API Health Check
echo "=== API Health Check ==="
if curl -s http://localhost:8080/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Backend API: Responding"
else
    echo -e "${RED}✗${NC} Backend API: Not Responding"
fi

if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Frontend: Responding"
else
    echo -e "${RED}✗${NC} Frontend: Not Responding"
fi

if curl -s http://localhost > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Nginx: Responding"
else
    echo -e "${RED}✗${NC} Nginx: Not Responding"
fi
echo ""

# Disk Space
echo "=== Disk Space ==="
df -h / | tail -1 | awk '{print "  Root: " $4 " available (" $5 " used)"}'
df -h /opt | tail -1 | awk '{print "  /opt: " $4 " available (" $5 " used)"}'
echo ""

# Memory
echo "=== Memory ==="
free -h | grep Mem | awk '{print "  Total: " $2 ", Used: " $3 ", Available: " $7}'
echo ""

# Recent Logs (Errors)
echo "=== Recent Errors (Last 5) ==="
if [ -f "/var/log/glassshop/application.log" ]; then
    ERROR_COUNT=$(grep -i "error\|exception" /var/log/glassshop/application.log | tail -5 | wc -l)
    if [ "$ERROR_COUNT" -gt 0 ]; then
        echo -e "${YELLOW}⚠${NC} Found $ERROR_COUNT recent errors in application log"
        echo "  Check: sudo tail -f /var/log/glassshop/application.log"
    else
        echo -e "${GREEN}✓${NC} No recent errors in application log"
    fi
else
    echo -e "${YELLOW}⚠${NC} Application log file not found"
fi

NGINX_ERRORS=$(sudo tail -20 /var/log/nginx/error.log 2>/dev/null | grep -i "error" | wc -l)
if [ "$NGINX_ERRORS" -gt 0 ]; then
    echo -e "${YELLOW}⚠${NC} Found errors in Nginx log"
    echo "  Check: sudo tail -f /var/log/nginx/error.log"
else
    echo -e "${GREEN}✓${NC} No recent errors in Nginx log"
fi
echo ""

# Summary
echo "=========================================="
echo "Health Check Complete"
echo "=========================================="
echo ""
echo "For detailed logs:"
echo "  Backend: sudo journalctl -u glassshop-backend -f"
echo "  Frontend: pm2 logs glassshop-frontend"
echo "  Nginx: sudo tail -f /var/log/nginx/error.log"
echo "  Application: sudo tail -f /var/log/glassshop/application.log"
echo ""

