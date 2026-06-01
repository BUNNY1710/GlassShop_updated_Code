# Quick Start Guide - PostgreSQL Setup

## 🔴 Important: Database Password Required

The application needs your PostgreSQL password to connect. You have two options:

### Option 1: Set Environment Variable (Recommended)

**Windows (Command Prompt):**
```cmd
set DB_HOST=localhost
set DB_PORT=5432
set DB_NAME=shop_class
set DB_USERNAME=postgres
set DB_PASSWORD=your_actual_password
```

**Windows (PowerShell):**
```powershell
$env:DB_HOST="localhost"
$env:DB_PORT="5432"
$env:DB_NAME="shop_class"
$env:DB_USERNAME="postgres"
$env:DB_PASSWORD="your_actual_password"
```

**Linux/Mac:**
```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=shop_class
export DB_USERNAME=postgres
export DB_PASSWORD=your_actual_password
```

### Option 2: Edit application.properties Directly

Edit `GlassShop/src/main/resources/application.properties` and update line 6:
```properties
spring.datasource.password=your_actual_password
```

Replace `your_actual_password` with your actual PostgreSQL password.

## Steps to Run

1. **Ensure PostgreSQL is running**
   ```bash
   # Check if PostgreSQL is running
   psql --version
   ```

2. **Create the database** (if not exists)
   ```sql
   psql -U postgres
   CREATE DATABASE shop_class;
   \q
   ```

3. **Set password** (using one of the options above)

4. **Start the application**
   ```bash
   cd GlassShop
   mvn spring-boot:run
   ```

5. **Verify connection**
   - Check logs for "Flyway migration successful"
   - No connection errors should appear

## Troubleshooting

**Still getting password error?**
- Double-check your PostgreSQL password
- Try connecting manually: `psql -U postgres -d shop_class`
- Verify PostgreSQL authentication method allows password login

**Connection refused?**
- Ensure PostgreSQL service is running
- Check if port 5432 is correct
- Verify firewall settings

**Database doesn't exist?**
- Run: `CREATE DATABASE shop_class;` in PostgreSQL

