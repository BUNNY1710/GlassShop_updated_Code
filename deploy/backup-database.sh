#!/bin/bash

# Database Backup Script
# Creates compressed SQL dump of the database

set -e

echo "=========================================="
echo "Glass Shop - Database Backup"
echo "=========================================="

# Configuration
BACKUP_DIR="/opt/glassshop/backups"
DB_NAME="glassshop"
DB_USER="glassshop_user"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/glassshop_$DATE.sql"
BACKUP_FILE_GZ="$BACKUP_FILE.gz"
RETENTION_DAYS=7

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run with: sudo ./backup-database.sh"
    exit 1
fi

echo "Creating backup..."
echo "Database: $DB_NAME"
echo "Backup file: $BACKUP_FILE_GZ"
echo ""

# Create backup
sudo -u postgres pg_dump -U postgres -d "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null || \
sudo -u postgres pg_dump "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null

if [ ! -f "$BACKUP_FILE" ] || [ ! -s "$BACKUP_FILE" ]; then
    echo "ERROR: Backup failed!"
    exit 1
fi

# Compress backup
gzip "$BACKUP_FILE"

# Get file size
FILE_SIZE=$(du -h "$BACKUP_FILE_GZ" | cut -f1)

echo "✓ Backup created successfully"
echo "  File: $BACKUP_FILE_GZ"
echo "  Size: $FILE_SIZE"
echo ""

# Cleanup old backups
echo "Cleaning up old backups (keeping last $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "glassshop_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

REMAINING=$(find "$BACKUP_DIR" -name "glassshop_*.sql.gz" -type f | wc -l)
echo "✓ Cleanup complete. $REMAINING backup(s) remaining"
echo ""

# List recent backups
echo "Recent backups:"
ls -lh "$BACKUP_DIR"/glassshop_*.sql.gz 2>/dev/null | tail -5 | awk '{print "  " $9 " (" $5 ")"}'
echo ""

echo "=========================================="
echo "Backup Complete!"
echo "=========================================="

