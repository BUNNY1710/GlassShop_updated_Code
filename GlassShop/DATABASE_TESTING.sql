-- ============================================
-- DATABASE TESTING SCRIPT
-- Glass Shop Application - Billing Module
-- ============================================
-- This script tests database schema, constraints, indexes, and data integrity
-- Run this script against your database to verify everything is working correctly

-- ============================================
-- 1. TABLE EXISTENCE VERIFICATION
-- ============================================

SELECT 'Testing Table Existence...' AS test_section;

-- Check if all required tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('customers', 'quotations', 'quotation_items', 'invoices', 'invoice_items', 'payments', 'stock', 'shop')
        THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END AS status
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN ('customers', 'quotations', 'quotation_items', 'invoices', 'invoice_items', 'payments', 'stock', 'shop')
ORDER BY table_name;

-- ============================================
-- 2. COLUMN VERIFICATION
-- ============================================

SELECT 'Testing Column Structure...' AS test_section;

-- Verify customers table columns
SELECT 
    'customers' AS table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'customers'
ORDER BY ordinal_position;

-- Verify quotations table columns (including new fields)
SELECT 
    'quotations' AS table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'quotations'
    AND column_name IN ('transportation_required', 'billing_type', 'status', 'gst_percentage', 'gst_amount')
ORDER BY ordinal_position;

-- Verify quotation_items table columns (including new fields)
SELECT 
    'quotation_items' AS table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'quotation_items'
    AND column_name IN ('height_unit', 'width_unit', 'design')
ORDER BY ordinal_position;

-- Verify stock table columns (HSN field)
SELECT 
    'stock' AS table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'stock'
    AND column_name = 'hsn_no';

-- ============================================
-- 3. FOREIGN KEY CONSTRAINTS VERIFICATION
-- ============================================

SELECT 'Testing Foreign Key Constraints...' AS test_section;

-- Check foreign keys
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('customers', 'quotations', 'quotation_items', 'invoices', 'invoice_items', 'payments')
ORDER BY tc.table_name, kcu.column_name;

-- Expected Foreign Keys:
-- customers.shop_id -> shop.id (ON DELETE CASCADE)
-- quotations.shop_id -> shop.id (ON DELETE CASCADE)
-- quotations.customer_id -> customers.id (ON DELETE RESTRICT)
-- quotation_items.quotation_id -> quotations.id (ON DELETE CASCADE)
-- invoices.shop_id -> shop.id (ON DELETE CASCADE)
-- invoices.customer_id -> customers.id (ON DELETE RESTRICT)
-- invoices.quotation_id -> quotations.id (ON DELETE SET NULL)
-- invoice_items.invoice_id -> invoices.id (ON DELETE CASCADE)
-- payments.invoice_id -> invoices.id (ON DELETE CASCADE)

-- ============================================
-- 4. CHECK CONSTRAINTS VERIFICATION
-- ============================================

SELECT 'Testing Check Constraints...' AS test_section;

-- Check constraints on quotations table
SELECT
    tc.table_name,
    tc.constraint_name,
    cc.check_clause
FROM information_schema.table_constraints AS tc
JOIN information_schema.check_constraints AS cc
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
    AND tc.table_name IN ('quotations', 'invoices', 'quotation_items', 'invoice_items', 'payments')
ORDER BY tc.table_name, tc.constraint_name;

-- Expected Check Constraints:
-- quotations.billing_type IN ('GST', 'NON_GST')
-- quotations.status IN ('DRAFT', 'SENT', 'CONFIRMED', 'REJECTED', 'EXPIRED')
-- quotations: GST fields validation
-- invoices.invoice_type IN ('ADVANCE', 'FINAL')
-- invoices.billing_type IN ('GST', 'NON_GST')
-- invoices.payment_status IN ('PAID', 'PARTIAL', 'DUE')
-- invoices: GST fields validation
-- invoices: Payment validation (paid_amount + due_amount = grand_total)
-- quotation_items: Positive values (height > 0, width > 0, quantity > 0, rate_per_sqft >= 0)
-- invoice_items: Positive values
-- payments.payment_mode IN ('CASH', 'UPI', 'BANK', 'SPLIT')
-- payments: amount > 0

