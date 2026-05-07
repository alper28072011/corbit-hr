import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { Role } from "../../types";

interface ProtectedRouteProps {
  allowedRoles?: Role[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { currentUser } = useStore();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
