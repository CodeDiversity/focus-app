import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/model/AuthContext';

export function PublicRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // An authenticated student lands on Today (EP16A, D16-2).
  if (isAuthenticated) {
    return <Navigate to="/today" replace />;
  }

  return <Outlet />;
}
