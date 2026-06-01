#!/bin/bash

# Database Setup Script
# Run with: sudo -u postgres ./setup-database.sh

set -e

echo "=========================================="
echo "Setting up PostgreSQL Database"
echo "=========================================="

# Configuration
DB_NAME="glassshop"
DB_USER="glassshop_user"

# Prompt for password
read -sp "Enter password for database user: " DB_PASSWORD
echo ""

# Create database
echo "Creating database..."
psql -c "CREATE DATABASE $DB_NAME;" || echo "Database may already exist"

# Create user
echo "Creating user..."
psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" || echo "User may already exist"

# Grant privileges
echo "Granting privileges..."
psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;"

# Update pg_hba.conf to allow local connections
echo "Configuring PostgreSQL authentication..."
PG_HBA="/etc/postgresql/*/main/pg_hba.conf"
if [ -f $PG_HBA ]; then
    # Backup
    cp $PG_HBA ${PG_HBA}.backup
    
    # Add local connection (if not exists)
    if ! grep -q "local.*glassshop" $PG_HBA; then
        echo "local   $DB_NAME    $DB_USER    md5" >> $PG_HBA
    fi
    
    # Reload PostgreSQL
    systemctl reload postgresql
fi

echo ""
echo "=========================================="
echo "Database setup completed!"
echo "=========================================="
echo ""
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""
echo "Test connection:"
echo "  psql -U $DB_USER -d $DB_NAME -h localhost"
echo ""

