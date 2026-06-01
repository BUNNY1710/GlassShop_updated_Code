# ⚠️ IMPORTANT: Restart Required for Invoice Endpoints

## Problem
You're getting 404 errors because the Spring Boot application is still running the **old code** without the new invoice endpoints.

## Solution: Restart Spring Boot Application

### Step 1: Stop Current Application
**If running in IDE (IntelliJ/Eclipse/VS Code):**
- Click the **Stop** button (red square icon)
- Or right-click the running process → **Terminate**

**If running in Terminal:**
- Press `Ctrl + C` to stop the process

### Step 2: Clean and Rebuild
**Option A: Using Maven Command Line**
```bash
cd GlassShop
mvn clean install -DskipTests
mvn spring-boot:run
```

**Option B: Using IDE**
1. **IntelliJ IDEA:**
   - `Build` → `Rebuild Project` (or `Ctrl + Shift + F9`)
   - Then run the application again

2. **Eclipse:**
   - `Project` → `Clean...`
   - Select your project
   - Click `Clean`
   - Then run the application again

3. **VS Code:**
   - Open terminal in VS Code
   - Run: `cd GlassShop && mvn clean install -DskipTests`
   - Then start the application

### Step 3: Verify Endpoints Are Registered
After restart, check the application logs. You should see:
```
Mapped "{[/api/invoices/{id}/download-invoice],methods=[GET]}"
Mapped "{[/api/invoices/{id}/print-invoice],methods=[GET]}"
Mapped "{[/api/invoices/{id}/download-basic-invoice],methods=[GET]}"
Mapped "{[/api/invoices/{id}/print-basic-invoice],methods=[GET]}"
```

### Step 4: Test the Endpoints
After restart, try clicking the buttons again:
- ✅ **Download Final Bill** → Should download PDF
- ✅ **Print Final Bill** → Should open PDF in new window
- ✅ **Download Basic Bill** → Should download PDF
- ✅ **Print Basic Bill** → Should open PDF in new window

## Why This Happens
Spring Boot registers all endpoints when the application **starts**. If you add new endpoints while the app is running, they won't be available until you restart.

## Quick Check
If you're still getting 404 errors after restart:
1. Make sure the application started successfully (check for errors in logs)
2. Verify you're logged in as **ADMIN** (these endpoints require ADMIN role)
3. Check that the invoice ID exists (try with a different invoice ID)

