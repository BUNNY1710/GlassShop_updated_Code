import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, allowedRoles }) {
  const token = sessionStorage.getItem("token");
  const role = sessionStorage.getItem("role");

  if (!token) {
    return <Navigate to="/login" />;
  }

  // OWNER has full admin access — treat it as ADMIN for any admin-gated route.
  const effectiveRoles = allowedRoles && allowedRoles.includes("ROLE_ADMIN")
    ? [...allowedRoles, "ROLE_OWNER"]
    : allowedRoles;

  if (effectiveRoles && !effectiveRoles.includes(role)) {
    return <Navigate to="/access-denied" />;
  }

  return children;
}

export default ProtectedRoute;
