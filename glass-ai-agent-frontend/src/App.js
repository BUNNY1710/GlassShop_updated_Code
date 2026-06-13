import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./auth/ProtectedRoute";
import { hasAnyPermission, isAdmin } from "./utils/permissions";

import Dashboard from "./pages/Dashboard";
import StockManager from "./pages/StockManager";
import StockDashboard from "./pages/StockDashboard";
import AiAssistant from "./pages/AiAssistant";
import CreateStaff from "./pages/CreateStaff";
import AuditLog from "./pages/AuditLog";
import ManageStaff from "./pages/ManageStaff";
import StaffManagement from "./pages/StaffManagement";
import StandManagement from "./pages/StandManagement";
import Profile from "./pages/Profile";
import CustomerManagement from "./pages/CustomerManagement";
import QuotationManagement from "./pages/QuotationManagement";
import InvoiceManagement from "./pages/InvoiceManagement";
import StockTransfer from "./pages/StockTransfer";
import GlassPriceMaster from "./pages/GlassPriceMaster";
import OptimizationPage from "./pages/OptimizationPage";
import ArchitectManagement from "./pages/ArchitectManagement";
import AccessDenied from "./pages/AccessDenied";
import Login from "./auth/Login";
import Register from "./auth/Register";
import Layout from "./layout/Layout";

const RequireAdmin = ({ children }) => {
  // OWNER and ADMIN both have full admin access.
  return isAdmin()
    ? children
    : <Navigate to="/access-denied" />;
};

// Permission-based route guard. Admin always passes (implicit ALL permissions);
// staff must hold at least one of `anyOf`, else they hit Access Denied.
const RequirePermission = ({ anyOf, children }) => {
  const token = sessionStorage.getItem("token");
  if (!token) return <Navigate to="/login" />;
  return hasAnyPermission(anyOf) ? children : <Navigate to="/access-denied" />;
};


function App() {
  const isLoggedIn = sessionStorage.getItem("token");

  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* PROTECTED WITH NAVBAR */}
      <Route element={<Layout />}>
        <Route
          path="/dashboard"
          element={<ProtectedRoute><RequirePermission anyOf={["VIEW_DASHBOARD"]}><Dashboard /></RequirePermission></ProtectedRoute>}
        />

        <Route
          path="/manage-stock"
          element={<ProtectedRoute><RequirePermission anyOf={["VIEW_STOCK","ADD_STOCK","EDIT_STOCK","DELETE_STOCK"]}><StockManager /></RequirePermission></ProtectedRoute>}
        />

        <Route
          path="/view-stock"
          element={<ProtectedRoute><RequirePermission anyOf={["VIEW_STOCK"]}><StockDashboard /></RequirePermission></ProtectedRoute>}
        />

        <Route
          path="/staff"
          element={
            <ProtectedRoute allowedRoles={["ROLE_ADMIN", "ROLE_OWNER"]}>
              <ManageStaff />
            </ProtectedRoute>
          }
        />

        <Route
          path="/create-staff"
          element={<RequireAdmin><CreateStaff /></RequireAdmin>}
        />

        <Route
          path="/audit"
          element={<RequireAdmin><AuditLog /></RequireAdmin>}
        />

        <Route
          path="/ai"
          element={<RequireAdmin><AiAssistant /></RequireAdmin>}
        />

        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <RequirePermission anyOf={["VIEW_CUSTOMER"]}><CustomerManagement /></RequirePermission>
            </ProtectedRoute>
          }
        />

        <Route
          path="/quotations"
          element={
            <ProtectedRoute>
              <RequirePermission anyOf={["VIEW_QUOTATION"]}><QuotationManagement /></RequirePermission>
            </ProtectedRoute>
          }
        />

        <Route
          path="/invoices"
          element={
            <ProtectedRoute>
              <RequirePermission anyOf={["VIEW_INVOICE"]}><InvoiceManagement /></RequirePermission>
            </ProtectedRoute>
          }
        />

        <Route
          path="/stock-transfer"
          element={<ProtectedRoute><RequirePermission anyOf={["VIEW_TRANSFER","CREATE_TRANSFER"]}><StockTransfer /></RequirePermission></ProtectedRoute>}
        />

        <Route
          path="/glass-price-master"
          element={<RequireAdmin><GlassPriceMaster /></RequireAdmin>}
        />

        {/* Optimization — accessible to both ROLE_ADMIN and ROLE_STAFF */}
        <Route
          path="/optimization"
          element={<ProtectedRoute><RequirePermission anyOf={["VIEW_OPTIMIZATION","RUN_OPTIMIZATION","VIEW_PLANS"]}><OptimizationPage /></RequirePermission></ProtectedRoute>}
        />

        <Route
          path="/architects"
          element={<RequireAdmin><ArchitectManagement /></RequireAdmin>}
        />

        {/* Staff Management (admin-only unified page) */}
        <Route
          path="/staff-management"
          element={<RequireAdmin><StaffManagement /></RequireAdmin>}
        />

        {/* Stand Management (admin-only) */}
        <Route
          path="/stand-management"
          element={<RequireAdmin><StandManagement /></RequireAdmin>}
        />

        {/* Profile — accessible to all logged-in users */}
        <Route
          path="/profile"
          element={<ProtectedRoute><Profile /></ProtectedRoute>}
        />

        {/* 403 page — shown when a logged-in user lacks role permission */}
        <Route
          path="/access-denied"
          element={<ProtectedRoute><AccessDenied /></ProtectedRoute>}
        />
      </Route>

      {/* FALLBACK */}
      <Route
        path="*"
        element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} />}
      />
    </Routes>
  );
}

export default App;