-- ============================================
-- 5. INDEXES VERIFICATION
-- ============================================

SELECT 'Testing Indexes...' AS test_section;

-- Check indexes on customers table
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('customers', 'quotations', 'quotation_items', 'invoices', 'invoice_items', 'payments', 'stock')
ORDER BY tablename, indexname;

-- Expected Indexes:
-- customers: idx_customers_shop_id, idx_customers_mobile, idx_customers_name, idx_customers_created_at
-- quotations: idx_quotations_shop_id, idx_quotations_customer_id, idx_quotations_quotation_number, 
--             idx_quotations_status, idx_quotations_billing_type, idx_quotations_quotation_date, 
--             idx_quotations_created_at, idx_quotations_shop_status
-- quotation_items: idx_quotation_items_quotation_id, idx_quotation_items_item_order
-- invoices: idx_invoices_shop_id, idx_invoices_customer_id, idx_invoices_quotation_id,
--           idx_invoices_invoice_number, idx_invoices_invoice_type, idx_invoices_billing_type,
--           idx_invoices_payment_status, idx_invoices_invoice_date, idx_invoices_created_at,
--           idx_invoices_shop_status
-- invoice_items: idx_invoice_items_invoice_id, idx_invoice_items_item_order
-- payments: idx_payments_invoice_id, idx_payments_payment_date, idx_payments_payment_mode,
--           idx_payments_invoice_date
-- stock: idx_stock_hsn_no

-- ============================================
-- 6. UNIQUE CONSTRAINTS VERIFICATION
-- ============================================

SELECT 'Testing Unique Constraints...' AS test_section;

-- Check unique constraints
SELECT
    tc.table_name,
    kcu.column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE'
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('customers', 'quotations', 'invoices')
ORDER BY tc.table_name, kcu.column_name;

-- Expected Unique Constraints:
-- quotations.quotation_number (UNIQUE)
-- invoices.invoice_number (UNIQUE)

-- ============================================
-- 7. DATA INTEGRITY TESTS
-- ============================================

SELECT 'Testing Data Integrity...' AS test_section;

-- Test 1: Verify GST billing type has GST fields populated
SELECT 
    'GST Quotations Validation' AS test_name,
    COUNT(*) AS total_quotations,
    COUNT(CASE WHEN billing_type = 'GST' AND gst_percentage IS NULL THEN 1 END) AS invalid_gst_quotations,
    COUNT(CASE WHEN billing_type = 'NON_GST' AND gst_percentage IS NOT NULL THEN 1 END) AS invalid_non_gst_quotations
FROM quotations;

-- Test 2: Verify NON_GST billing type has gst_amount = 0
SELECT 
    'NON_GST GST Amount Validation' AS test_name,
    COUNT(*) AS total_non_gst,
    COUNT(CASE WHEN billing_type = 'NON_GST' AND gst_amount != 0 THEN 1 END) AS invalid_gst_amount
FROM quotations
WHERE billing_type = 'NON_GST';

-- Test 3: Verify invoice payment calculation
SELECT 
    'Invoice Payment Calculation' AS test_name,
    COUNT(*) AS total_invoices,
    COUNT(CASE WHEN ABS((paid_amount + due_amount) - grand_total) > 0.01 THEN 1 END) AS invalid_payment_calc
FROM invoices;

-- Test 4: Verify quotation items have positive values
SELECT 
    'Quotation Items Positive Values' AS test_name,
    COUNT(*) AS total_items,
    COUNT(CASE WHEN height <= 0 OR width <= 0 OR quantity <= 0 OR rate_per_sqft < 0 THEN 1 END) AS invalid_items
FROM quotation_items;

-- Test 5: Verify invoice items have positive values
SELECT 
    'Invoice Items Positive Values' AS test_name,
    COUNT(*) AS total_items,
    COUNT(CASE WHEN height <= 0 OR width <= 0 OR quantity <= 0 OR rate_per_sqft < 0 THEN 1 END) AS invalid_items
