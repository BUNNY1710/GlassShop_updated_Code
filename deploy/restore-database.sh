#!/bin/bash

# Database Restore Script
# Restores database from a backup file

set -e

echo "=========================================="
echo "Glass Shop - Database Restore"
echo "=========================================="

# Configuration
BACKUP_DIR="/opt/glassshop/backups"
DB_NAME="glassshop"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run with: sudo ./restore-database.sh"
    exit 1
fi

# List available backups
echo "Available backups:"
echo ""
BACKUPS=($(ls -t "$BACKUP_DIR"/glassshop_*.sql.gz 2>/dev/null))

if [ ${#BACKUPS[@]} -eq 0 ]; then
    echo "No backups found in $BACKUP_DIR"
    exit 1
fi

for i in "${!BACKUPS[@]}"; do
    FILE=$(basename "${BACKUPS[$i]}")
    SIZE=$(du -h "${BACKUPS[$i]}" | cut -f1)
    DATE=$(stat -c %y "${BACKUPS[$i]}" | cut -d' ' -f1)
    echo "  [$i] $FILE ($SIZE) - $DATE"
done

echo ""
read -p "Enter backup number to restore [0]: " BACKUP_NUM
BACKUP_NUM=${BACKUP_NUM:-0}

if [ "$BACKUP_NUM" -ge "${#BACKUPS[@]}" ] || [ "$BACKUP_NUM" -lt 0 ]; then
    echo "Invalid backup number!"
    exit 1
fi

BACKUP_FILE="${BACKUPS[$BACKUP_NUM]}"

echo ""
echo "WARNING: This will replace the current database!"
echo "Database: $DB_NAME"
echo "Backup file: $BACKUP_FILE"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

# Stop backend service
echo ""
echo "Stopping backend service..."
systemctl stop glassshop-backend

# Decompress backup
TEMP_FILE="/tmp/glassshop_restore.sql"
echo "Decompressing backup..."
gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"

# Drop and recreate database
echo "Dropping existing database..."
sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true

echo "Creating new database..."
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || \
sudo -u postgres createdb "$DB_NAME" 2>/dev/null

# Restore backup
echo "Restoring backup (this may take a few minutes)..."
sudo -u postgres psql -d "$DB_NAME" < "$TEMP_FILE" > /dev/null 2>&1

# Cleanup
rm -f "$TEMP_FILE"

# Start backend service
echo "Starting backend service..."
systemctl start glassshop-backend

# Wait for service to start
sleep 5

# Check status
if systemctl is-active --quiet glassshop-backend; then
    echo "✓ Database restored successfully"
    echo "✓ Backend service is running"
else
    echo "✗ Backend service failed to start. Check logs:"
    echo "  sudo journalctl -u glassshop-backend -n 50"
    exit 1
fi

echo ""
echo "=========================================="
echo "Restore Complete!"
echo "=========================================="

