# Fix for Site Class Not Found Error

## Problem
```
Unable to load class [com.glassshop.ai.entity.Site]
ClassNotFoundException: com.glassshop.ai.entity.Site
```

## Root Cause
The application is trying to load the `Site` entity class but can't find it. This usually happens when:
1. The application is running from an old/stale build
2. The target directory is out of sync
3. IDE hasn't refreshed the project

## Solution

### ✅ Step 1: Clean Build (Already Done)
The project has been successfully rebuilt:
```bash
mvn clean package -DskipTests
```
**Status**: ✅ BUILD SUCCESS - All 90 source files compiled

### ✅ Step 2: Verify Site Class Exists
The `Site.class` file exists in:
```
target/classes/com/glassshop/ai/entity/Site.class
```
**Status**: ✅ File exists and is compiled

### 🔧 Step 3: Restart Application

**If running via IDE (IntelliJ/Eclipse):**
1. **Stop** the running application completely
2. **Invalidate Caches / Reload Project**:
   - IntelliJ: File → Invalidate Caches → Invalidate and Restart
   - Eclipse: Right-click project → Refresh
3. **Rebuild** the project
4. **Start** the application again

**If running via Maven:**
```bash
cd GlassShop
# Stop any running instance (Ctrl+C)
mvn clean spring-boot:run
```

**If running via JAR:**
```bash
cd GlassShop
# Stop any running JAR process
mvn clean package -DskipTests
java -jar target/GlassShop-0.0.1-SNAPSHOT.jar
```

**If running via systemd/service:**
```bash
sudo systemctl stop glassshop-backend
cd GlassShop
mvn clean package -DskipTests
sudo systemctl start glassshop-backend
```

### 🔍 Step 4: Verify All Entities Are Compiled

Check that all entity classes are compiled:
```bash
# Windows
dir target\classes\com\glassshop\ai\entity\*.class

# Linux/Mac
ls -la target/classes/com/glassshop/ai/entity/*.class
```

You should see:
- Customer.class ✅
- Quotation.class ✅
- QuotationItem.class ✅
- Invoice.class ✅
- InvoiceItem.class ✅
- Payment.class ✅
- Site.class ✅
- Shop.class ✅
- User.class ✅
- ... (all other entities)

## Common Issues & Solutions

### Issue 1: IDE Not Refreshed
**Solution**: Refresh/Reload the project in your IDE

### Issue 2: Multiple Instances Running
**Solution**: 
```bash
# Check for running Java processes
jps -l | grep GlassShop
# Kill if needed
kill <PID>
```

### Issue 3: Old JAR Running
**Solution**: Make sure you're running the newly built JAR

### Issue 4: Classpath Issues
**Solution**: 
- Clean the target directory: `mvn clean`
- Rebuild: `mvn package`
- Restart application

## Verification

After restarting, check the logs for:
```
✅ Started GlassShopApplication
✅ No ClassNotFoundException errors
✅ Hibernate initialized successfully
```

## Status

- ✅ Project compiles successfully (90 source files)
- ✅ Site.class exists in target directory
- ✅ All new entities (Customer, Quotation, Invoice, etc.) compiled
- ⏳ **Action Required**: Restart the application

## Next Steps

1. **Stop** any running application instance
2. **Restart** the application (using one of the methods above)
3. **Check** the startup logs for any errors
4. **Test** the API endpoints

The error should be resolved after a clean restart!

