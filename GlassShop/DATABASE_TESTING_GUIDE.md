# Database Testing Guide

## Overview
This guide provides comprehensive database testing for the Glass Shop Application billing module, including quotations, invoices, customers, and payments.

## Prerequisites
- PostgreSQL database running
- Access to the database with appropriate permissions
- Database migrations (V4, V5, V6) have been applied

## Running the Tests

### Option 1: Using psql Command Line
```bash
psql -U your_username -d your_database_name -f DATABASE_TESTING.sql
```

### Option 2: Using Database GUI Tool
1. Open your database management tool (pgAdmin, DBeaver, etc.)
2. Connect to your database
3. Open and execute `DATABASE_TESTING.sql`

### Option 3: Using Spring Boot Application
The tests can be integrated into JUnit tests if needed.

## Test Categories

### 1. Table Existence Verification ✅
- Verifies all required tables exist:
  - `customers`
  - `quotations`
  - `quotation_items`
  - `invoices`
  - `invoice_items`
  - `payments`
  - `stock` (with HSN field)
  - `shop`

**Expected Result**: All tables should exist

### 2. Column Verification ✅
- Verifies new columns exist:
  - `quotations.transportation_required` (BOOLEAN)
  - `quotation_items.height_unit` (VARCHAR(10), default 'FEET')
  - `quotation_items.width_unit` (VARCHAR(10), default 'FEET')
  - `quotation_items.design` (VARCHAR(50))
  - `stock.hsn_no` (VARCHAR(20))

**Expected Result**: All columns should exist with correct data types

### 3. Foreign Key Constraints ✅
Verifies foreign key relationships:

| Table | Column | References | Delete Rule |
|-------|--------|------------|-------------|
| customers | shop_id | shop.id | CASCADE |
| quotations | shop_id | shop.id | CASCADE |
| quotations | customer_id | customers.id | RESTRICT |
| quotation_items | quotation_id | quotations.id | CASCADE |
| invoices | shop_id | shop.id | CASCADE |
| invoices | customer_id | customers.id | RESTRICT |
| invoices | quotation_id | quotations.id | SET NULL |
| invoice_items | invoice_id | invoices.id | CASCADE |
| payments | invoice_id | invoices.id | CASCADE |

**Expected Result**: All foreign keys should be present with correct delete rules

### 4. Check Constraints ✅
Verifies business rule constraints:

- **quotations**:
  - `billing_type IN ('GST', 'NON_GST')`
  - `status IN ('DRAFT', 'SENT', 'CONFIRMED', 'REJECTED', 'EXPIRED')`
  - GST fields validation (GST type must have gst_percentage, NON_GST must have gst_amount = 0)

- **invoices**:
  - `invoice_type IN ('ADVANCE', 'FINAL')`
  - `billing_type IN ('GST', 'NON_GST')`
  - `payment_status IN ('PAID', 'PARTIAL', 'DUE')`
  - Payment calculation: `paid_amount + due_amount = grand_total`

- **quotation_items / invoice_items**:
  - `height > 0 AND width > 0 AND quantity > 0 AND rate_per_sqft >= 0`

- **payments**:
  - `payment_mode IN ('CASH', 'UPI', 'BANK', 'SPLIT')`
  - `amount > 0`

**Expected Result**: All constraints should be present

### 5. Indexes Verification ✅
Verifies performance indexes exist:

- **customers**: shop_id, mobile, name, created_at
- **quotations**: shop_id, customer_id, quotation_number, status, billing_type, quotation_date, created_at, (shop_id, status)
- **quotation_items**: quotation_id, (quotation_id, item_order)
- **invoices**: shop_id, customer_id, quotation_id, invoice_number, invoice_type, billing_type, payment_status, invoice_date, created_at, (shop_id, payment_status)
- **invoice_items**: invoice_id, (invoice_id, item_order)
- **payments**: invoice_id, payment_date, payment_mode, (invoice_id, payment_date)
- **stock**: hsn_no

**Expected Result**: All indexes should exist

### 6. Unique Constraints ✅
- `quotations.quotation_number` (UNIQUE)
- `invoices.invoice_number` (UNIQUE)

**Expected Result**: Unique constraints should be present

### 7. Data Integrity Tests ✅
Tests actual data for violations:

1. **GST Quotations Validation**: GST type must have gst_percentage
2. **NON_GST Validation**: NON_GST must have gst_amount = 0
3. **Invoice Payment Calculation**: paid_amount + due_amount = grand_total
4. **Positive Values**: All items must have positive dimensions, quantities, rates
5. **Payment Amounts**: All payments must have amount > 0
6. **Unit Defaults**: quotation_items must have valid units (MM, INCH, FEET)
7. **Transportation Field**: transportation_required must have default value

**Expected Result**: All counts should be 0 (no violations)

### 8. Relationship Integrity Tests ✅
Verifies foreign key relationships are valid:

