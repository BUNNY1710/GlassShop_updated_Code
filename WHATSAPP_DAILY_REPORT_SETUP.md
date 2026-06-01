# WhatsApp Daily Report Feature Setup Guide

## Overview
This feature automatically sends daily sales reports to shop admins via WhatsApp at 11:00 PM every day. The report includes:
- Total items sold
- Stock details (glass type, dimensions, quantity, stand number)
- Earnings calculation based on glass type and area
- Summary of daily sales

## What Was Implemented

### 1. Database Changes
- Added `whatsappNumber` field to `User` entity (stores admin's WhatsApp number)
- Added `whatsappNumber` field to `Shop` entity (backup storage)
- Added `price` field to `AuditLog` entity (optional, for tracking actual sale prices)

### 2. Backend Changes
- **WhatsAppService**: Service to send WhatsApp messages via API
- **DailyReportService**: Generates formatted daily sales reports
- **DailyReportScheduler**: Scheduled task that runs daily at 11:00 PM
- Updated registration endpoint to capture WhatsApp number
- Updated DTOs to include WhatsApp number field

### 3. Frontend Changes
- Updated registration form to include WhatsApp number input field

## Configuration Steps

### Step 1: Choose a WhatsApp API Provider

You have several options:

#### Option A: Twilio WhatsApp API (Recommended for Production)
1. Sign up at [Twilio](https://www.twilio.com/)
2. Get your Account SID and Auth Token
3. Configure in `application.properties`:
```properties
whatsapp.api.enabled=true
whatsapp.api.url=https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json
whatsapp.api.key=YOUR_AUTH_TOKEN
```

#### Option B: WhatsApp Business API
If you have access to WhatsApp Business API, configure:
```properties
whatsapp.api.enabled=true
whatsapp.api.url=https://api.whatsapp.com/v1/messages
whatsapp.api.key=YOUR_API_KEY
```

#### Option C: Other Providers (TextLocal, MessageBird, etc.)
Configure according to your provider's API documentation:
```properties
whatsapp.api.enabled=true
whatsapp.api.url=YOUR_PROVIDER_API_URL
whatsapp.api.key=YOUR_API_KEY
```

### Step 2: Update WhatsAppService for Your Provider

If your provider uses a different API format, update the `buildRequestBody()` method in `WhatsAppService.java` to match your provider's requirements.

For example, for Twilio, you might need:
```java
private String buildRequestBody(String phoneNumber, String message) {
    return String.format(
        "{\"To\":\"whatsapp:+%s\",\"From\":\"whatsapp:+14155238886\",\"Body\":\"%s\"}",
        phoneNumber,
        message.replace("\"", "\\\"").replace("\n", "\\n")
    );
}
```

### Step 3: Customize Pricing (Optional)

The default pricing is calculated in `DailyReportService.calculatePrice()`:
- 5MM Glass: ₹500 per square meter
- 8MM Glass: ₹800 per square meter
- 10MM Glass: ₹1000 per square meter
- Default: ₹400 per square meter

To customize pricing, edit the `calculatePrice()` method in `DailyReportService.java`.

### Step 4: Enable the Feature

In `application.properties`, set:
```properties
whatsapp.api.enabled=true
```

If you want to test without actual WhatsApp integration, keep it disabled and check console logs:
```properties
whatsapp.api.enabled=false
```

## Testing

### Test the Daily Report Manually

You can test the report generation by temporarily modifying the scheduler. In `DailyReportScheduler.java`, uncomment the test method:

```java
@Scheduled(cron = "0 */5 * * * ?")  // Runs every 5 minutes
public void testDailyReports() {
    System.out.println("🧪 Testing daily report generation...");
    dailyReportService.generateAndSendReportsForAllShops();
}
```

And comment out the 11 PM schedule temporarily.

### Test with Specific Shop

You can also call the service directly:
```java
@Autowired
private DailyReportService dailyReportService;

// In a controller or test method
dailyReportService.generateAndSendDailyReport(shopId);
```

## Phone Number Format

The system accepts phone numbers in various formats:
- `+919876543210` (with country code and +)
- `919876543210` (with country code, no +)
- `9876543210` (10 digits, assumes India - adds 91)

The system will automatically format the number for the WhatsApp API.

## Report Format

The daily report will look like this:

```
📊 *Daily Sales Report*
━━━━━━━━━━━━━━━━━━━━
🏬 Shop: ABC Glass Shop
📅 Date: 15 Dec 2024
━━━━━━━━━━━━━━━━━━━━

📦 *Stock Sold:*

• *5MM*
  - Qty: 2 | Size: 2134 × 914 mm | Stand: 5
    Price: ₹450.50 × 2 = ₹901.00
  - Qty: 1 | Size: 1829 × 914 mm | Stand: 3
    Price: ₹350.25

• *8MM*
  - Qty: 1 | Size: 2134 × 914 mm | Stand: 7
    Price: ₹750.00

━━━━━━━━━━━━━━━━━━━━
📊 *Summary*
Total Items Sold: 4
Total Earnings: ₹2001.25

━━━━━━━━━━━━━━━━━━━━
Generated at: 11:00 PM
```

## Troubleshooting

### Reports Not Sending
1. Check if `whatsapp.api.enabled=true` in `application.properties`
2. Verify WhatsApp API URL and key are correct
3. Check console logs for error messages
4. Verify phone numbers are in correct format

### No Sales Data
- Reports will show "No sales today" if there were no REMOVE actions (sales) recorded

### Pricing Issues
- Update the `calculatePrice()` method in `DailyReportService` to match your pricing structure
- Or add a price field when removing stock to track actual sale prices

## Future Enhancements

Consider adding:
1. Price input field when removing stock (to track actual sale prices)
2. Weekly/monthly report options
3. Custom report templates
4. Multiple report recipients
5. Report scheduling options (different times for different shops)

## Notes

- The scheduler runs at 11:00 PM server time daily
- Reports are sent only for shops with valid WhatsApp numbers
- The system uses REMOVE actions from AuditLog as sales transactions
- Pricing is calculated automatically if not provided during stock removal
- Area calculations support mm, inch, and feet units







