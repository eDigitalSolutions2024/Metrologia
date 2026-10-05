import { Navigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import ROUTES from "../../shared/constants/routes";

export default function GuestRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to={ROUTES.DASHBOARD} replace />;
  return children;
}
