@echo off
REM ============================================
REM Fresh PostgreSQL Setup Script for Windows
REM ============================================

echo Connecting to PostgreSQL to reset Flyway history...
echo.

REM Connect to PostgreSQL and drop Flyway history table
psql -U postgres -d glass_shop -c "DROP TABLE IF EXISTS flyway_schema_history CASCADE;"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ Flyway history cleared successfully!
    echo.
    echo Starting Spring Boot application...
    echo.
    cd GlassShop
    mvn spring-boot:run
) else (
    echo.
    echo ✗ Error connecting to database. Please check:
    echo   1. PostgreSQL is running
    echo   2. Database 'glass_shop' exists
    echo   3. Password is correct
    echo.
    echo Or run manually:
    echo   psql -U postgres -d glass_shop
    echo   DROP TABLE IF EXISTS flyway_schema_history CASCADE;
    echo   \q
    echo   Then start the application normally
)

