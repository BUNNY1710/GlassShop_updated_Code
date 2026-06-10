// Frontend permission catalogue — mirrors backend config/permissions.js.
// Used to render the staff permission UI and to gate menus / routes / buttons.

export const PERMISSION_GROUPS = [
  { module: "Dashboard", permissions: [
    { key: "VIEW_DASHBOARD", label: "View Dashboard" },
  ]},
  { module: "Customer Management", permissions: [
    { key: "VIEW_CUSTOMER",   label: "View Customers" },
    { key: "ADD_CUSTOMER",    label: "Add Customer" },
    { key: "EDIT_CUSTOMER",   label: "Edit Customer" },
    { key: "DELETE_CUSTOMER", label: "Delete Customer" },
  ]},
  { module: "Quotation Management", permissions: [
    { key: "VIEW_QUOTATION",   label: "View Quotations" },
    { key: "CREATE_QUOTATION", label: "Create Quotation" },
    { key: "EDIT_QUOTATION",   label: "Edit Quotation" },
    { key: "DELETE_QUOTATION", label: "Delete Quotation" },
  ]},
  { module: "Orders", permissions: [
    { key: "VIEW_ORDERS",   label: "View Orders" },
    { key: "CREATE_ORDERS", label: "Create Orders" },
    { key: "EDIT_ORDERS",   label: "Edit Orders" },
    { key: "DELETE_ORDERS", label: "Delete Orders" },
  ]},
  { module: "Manage Stock", permissions: [
    { key: "VIEW_STOCK",   label: "View Stock" },
    { key: "ADD_STOCK",    label: "Add Stock" },
    { key: "EDIT_STOCK",   label: "Edit Stock" },
    { key: "DELETE_STOCK", label: "Delete Stock" },
  ]},
  { module: "Optimization", permissions: [
    { key: "VIEW_OPTIMIZATION", label: "View Optimization" },
    { key: "RUN_OPTIMIZATION",  label: "Run Optimization" },
    { key: "VIEW_PLANS",        label: "View Plans" },
    { key: "MANAGE_REMNANTS",   label: "Manage Remnants" },
  ]},
  { module: "Invoices", permissions: [
    { key: "VIEW_INVOICE",   label: "View Invoices" },
    { key: "CREATE_INVOICE", label: "Create Invoices" },
    { key: "EDIT_INVOICE",   label: "Edit Invoices" },
    { key: "DELETE_INVOICE", label: "Delete Invoices" },
  ]},
  { module: "Transfers", permissions: [
    { key: "VIEW_TRANSFER",    label: "View Transfers" },
    { key: "CREATE_TRANSFER",  label: "Create Transfers" },
    { key: "APPROVE_TRANSFER", label: "Approve Transfers" },
  ]},
  { module: "Reports", permissions: [
    { key: "VIEW_REPORTS",   label: "View Reports" },
    { key: "EXPORT_REPORTS", label: "Export Reports" },
  ]},
  { module: "Staff Management", permissions: [
    { key: "VIEW_STAFF",   label: "View Staff" },
    { key: "CREATE_STAFF", label: "Create Staff" },
    { key: "EDIT_STAFF",   label: "Edit Staff" },
    { key: "DELETE_STAFF", label: "Delete Staff" },
  ]},
];

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.key));

// True for admins (implicit ALL permissions).
export function isAdmin() {
  return sessionStorage.getItem("role") === "ROLE_ADMIN";
}

// The current user's granted permission keys. Admin => everything.
export function getPermissions() {
  if (isAdmin()) return ALL_PERMISSIONS;
  try {
    return JSON.parse(sessionStorage.getItem("permissions") || "[]");
  } catch {
    return [];
  }
}

export function hasPermission(key) {
  if (isAdmin()) return true;
  return getPermissions().includes(key);
}

export function hasAnyPermission(keys = []) {
  if (isAdmin()) return true;
  const mine = getPermissions();
  return keys.some(k => mine.includes(k));
}

// Persist permissions returned by /login. Call on successful login.
export function storePermissions(permissions) {
  sessionStorage.setItem("permissions", JSON.stringify(Array.isArray(permissions) ? permissions : []));
}
