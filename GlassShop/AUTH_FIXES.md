# Authentication & Registration Fixes

## Issues Fixed

### 1. Duplicate Username Error (403/500)
**Problem**: When registering a shop with a username that already exists (e.g., "om"), the application threw a `DataIntegrityViolationException` instead of returning a user-friendly error message.

**Solution**: 
- Added username existence check before attempting to create user
- Added proper exception handling with try-catch blocks
- Returns HTTP 409 (Conflict) with clear error message: "Username already exists. Please choose a different username."

### 2. Login 401 Errors
**Problem**: Login endpoint was throwing `RuntimeException` when user not found, causing unclear error responses.

**Solution**:
- Replaced `orElseThrow()` with `Optional` check
- Returns HTTP 401 with message: "Invalid username or password" (for security, doesn't reveal if username exists)
- Added input validation for username and password
- Improved error handling

### 3. Registration Validation
**Problem**: No validation for required fields in shop registration.

**Solution**:
- Added validation for username, password, and shop name
- Returns HTTP 400 (Bad Request) with specific error messages for missing fields

## Changes Made

### `AuthController.java`

#### `registerShop()` Method
- ✅ Added username existence check
- ✅ Added input validation (username, password, shop name)
- ✅ Added try-catch for `DataIntegrityViolationException`
- ✅ Returns proper HTTP status codes (409 for conflict, 400 for bad request)

#### `login()` Method
- ✅ Replaced exception throwing with Optional check
- ✅ Added input validation
- ✅ Improved error messages
- ✅ Better exception handling

## Testing

### Test Registration with Existing Username
```bash
POST /auth/register-shop
{
  "username": "om",
  "password": "password123",
  "shopName": "Test Shop",
  "email": "test@example.com"
}

Expected Response: 409 Conflict
{
  "Username already exists. Please choose a different username."
}
```

### Test Login with Invalid Credentials
```bash
POST /auth/login
{
  "username": "nonexistent",
  "password": "wrongpassword"
}

Expected Response: 401 Unauthorized
{
  "Invalid username or password"
}
```

### Test Registration with Missing Fields
```bash
POST /auth/register-shop
{
  "username": "",
  "password": "password123",
  "shopName": "Test Shop"
}

Expected Response: 400 Bad Request
{
  "Username is required"
}
```

## Next Steps

1. **Restart Backend**: After these changes, restart the Spring Boot application
2. **Clear Browser Cache**: Clear browser cache/cookies if still seeing old errors
3. **Test Registration**: Try registering with a new username
4. **Test Login**: Use existing credentials to verify login works

## Database Cleanup (Optional)

If you need to remove the duplicate user "om":

```sql
-- Connect to database
psql -U glassshop_user -d glassshop

-- Find the user
SELECT id, user_name, role, shop_id FROM users WHERE user_name = 'om';

-- Delete the user (if needed)
DELETE FROM users WHERE user_name = 'om';

-- Or delete the entire shop and its users
DELETE FROM shop WHERE id = <shop_id>;
-- (This will cascade delete users due to ON DELETE CASCADE)
```

---

**Status**: ✅ Fixed  
**Date**: 2026-01-19  
**Files Modified**: `AuthController.java`

