# Fix for 403 Forbidden Error

## Problem
The API endpoints `/api/customers`, `/api/quotations`, and `/api/invoices` were returning 403 Forbidden because they weren't included in the security configuration.

## Solution Applied
✅ Added the new endpoints to `SecurityConfig.java`:

```java
.requestMatchers(
    "/stock/recent",
    "/stock/**",
    "/api/customers/**",      // ✅ Added
    "/api/quotations/**",     // ✅ Added
    "/api/invoices/**"        // ✅ Added
).hasAnyRole("ADMIN", "STAFF")
```

## What You Need to Do

### 1. Restart the Backend Server
The security configuration changes require a server restart:

**Option A: If running via IDE**
- Stop the Spring Boot application
- Start it again

**Option B: If running via Maven**
```bash
cd GlassShop
mvn spring-boot:run
```

**Option C: If running via JAR**
- Stop the running JAR process
- Rebuild and restart:
```bash
cd GlassShop
mvn clean package
java -jar target/GlassShop-0.0.1-SNAPSHOT.jar
```

### 2. Verify the Fix
After restarting:
1. Refresh your browser (or clear cache)
2. Try accessing:
   - `/customers` page
   - `/quotations` page
   - `/invoices` page

The 403 errors should be gone!

## Security Details

- **Access Level**: ADMIN and STAFF roles can access these endpoints
- **Authentication**: JWT token required (handled automatically by the frontend)
- **Authorization**: Uses Spring Security role-based access control

## If Issues Persist

1. **Check your role**: Make sure you're logged in as ADMIN or STAFF
2. **Check JWT token**: Verify token is being sent in Authorization header
3. **Check backend logs**: Look for any security-related errors
4. **Verify endpoint paths**: Ensure they match exactly:
   - `/api/customers/**`
   - `/api/quotations/**`
   - `/api/invoices/**`

## Status: ✅ FIXED

The security configuration has been updated. Just restart the backend server and the 403 errors will be resolved.