FROM invoice_items;

-- Test 6: Verify payments have positive amounts
SELECT 
    'Payment Amounts Positive' AS test_name,
    COUNT(*) AS total_payments,
    COUNT(CASE WHEN amount <= 0 THEN 1 END) AS invalid_payments
FROM payments;

-- Test 7: Verify quotation_items have default units
SELECT 
    'Quotation Items Unit Defaults' AS test_name,
    COUNT(*) AS total_items,
    COUNT(CASE WHEN height_unit IS NULL OR width_unit IS NULL THEN 1 END) AS missing_units,
    COUNT(CASE WHEN height_unit NOT IN ('MM', 'INCH', 'FEET') THEN 1 END) AS invalid_height_unit,
    COUNT(CASE WHEN width_unit NOT IN ('MM', 'INCH', 'FEET') THEN 1 END) AS invalid_width_unit
FROM quotation_items;

-- Test 8: Verify transportation_required field exists and has default
SELECT 
    'Transportation Required Field' AS test_name,
    COUNT(*) AS total_quotations,
    COUNT(CASE WHEN transportation_required IS NULL THEN 1 END) AS missing_transportation
FROM quotations;

-- ============================================
-- 8. RELATIONSHIP INTEGRITY TESTS
-- ============================================

SELECT 'Testing Relationship Integrity...' AS test_section;

-- Test 1: Verify all quotations have valid customer_id
SELECT 
    'Quotations Customer Reference' AS test_name,
    COUNT(*) AS total_quotations,
    COUNT(CASE WHEN q.customer_id NOT IN (SELECT id FROM customers) THEN 1 END) AS orphaned_quotations
FROM quotations q;

-- Test 2: Verify all quotation_items have valid quotation_id
SELECT 
    'Quotation Items Reference' AS test_name,
    COUNT(*) AS total_items,
    COUNT(CASE WHEN qi.quotation_id NOT IN (SELECT id FROM quotations) THEN 1 END) AS orphaned_items
FROM quotation_items qi;

-- Test 3: Verify all invoices have valid customer_id
SELECT 
    'Invoices Customer Reference' AS test_name,
    COUNT(*) AS total_invoices,
    COUNT(CASE WHEN i.customer_id NOT IN (SELECT id FROM customers) THEN 1 END) AS orphaned_invoices
FROM invoices i;

-- Test 4: Verify all invoice_items have valid invoice_id
SELECT 
    'Invoice Items Reference' AS test_name,
    COUNT(*) AS total_items,
    COUNT(CASE WHEN ii.invoice_id NOT IN (SELECT id FROM invoices) THEN 1 END) AS orphaned_items
FROM invoice_items ii;

-- Test 5: Verify all payments have valid invoice_id
SELECT 
    'Payments Invoice Reference' AS test_name,
    COUNT(*) AS total_payments,
    COUNT(CASE WHEN p.invoice_id NOT IN (SELECT id FROM invoices) THEN 1 END) AS orphaned_payments
FROM payments p;

-- Test 6: Verify invoices with quotation_id have valid quotation
SELECT 
    'Invoices Quotation Reference' AS test_name,
    COUNT(*) AS invoices_with_quotation,
    COUNT(CASE WHEN i.quotation_id IS NOT NULL AND i.quotation_id NOT IN (SELECT id FROM quotations) THEN 1 END) AS invalid_quotation_ref
FROM invoices i
WHERE i.quotation_id IS NOT NULL;

-- ============================================
-- 9. CASCADE BEHAVIOR TESTS (Manual Testing Required)
-- ============================================

SELECT 'Cascade Behavior Tests (Manual Testing Required)...' AS test_section;

-- These tests should be run manually to verify cascade behaviors:

-- Test 1: Delete shop should cascade delete customers, quotations, invoices
-- Expected: All related records should be deleted
-- DO NOT RUN IN PRODUCTION:
-- DELETE FROM shop WHERE id = <test_shop_id>;
-- Then verify: customers, quotations, invoices are deleted

