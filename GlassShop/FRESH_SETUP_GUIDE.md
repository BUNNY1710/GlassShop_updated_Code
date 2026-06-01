# Fresh PostgreSQL Setup Guide

Since this is a fresh PostgreSQL integration, follow these steps:

## Option 1: Quick Reset (Recommended)

1. **Connect to your database:**
   ```bash
   psql -U postgres -d glass_shop
   ```

2. **Clear Flyway history:**
   ```sql
   DROP TABLE IF EXISTS flyway_schema_history CASCADE;
   ```

3. **Or reset everything (if no important data):**
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   GRANT ALL ON SCHEMA public TO postgres;
   GRANT ALL ON SCHEMA public TO public;
   ```

4. **Exit psql:**
   ```sql
   \q
   ```

5. **Start your Spring Boot application:**
   ```bash
   cd GlassShop
   mvn spring-boot:run
   ```

   Flyway will now create a fresh schema history and run all migrations.

## Option 2: Let Application Handle It

The application is now configured with:
- `validate-on-migrate=false` - Skips validation for first run
- Flyway will repair any checksum issues automatically

Just start the application, and after it runs successfully once, you can re-enable validation.

## After First Successful Run

1. **Re-enable validation** in `application.properties`:
   ```properties
   spring.flyway.validate-on-migrate=true
   ```

2. This ensures migrations are validated in future runs.

## Verification

After successful startup, verify tables were created:
```sql
psql -U postgres -d glass_shop
\dt
```

You should see all 8 tables:
- shop
- users
- glass
- stock
- stock_history
- audit_log
- site
- installation

