#!/bin/bash
# ============================================
# Fresh PostgreSQL Setup Script for Linux/Mac
# ============================================

echo "Connecting to PostgreSQL to reset Flyway history..."
echo

# Connect to PostgreSQL and drop Flyway history table
psql -U postgres -d glass_shop -c "DROP TABLE IF EXISTS flyway_schema_history CASCADE;"

if [ $? -eq 0 ]; then
    echo
    echo "✓ Flyway history cleared successfully!"
    echo
    echo "Starting Spring Boot application..."
    echo
    cd GlassShop
    mvn spring-boot:run
else
    echo
    echo "✗ Error connecting to database. Please check:"
    echo "  1. PostgreSQL is running"
    echo "  2. Database 'glass_shop' exists"
    echo "  3. Password is correct"
    echo
    echo "Or run manually:"
    echo "  psql -U postgres -d glass_shop"
    echo "  DROP TABLE IF EXISTS flyway_schema_history CASCADE;"
    echo "  \\q"
    echo "  Then start the application normally"
fi

