# 🔍 Troubleshooting Invoice PDF Download/Print Issues

## ✅ What Was Fixed

1. **Added Error Logging**: All invoice PDF endpoints now print stack traces to help identify issues
2. **Verified Code**: All endpoints are correctly defined and methods exist

## 🔴 Current Issue: Can't Download/Print Final Bill and Basic Bill

### Step 1: Check Backend Logs

When you click the download/print buttons, check your **Spring Boot console/terminal** for error messages. You should see stack traces if there are any exceptions.

**Look for:**
- `java.lang.RuntimeException: Invoice not found`
- `java.lang.RuntimeException: User not authenticated`
- `java.lang.RuntimeException: Shop not found`
- `java.io.IOException: ...`
- Any other exception stack traces

### Step 2: Verify Endpoints Are Registered

When Spring Boot starts, look for these lines in the startup logs:

```
Mapped "{[/api/invoices/{id}/download-invoice],methods=[GET]}"
Mapped "{[/api/invoices/{id}/print-invoice],methods=[GET]}"
Mapped "{[/api/invoices/{id}/download-basic-invoice],methods=[GET]}"
Mapped "{[/api/invoices/{id}/print-basic-invoice],methods=[GET]}"
```

**If you DON'T see these lines**, the endpoints aren't registered. Try:
1. **Clean build**: `mvn clean install`
2. **Restart** the application
3. **Check for compilation errors** in the logs

### Step 3: Test with Browser Developer Tools

1. Open browser **Developer Tools** (F12)
2. Go to **Network** tab
3. Click a download/print button
4. Look at the request:
   - **URL**: Should be `http://localhost:8080/api/invoices/{id}/download-invoice`
   - **Status Code**: 
     - `200` = Success (but might still fail if PDF generation throws exception)
     - `404` = Endpoint not found (not registered)
     - `403` = Authorization issue (check if you're logged in as ADMIN)
     - `500` = Server error (check backend logs for exception)
   - **Response**: If status is 200, check if response body contains PDF data

### Step 4: Common Issues and Solutions

#### Issue 1: 404 Not Found
**Cause**: Endpoints not registered
**Solution**: 
- Ensure you did a **clean build** (`mvn clean install`)
- **Restart** Spring Boot application
- Check startup logs for endpoint registration

#### Issue 2: 403 Forbidden
**Cause**: Not logged in or not ADMIN role
**Solution**:
- Make sure you're **logged in**
- Verify your user has **ROLE_ADMIN**
- Check browser console for authentication errors

#### Issue 3: 500 Internal Server Error
**Cause**: Exception during PDF generation
**Check backend logs for:**
- `Invoice not found` → Invoice ID doesn't exist
- `User not authenticated` → Authentication issue
- `Shop not found` → User's shop is missing
- `IOException` → PDF generation error

#### Issue 4: 200 OK but No PDF Downloads
**Cause**: Exception caught but not logged, or response handling issue
**Solution**:
- Check backend logs for exceptions (now with stack traces)
- Check browser console for JavaScript errors
- Verify the response is actually a PDF blob

### Step 5: Manual Test with curl (if possible)

```bash
# Replace {token} with your JWT token and {id} with invoice ID
curl -H "Authorization: Bearer {token}" \
     -H "Content-Type: application/json" \
     http://localhost:8080/api/invoices/{id}/download-invoice \
     --output test-invoice.pdf
```

If this works, the issue is in the frontend. If it doesn't, check the error message.

### Step 6: Check Invoice Data

The PDF generation requires:
- Invoice exists in database
- Invoice has items
- User is authenticated
- User has a shop associated
- Shop details are complete

**Verify in database:**
```sql
SELECT * FROM invoices WHERE id = {your_invoice_id};
SELECT * FROM invoice_items WHERE invoice_id = {your_invoice_id};
```

### Step 7: Verify PDF Service Methods

The methods `generateInvoicePdf` and `generateBasicInvoicePdf` are in:
- `GlassShop/src/main/java/com/glassshop/ai/service/PdfService.java`
- Lines: 1052 and 1391

**If these methods don't exist or have errors**, that's the problem.

## 📝 Next Steps

1. **Check backend logs** when clicking download/print buttons
2. **Share the error messages** you see in the logs
3. **Check browser console** for any frontend errors
4. **Verify endpoint registration** in startup logs

The error logging I added will help identify the exact issue. Once you see the error in the logs, we can fix it!