-- Test 2: Delete customer should RESTRICT if quotations/invoices exist
-- Expected: Should fail with foreign key constraint error
-- DO NOT RUN IN PRODUCTION:
-- DELETE FROM customers WHERE id = <customer_with_quotations>;
-- Should fail with error

-- Test 3: Delete quotation should CASCADE delete quotation_items
-- Expected: quotation_items should be deleted
-- DO NOT RUN IN PRODUCTION:
-- DELETE FROM quotations WHERE id = <test_quotation_id>;
-- Then verify: quotation_items are deleted

-- Test 4: Delete invoice should CASCADE delete invoice_items and payments
-- Expected: invoice_items and payments should be deleted
-- DO NOT RUN IN PRODUCTION:
-- DELETE FROM invoices WHERE id = <test_invoice_id>;
-- Then verify: invoice_items and payments are deleted

-- Test 5: Delete quotation should SET NULL invoice.quotation_id
-- Expected: invoice.quotation_id should become NULL
-- DO NOT RUN IN PRODUCTION:
-- DELETE FROM quotations WHERE id = <quotation_with_invoice>;
-- Then verify: invoices.quotation_id is NULL

-- ============================================
-- 10. ENUM VALUES VERIFICATION
-- ============================================

SELECT 'Testing Enum Values...' AS test_section;

-- Check billing_type values
SELECT 
    'Billing Type Values' AS test_name,
    billing_type,
    COUNT(*) AS count
FROM quotations
GROUP BY billing_type
UNION ALL
SELECT 
    'Billing Type Values (Invoices)' AS test_name,
    billing_type,
    COUNT(*) AS count
FROM invoices
GROUP BY billing_type;

-- Check status values
SELECT 
    'Quotation Status Values' AS test_name,
    status,
    COUNT(*) AS count
FROM quotations
GROUP BY status;

-- Check invoice_type values
SELECT 
    'Invoice Type Values' AS test_name,
    invoice_type,
    COUNT(*) AS count
FROM invoices
GROUP BY invoice_type;

-- Check payment_status values
SELECT 
    'Payment Status Values' AS test_name,
    payment_status,
    COUNT(*) AS count
FROM invoices
GROUP BY payment_status;

-- Check payment_mode values
SELECT 
    'Payment Mode Values' AS test_name,
    payment_mode,
    COUNT(*) AS count
FROM payments
GROUP BY payment_mode;

-- ============================================
-- 11. SUMMARY REPORT
-- ============================================

SELECT '=== DATABASE TESTING SUMMARY ===' AS summary;

SELECT 
    'Total Customers' AS metric,
    COUNT(*) AS value
FROM customers
UNION ALL
SELECT 
    'Total Quotations' AS metric,
    COUNT(*) AS value
FROM quotations
UNION ALL
SELECT 
    'Total Quotation Items' AS metric,
    COUNT(*) AS value
FROM quotation_items
UNION ALL
SELECT 
    'Total Invoices' AS metric,
    COUNT(*) AS value
FROM invoices
UNION ALL
SELECT 
    'Total Invoice Items' AS metric,
    COUNT(*) AS value
FROM invoice_items
UNION ALL
SELECT 
    'Total Payments' AS metric,
    COUNT(*) AS value
FROM payments
UNION ALL
SELECT 
    'Quotations with GST' AS metric,
    COUNT(*) AS value
FROM quotations
WHERE billing_type = 'GST'
UNION ALL
SELECT 
    'Quotations with NON_GST' AS metric,
    COUNT(*) AS value
FROM quotations
WHERE billing_type = 'NON_GST'
UNION ALL
SELECT 
    'Confirmed Quotations' AS metric,
    COUNT(*) AS value
FROM quotations
WHERE status = 'CONFIRMED'
UNION ALL
SELECT 
    'Invoices with Payments' AS metric,
    COUNT(DISTINCT invoice_id) AS value
FROM payments;

-- ============================================
-- END OF TESTING SCRIPT
-- ============================================

