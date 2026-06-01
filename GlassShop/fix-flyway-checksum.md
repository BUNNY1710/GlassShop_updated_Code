# Fix Flyway Checksum Mismatch

## Problem
The migration file V1__Create_tables.sql was modified after it was already applied to the database. Flyway detects this and fails validation.

## Solution Options

### Option 1: Run Flyway Repair (Recommended)
This updates the checksum in the database to match the current file.

Add this to `application.properties` temporarily:
```properties
spring.flyway.repair-on-migrate=true
```

Then run the application once. After it succeeds, remove this line.

### Option 2: Manual SQL Fix
Connect to your database and run:
```sql
UPDATE flyway_schema_history 
SET checksum = 741589469 
WHERE version = '1';
```

### Option 3: Reset and Recreate (Development Only)
If you're okay losing data:

```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

Then restart the application to rerun all migrations.

