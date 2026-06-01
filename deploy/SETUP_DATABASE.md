# Database Setup Guide for EC2

## Quick Setup

### Step 1: Connect to PostgreSQL

```bash
# On EC2 instance
sudo -u postgres psql
```

### Step 2: Create Database and User

```sql
-- Create database
CREATE DATABASE glassshop;

-- Create user
CREATE USER glassshop_user WITH PASSWORD 'your_secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE glassshop TO glassshop_user;
ALTER USER glassshop_user CREATEDB;

-- Connect to the database
\c glassshop

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO glassshop_user;
```

### Step 3: Run the SQL Script

```bash
# Option 1: From command line
sudo -u postgres psql -d glassshop -f /opt/glassshop/deploy/create-all-tables.sql

# Option 2: From psql prompt
\i /opt/glassshop/deploy/create-all-tables.sql

# Option 3: Copy and paste the SQL content
# Open create-all-tables.sql and copy all content, then paste in psql
```

### Step 4: Verify Tables Created

```sql
-- List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Count tables (should be 14)
SELECT COUNT(*) as total_tables 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check specific table structure
\d customers
\d quotations
\d invoices
```

## Expected Tables (14 total)

1. ✅ **shop** - Shop/company information
2. ✅ **users** - User accounts
3. ✅ **glass** - Glass type definitions
4. ✅ **stock** - Stock inventory (includes hsn_no)
5. ✅ **stock_history** - Stock change history
6. ✅ **audit_log** - Audit trail
7. ✅ **site** - Installation sites
8. ✅ **installation** - Glass installations
9. ✅ **customers** - Customer information
10. ✅ **quotations** - Quotations (includes transportation_required)
11. ✅ **quotation_items** - Quotation items (includes height_unit, width_unit, design)
12. ✅ **invoices** - Invoices
13. ✅ **invoice_items** - Invoice items
14. ✅ **payments** - Payment records

## Troubleshooting

### Permission Denied
```bash
# Make sure you're using the postgres user
sudo -u postgres psql -d glassshop -f create-all-tables.sql
```

### Table Already Exists
```sql
-- Drop all tables if needed (CAREFUL - deletes all data!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO glassshop_user;
```

### Foreign Key Errors
- Make sure tables are created in the correct order
- The script handles this automatically

## Next Steps

After creating tables:
1. Update `application-prod.properties` with database credentials
2. Start the Spring Boot application
3. Flyway will validate the schema matches

---

**File**: `deploy/create-all-tables.sql`  
**Total Tables**: 14  
**All Migrations Included**: V1 through V6


