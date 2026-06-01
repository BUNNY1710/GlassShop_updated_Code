# PostgreSQL Database Setup Guide

## Overview
This application uses PostgreSQL as the primary database with Flyway for schema migrations.

## Database Configuration

### Prerequisites
- PostgreSQL 12+ installed and running
- Database `shop_class` created
- User with appropriate permissions

### Setup Steps

1. **Create Database**
   ```sql
   CREATE DATABASE shop_class;
   ```

2. **Set Environment Variables**
   
   **Option A: Using .env file (recommended for development)**
   - Copy `.env.example` to `.env`
   - Update the values:
     ```
     DB_HOST=localhost
     DB_PORT=5432
     DB_NAME=shop_class
     DB_USERNAME=postgres
     DB_PASSWORD=your_password
     ```

   **Option B: Export environment variables (for production)**
   ```bash
   export DB_HOST=your_host
   export DB_PORT=5432
   export DB_NAME=shop_class
   export DB_USERNAME=your_username
   export DB_PASSWORD=your_password
   ```

3. **Run Application**
   - Flyway will automatically run migrations on startup
   - Tables will be created automatically
   - Check logs to verify successful migration

### Migration Files
- `V1__Create_tables.sql` - Creates all base tables with indexes
- `V2__Add_missing_constraints.sql` - Adds check constraints for data integrity

### Database Schema

#### Tables Created:
1. **shop** - Shop/company information
2. **users** - User accounts with role-based access
3. **glass** - Glass type definitions
4. **stock** - Stock inventory per shop
5. **stock_history** - History for undo operations
6. **audit_log** - Audit trail of all actions
7. **site** - Installation site/client information
8. **installation** - Glass installation records

#### Key Features:
- Proper foreign key relationships
- Indexes on frequently queried columns
- Check constraints for data validation
- Cascade deletes for referential integrity
- Auto-generated timestamps

### Troubleshooting

**Migration fails:**
- Check database connection credentials
- Ensure database exists
- Check Flyway logs in application output

**Connection refused:**
- Verify PostgreSQL is running
- Check host and port settings
- Verify firewall rules

**Permission denied:**
- Ensure user has CREATE TABLE privileges
- Grant necessary permissions:
  ```sql
  GRANT ALL PRIVILEGES ON DATABASE shop_class TO your_username;
  ```

### Manual Migration (if needed)

If you need to run migrations manually:
```bash
# Using Flyway CLI (if installed)
flyway -url=jdbc:postgresql://localhost:5432/shop_class \
       -user=postgres -password=your_password migrate
```

### Verification

After successful setup, verify tables:
```sql
\c shop_class
\dt
```

You should see all 8 tables listed.

