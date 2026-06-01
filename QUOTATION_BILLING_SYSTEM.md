# Quotation & Billing System - Complete Implementation Guide

## Overview
A complete quotation-to-invoice workflow system with GST and Non-GST billing support for the Glass Shop Management Application.

## ✅ What Has Been Implemented

### 1. Database Schema (V4 Migration)
- **customers** - Customer master data
- **quotations** - Quotation headers with GST/Non-GST support
- **quotation_items** - Quotation line items
- **invoices** - Invoice headers
- **invoice_items** - Invoice line items
- **payments** - Payment records

### 2. Backend (Spring Boot)

#### Entities
- `Customer` - Customer master
- `Quotation` - Quotation with status management
- `QuotationItem` - Quotation line items
- `Invoice` - Invoice with payment tracking
- `InvoiceItem` - Invoice line items
- `Payment` - Payment records

#### Enums
- `BillingType` - GST, NON_GST
- `QuotationStatus` - DRAFT, SENT, CONFIRMED, REJECTED, EXPIRED
- `InvoiceType` - ADVANCE, FINAL
- `PaymentMode` - CASH, UPI, BANK, SPLIT
- `PaymentStatus` - PAID, PARTIAL, DUE

#### Services
- **CustomerService** - Customer CRUD operations
- **QuotationService** - Quotation creation, GST/Non-GST calculations, status management
- **InvoiceService** - Invoice conversion, payment processing

#### REST APIs

**Customer APIs:**
- `POST /api/customers` - Create customer
- `GET /api/customers` - Get all customers
- `GET /api/customers/{id}` - Get customer by ID
- `PUT /api/customers/{id}` - Update customer
- `GET /api/customers/search?query=...` - Search customers

**Quotation APIs:**
- `POST /api/quotations` - Create quotation
- `GET /api/quotations` - Get all quotations
- `GET /api/quotations/{id}` - Get quotation by ID
- `GET /api/quotations/status/{status}` - Get quotations by status
- `PUT /api/quotations/{id}/confirm` - Confirm/Reject quotation

**Invoice APIs:**
- `POST /api/invoices/from-quotation` - Convert quotation to invoice
- `GET /api/invoices` - Get all invoices
- `GET /api/invoices/{id}` - Get invoice by ID
- `GET /api/invoices/payment-status/{status}` - Get invoices by payment status
- `POST /api/invoices/{id}/payments` - Add payment to invoice

### 3. Frontend (React)

#### Components Created
- **CustomerManagement.js** - Customer CRUD interface
- **QuotationManagement.js** - Quotation creation with GST/Non-GST support
- **InvoiceManagement.js** - Invoice conversion and payment management

#### Features
- Dynamic form fields based on billing type (GST/Non-GST)
- Auto-calculation of area and subtotals
- Status badges and workflow management
- Payment tracking and management
- Responsive UI with modals

## 🔑 Key Features

### GST vs Non-GST Billing

**GST Billing:**
- Shows GST percentage field
- Calculates CGST + SGST (intra-state) or IGST (inter-state)
- Displays HSN codes
- Shows tax breakup in invoices

**Non-GST Billing:**
- Hides all GST fields
- GST amount = 0
- Grand total = subtotal
- Invoice labeled as "Bill / Cash Memo"

### Quotation Workflow
1. **DRAFT** - Initial creation
2. **SENT** - Shared with customer
3. **CONFIRMED** - Customer approved (locked)
4. **REJECTED** - Customer rejected
5. **EXPIRED** - Validity expired

### Invoice Conversion
- One-click conversion from confirmed quotations
- Auto-copies all data
- Generates unique invoice numbers
- Supports Advance and Final invoices

### Payment Management
- Multiple payment modes (Cash, UPI, Bank, Split)
- Tracks payment status (PAID, PARTIAL, DUE)
- Payment history per invoice
- Auto-updates invoice payment status

## 📋 Business Rules Implemented

1. **Billing Type Locking**
   - Billing type cannot be changed after quotation creation
   - Billing type locked after customer confirmation

2. **GST Validation**
   - GST percentage required for GST billing
   - GST fields nullable for Non-GST billing
   - Database constraints enforce this

3. **Quotation Status**
   - Cannot edit confirmed quotations
   - Must be confirmed before converting to invoice
   - Version tracking supported (V1, V2...)

4. **Payment Calculations**
   - Payment status auto-updated based on paid amount
   - Due amount = Grand Total - Paid Amount
   - Supports partial payments

5. **Auto Calculations**
   - Area = Height × Width
   - Item Subtotal = Area × Rate × Quantity
   - GST Amount = Subtotal × GST% / 100
   - Grand Total = Subtotal + GST Amount (for GST) or Subtotal (for Non-GST)