1. All quotations have valid customer_id
2. All quotation_items have valid quotation_id
3. All invoices have valid customer_id
4. All invoice_items have valid invoice_id
5. All payments have valid invoice_id
6. All invoices with quotation_id have valid quotation

**Expected Result**: All orphaned record counts should be 0

### 9. Cascade Behavior Tests ⚠️ (Manual Testing)
**IMPORTANT**: These tests modify data. Run only in test/development environment.

1. **Delete Shop**: Should cascade delete customers, quotations, invoices
2. **Delete Customer**: Should RESTRICT if quotations/invoices exist
3. **Delete Quotation**: Should CASCADE delete quotation_items
4. **Delete Invoice**: Should CASCADE delete invoice_items and payments
5. **Delete Quotation with Invoice**: Should SET NULL invoice.quotation_id

**How to Test**:
```sql
-- Test 1: Create test data
INSERT INTO shop (shop_name) VALUES ('Test Shop') RETURNING id;
-- Use returned id for subsequent tests

-- Test 2: Try to delete customer with quotations (should fail)
DELETE FROM customers WHERE id = <customer_with_quotations>;
-- Expected: Foreign key constraint violation

-- Test 3: Delete quotation (should delete items)
DELETE FROM quotations WHERE id = <test_quotation_id>;
SELECT COUNT(*) FROM quotation_items WHERE quotation_id = <test_quotation_id>;
-- Expected: 0

-- Clean up test data after testing
```

### 10. Enum Values Verification ✅
Verifies enum values are correct:

- **billing_type**: 'GST', 'NON_GST'
- **status**: 'DRAFT', 'SENT', 'CONFIRMED', 'REJECTED', 'EXPIRED'
- **invoice_type**: 'ADVANCE', 'FINAL'
- **payment_status**: 'PAID', 'PARTIAL', 'DUE'
- **payment_mode**: 'CASH', 'UPI', 'BANK', 'SPLIT'

**Expected Result**: Only valid enum values should exist

### 11. Summary Report ✅
Provides overall statistics:
- Total records in each table
- Distribution of billing types
- Confirmed quotations count
- Invoices with payments

## Interpreting Results

### ✅ All Tests Pass
If all tests show expected results:
- Database schema is correct
- Constraints are properly enforced
- Data integrity is maintained
- System is ready for use

### ❌ Test Failures
If any test fails:

1. **Missing Tables/Columns**: Run missing migrations
   ```bash
   # Check Flyway migration status
   # Run: mvn flyway:info
   ```

2. **Constraint Violations**: Review data and fix invalid records
   ```sql
   -- Example: Fix invalid GST data
   UPDATE quotations 
   SET gst_percentage = 18 
   WHERE billing_type = 'GST' AND gst_percentage IS NULL;
   ```

3. **Orphaned Records**: Clean up invalid foreign key references
   ```sql
   -- Example: Find orphaned quotations
   SELECT * FROM quotations 
   WHERE customer_id NOT IN (SELECT id FROM customers);
   ```

4. **Index Missing**: Create missing indexes manually if needed
   ```sql
   CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile);
   ```

## Common Issues and Solutions

### Issue 1: Missing HSN Field
**Symptom**: `stock.hsn_no` column not found
**Solution**: Run migration V6
```bash
mvn flyway:migrate
```

### Issue 2: Missing Unit Fields
**Symptom**: `quotation_items.height_unit` not found
**Solution**: Run migration V5
```bash
mvn flyway:migrate
```

### Issue 3: Invalid Payment Calculation
**Symptom**: `paid_amount + due_amount != grand_total`
**Solution**: Recalculate payment status
```sql
UPDATE invoices 
SET due_amount = grand_total - paid_amount,
    payment_status = CASE 
        WHEN paid_amount = 0 THEN 'DUE'
        WHEN paid_amount >= grand_total THEN 'PAID'
        ELSE 'PARTIAL'
    END;
```

### Issue 4: Orphaned Records
**Symptom**: Foreign key references point to non-existent records
**Solution**: Clean up or fix references
```sql
-- Example: Delete orphaned quotation items
DELETE FROM quotation_items 
WHERE quotation_id NOT IN (SELECT id FROM quotations);
```

## Best Practices

1. **Run tests regularly**: After each migration or major data change
2. **Test in development first**: Never run destructive tests in production
3. **Backup before testing**: Always backup database before running cascade tests
4. **Monitor performance**: Check index usage and query performance
5. **Document issues**: Keep track of any violations found and their fixes

## Next Steps

After successful testing:
1. ✅ Verify application functionality
2. ✅ Test API endpoints
3. ✅ Test frontend integration
4. ✅ Performance testing
5. ✅ User acceptance testing

---

**Last Updated**: After implementing billing module with all features
**Database Version**: PostgreSQL (as configured in application.properties)
**Migrations Applied**: V4, V5, V6

