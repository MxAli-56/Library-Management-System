import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const StaffRoute = ({ children }) => {
  const { user } = useAuth();
  const hasAdminPanel = user?.stamps?.includes("view_admin_panel") || false;

  if (!hasAdminPanel) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default StaffRoute;