## 🚀 Setup Instructions

### 1. Database Migration
The migration file `V4__Create_quotation_billing_tables.sql` will run automatically on application startup via Flyway.

### 2. Backend Setup
1. Ensure `spring-boot-starter-validation` dependency is added (already done in pom.xml)
2. Start the Spring Boot application
3. Migration will create all tables automatically

### 3. Frontend Setup
1. Add routes to `App.js`:
```javascript
import CustomerManagement from "./pages/CustomerManagement";
import QuotationManagement from "./pages/QuotationManagement";
import InvoiceManagement from "./pages/InvoiceManagement";

// Add routes:
<Route path="/customers" element={<CustomerManagement />} />
<Route path="/quotations" element={<QuotationManagement />} />
<Route path="/invoices" element={<InvoiceManagement />} />
```

2. Add navigation links in your Navbar or Layout component

### 4. Security Configuration
All endpoints are protected with `@PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")` - ensure users have appropriate roles.

## 📝 Usage Guide

### Creating a Quotation

1. **Create Customer** (if not exists)
   - Navigate to Customer Management
   - Fill customer details (name, mobile, address, GSTIN if applicable)

2. **Create Quotation**
   - Navigate to Quotation Management
   - Click "Create Quotation"
   - Select customer
   - Choose billing type (GST or Non-GST)
   - If GST: Enter GST percentage and customer state
   - Add items with dimensions, rates, quantities
   - Add optional charges (installation, transport, discount)
   - Submit to create quotation

3. **Confirm Quotation**
   - Share quotation with customer (PDF/WhatsApp/Email - to be implemented)
   - Customer confirms or rejects
   - Update status via "Confirm" or "Reject" button

### Converting to Invoice

1. **Convert Quotation**
   - Navigate to Invoice Management
   - Click "Convert Quotation to Invoice"
   - Select a confirmed quotation
   - Choose invoice type (Advance or Final)
   - Set invoice date
   - Click "Convert to Invoice"

2. **Add Payments**
   - View invoice details
   - Click "Add Payment"
   - Enter payment details (mode, amount, date, reference)
   - Payment status auto-updates

## 🔮 Future Enhancements

1. **PDF Generation**
   - Quotation PDF with shop logo
   - GST Invoice PDF with tax breakup
   - Non-GST Invoice/Bill PDF
   - Print support (A4 and Thermal)

2. **WhatsApp/Email Integration**
   - Send quotation via WhatsApp
   - Email quotation PDF
   - Payment reminders

3. **Advanced Features**
   - Quotation versioning (V1, V2...)
   - Quotation templates
   - Recurring invoices
   - Payment reminders
   - Reports and analytics

4. **State Management**
   - Compare shop state with customer state for inter-state detection
   - Auto-calculate CGST/SGST vs IGST

## 🐛 Known Limitations

1. **Inter-state Detection**: Currently assumes intra-state (CGST+SGST). Need to add shop state field and compare with customer state.

2. **PDF Generation**: Not yet implemented. Can use libraries like:
   - iText (Java)
   - jsPDF (React)
   - react-pdf

3. **Quotation Sharing**: WhatsApp/Email integration pending.

4. **Versioning**: Quotation versioning logic needs enhancement for creating new versions.

## 📊 Database Schema Summary

```
customers (id, shop_id, name, mobile, email, address, gstin, state, city, pincode)
quotations (id, shop_id, customer_id, quotation_number, version, billing_type, status, ...)
quotation_items (id, quotation_id, glass_type, height, width, quantity, rate_per_sqft, area, subtotal, ...)
invoices (id, shop_id, customer_id, quotation_id, invoice_number, invoice_type, billing_type, payment_status, ...)
invoice_items (id, invoice_id, glass_type, height, width, quantity, rate_per_sqft, area, subtotal, ...)
payments (id, invoice_id, payment_mode, amount, payment_date, reference_number, ...)
```

## ✅ Testing Checklist

- [x] Database schema created
- [x] Entities and relationships
- [x] DTOs with validation
- [x] Service layer with business logic
- [x] REST API controllers
- [x] React components
- [x] GST/Non-GST calculations
- [x] Payment processing
- [ ] PDF generation
- [ ] Integration tests
- [ ] E2E tests

## 📞 Support

For issues or questions, refer to:
- Database setup: `DATABASE_SETUP.md`
- API documentation: Check controller classes
- Frontend: Check React component files

---

**Status**: ✅ Core functionality complete. PDF generation and advanced features pending.

