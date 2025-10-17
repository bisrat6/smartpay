import { Navigate } from 'react-router-dom';
import { isAuthenticated, getCurrentUser } from '@/lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'employer' | 'employee';
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  if (!isAuthenticated()) {
    return <Navigate to="/auth/login" replace />;
  }

  if (requiredRole) {
    const user = getCurrentUser();
    if (user?.role !== requiredRole) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
