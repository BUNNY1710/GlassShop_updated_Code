// Central permission catalogue. Grouped for the staff permission UI; the flat
// list is the source of truth for validation. Admin implicitly has ALL of these.
const PERMISSION_GROUPS = [
  { module: 'Dashboard', permissions: [
    ['VIEW_DASHBOARD', 'View Dashboard'],
  ]},
  { module: 'Customer Management', permissions: [
    ['VIEW_CUSTOMER',   'View Customers'],
    ['ADD_CUSTOMER',    'Add Customer'],
    ['EDIT_CUSTOMER',   'Edit Customer'],
    ['DELETE_CUSTOMER', 'Delete Customer'],
  ]},
  { module: 'Quotation Management', permissions: [
    ['VIEW_QUOTATION',   'View Quotations'],
    ['CREATE_QUOTATION', 'Create Quotation'],
    ['EDIT_QUOTATION',   'Edit Quotation'],
    ['DELETE_QUOTATION', 'Delete Quotation'],
  ]},
  { module: 'Orders', permissions: [
    ['VIEW_ORDERS',   'View Orders'],
    ['CREATE_ORDERS', 'Create Orders'],
    ['EDIT_ORDERS',   'Edit Orders'],
    ['DELETE_ORDERS', 'Delete Orders'],
  ]},
  { module: 'Manage Stock', permissions: [
    ['VIEW_STOCK',   'View Stock'],
    ['ADD_STOCK',    'Add Stock'],
    ['EDIT_STOCK',   'Edit Stock'],
    ['DELETE_STOCK', 'Delete Stock'],
  ]},
  { module: 'Glass Type Management', permissions: [
    ['VIEW_GLASS_TYPE',   'View Glass Types'],
    ['EDIT_GLASS_TYPE',   'Add / Edit Glass Types'],
    ['DELETE_GLASS_TYPE', 'Delete Glass Types'],
  ]},
  { module: 'Optimization', permissions: [
    ['VIEW_OPTIMIZATION', 'View Optimization'],
    ['RUN_OPTIMIZATION',  'Run Optimization'],
    ['VIEW_PLANS',        'View Plans'],
    ['MANAGE_REMNANTS',   'Manage Remnants'],
  ]},
  { module: 'Invoices', permissions: [
    ['VIEW_INVOICE',   'View Invoices'],
    ['CREATE_INVOICE', 'Create Invoices'],
    ['EDIT_INVOICE',   'Edit Invoices'],
    ['DELETE_INVOICE', 'Delete Invoices'],
  ]},
  { module: 'Transfers', permissions: [
    ['VIEW_TRANSFER',    'View Transfers'],
    ['CREATE_TRANSFER',  'Create Transfers'],
    ['APPROVE_TRANSFER', 'Approve Transfers'],
  ]},
  { module: 'Reports', permissions: [
    ['VIEW_REPORTS',   'View Reports'],
    ['EXPORT_REPORTS', 'Export Reports'],
  ]},
  { module: 'Financial', permissions: [
    ['VIEW_PURCHASE_PRICE',    'View Purchase / Cost Price'],
    ['VIEW_PROFIT',            'View Profit Amount'],
    ['VIEW_MARGIN',            'View Margin %'],
    ['VIEW_FINANCIAL_REPORTS', 'View Financial Reports'],
    ['VIEW_INVENTORY_COST',    'View Inventory Cost / Valuation'],
  ]},
  { module: 'Staff Management', permissions: [
    ['VIEW_STAFF',   'View Staff'],
    ['CREATE_STAFF', 'Create Staff'],
    ['EDIT_STAFF',   'Edit Staff'],
    ['DELETE_STAFF', 'Delete Staff'],
  ]},
];

const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p[0]));
const PERMISSION_SET  = new Set(ALL_PERMISSIONS);

const isValidPermission = (key) => PERMISSION_SET.has(key);

module.exports = { PERMISSION_GROUPS, ALL_PERMISSIONS, isValidPermission };
